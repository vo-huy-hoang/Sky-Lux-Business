# Sky-Lux CRM - Core Operational & Security Flows

This document details the load-bearing runtime journeys of Sky-Lux CRM where access control, tenant boundaries, data integrity, and background state side effects are exercised.

---

## Flow 1: Authentication, Fast-Path Session Verification & Invalidation

**Purpose**: High-throughput session validation with zero-latency revocation on credential/role changes.

- **Actors**: Any authenticated user (`SUPER_ADMIN`, `CEO_ADMIN`, `SALES`, `OPERATOR`, `ACCOUNTANT`).
- **Preconditions**: User exists in `users` table with `status = 'ACTIVE'`.
- **Success Outcome**: User authenticates, receives signed JWT, executes API operations with sub-millisecond guard validation, and is blocked instantly (<0ms) when revoked.

### Sequence & Step-by-Step Boundaries
```
[Browser Client]          [JwtAuthGuard]           [Redis Cache]         [PostgreSQL DB]
       │                         │                       │                     │
       │ 1. POST /api/auth/login ─────────────────────────────────────────────►│
       │    { email, password }  │                       │                     │ (Verify bcrypt hash)
       │                         │                       │                     │
       │◄── 2. Return Access Token & Set Redis Cache ────┴─────────────────────┤
       │       { accessToken, user }  Cache: `user:auth-meta:${id}` (TTL 300s) │
       │                         │                       │                     │
       │ 3. GET /api/dossiers    │                       │                     │
       │    Header: Bearer <JWT> │                       │                     │
       │────────────────────────►│                       │                     │
       │                         │ 4. GET user:auth-meta │                     │
       │                         │──────────────────────►│                     │
       │                         │◄──────────────────────│                     │
       │                         │    (Fast hit: <1ms)   │                     │
       │                         │                       │                     │
       │                         │ 5. Validate status == ACTIVE & authVersion matches
       │                         │    (If mismatched/locked -> 401 Unauthorized)
       │                         │                       │                     │
       │◄── 6. 200 OK (Data) ────┴───────────────────────┴─────────────────────┤
```

### Authorization Checks & Deny Conditions
- **Step 1**: Rate limited by [CustomThrottlerGuard](file:///d:/Sky-Lux-Business/backend/src/common/throttler/custom-throttler.guard.ts) (limit: 5 attempts/minute). Deny: `429 Too Many Requests`.
- **Step 4-5**: [JwtAuthGuard](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-auth.guard.ts#L48-L62):
  - If token signature invalid or expired: `401 Unauthorized` (`Invalid token`).
  - If `cached.status !== ACTIVE`: `401 Unauthorized` (`Tài khoản đã bị khóa hoặc ngừng hoạt động`).
  - If `payload.authVersion !== cached.authVersion`: `401 Unauthorized` (`Phiên đăng nhập đã hết hạn hoặc bị thu hồi`).
  - If `payload.organizationId !== cached.organizationId`: `401 Unauthorized`.

### Invalidation Side Effects
When a user's password changes, role assignments are modified, or the user is locked/removed:
1. `users.service.ts` or `roles.service.ts` increments `user.authVersion++` in PostgreSQL.
2. Immediately evicts `redis.del("user:auth-meta:${userId}")`.
3. Active requests with older tokens receive `401 Unauthorized` on their very next API call.

---

## Flow 2: Multi-Tenant Organization Provisioning & CEO Onboarding

**Purpose**: Atomic creation of a new business tenant and its root executive user without orphan records.

- **Actors**: `SUPER_ADMIN` only.
- **Preconditions**: Calling user has role `SUPER_ADMIN` and verified session.
- **Success Outcome**: New Organization, default system settings, 4 standard departments (`BOD`, `SALES`, `OPS`, `ACC`), system roles, and initial `CEO_ADMIN` account are created atomically within a single database transaction.

### Step-by-Step Sequence & Trust Boundaries
1. **Browser → API Gateway**: `POST /api/organization` with `CreateOrganizationDto`.
   - *Trust Boundary*: Browser → NestJS HTTP.
   - *Authz Check*: [OrganizationsController:43-53](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.controller.ts#L43-L53) checks `@Roles('SUPER_ADMIN')` AND explicit [assertSuperAdmin()](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.controller.ts#L95) to prevent `CEO_ADMIN` global-admin bypass.
   - *Deny Case*: `403 Forbidden` (`Chỉ SUPER_ADMIN được phép thực hiện thao tác này`).
2. **API Controller → OrganizationsService**: Executes [create()](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.service.ts#L101-L225) inside `this.dataSource.transaction(async (manager) => ...)`.
   - *Step 2a*: Validates organization `code` uniqueness. If exists -> `409 ConflictException`.
   - *Step 2b*: Inserts `Organization` record.
   - *Step 2c*: Bulk-inserts default `OrganizationSetting` entries (`default_currency`, `default_timezone`, `dossier_code_prefix`, `finance.default_vat_rate`).
   - *Step 2d*: Bulk-inserts 4 default `Department` entities (`BOD`, `SALES`, `OPS`, `ACC`).
   - *Step 2e*: Clones system roles (`SUPER_ADMIN`, `CEO_ADMIN`, `SALES`, `OPERATOR`, `ACCOUNTANT`) and maps global permissions in `role_permissions`.
   - *Step 2f* (Optional CEO creation): Hashes password with bcrypt (10 rounds) and inserts `User` with role `CEO_ADMIN`.
3. **Transaction Commit / Rollback**:
   - If any step throws an error, the entire database transaction rolls back, preventing partial tenant registration.
4. **Audit Logging**: Emits `AuditAction.CREATE` on `AuditEntityType.ORGANIZATION`.

---

## Flow 3: Dossier Lifecycle, Financial Estimate Lock & Approval State Machine

**Purpose**: Controls the commercial and operational workflow of tour dossiers, preventing unauthorized price alteration once approved.

- **Actors**: `SALES` (originator), `OPERATOR` (costing reviewer), `CEO_ADMIN` (commercial approver).
- **Preconditions**: Dossier exists in caller's organization.
- **Success Outcome**: Dossier progresses through rigid states: `DRAFT` → `SUBMITTED` → `IN_REVIEW` → `APPROVED` → `COMPLETED` → `LOCKED`.

### State Machine Transition Rules & Enforcements
```
 [DRAFT] ──► [SUBMITTED] ──► [IN_REVIEW] ──► [APPROVED] ──► [COMPLETED] ──► [LOCKED]
    ▲             │               │
    │             ▼               ▼
    └── [NEED_CHANGES] ◄──────────┘
```

| Step | Action | Endpoint | Enforced Permissions / Roles | State Precondition | State Postcondition & Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Create Dossier | `POST /api/dossiers` | `dossier.create` | None | Inserts `dossiers` with `status: DRAFT`, scopes to `user.organizationId`, sets `salesUserId = user.id`. |
| 2 | Add Estimates | `POST /api/dossiers/:id/estimates` | `estimate.create` | `Dossier.status IN (DRAFT, NEED_CHANGES)` | Inserts `estimates`, `estimate_revenue_lines`, `estimate_cost_lines`. Total revenue & cost auto-computed. |
| 3 | Submit Dossier | `POST /api/dossiers/:id/submit` | `dossier.submit` | `status == DRAFT \|\| NEED_CHANGES` | Updates `status: SUBMITTED`. Emits notification to Operations team via SSE. |
| 4 | Start Review | `POST /api/dossiers/:id/start-review` | `OPERATOR` or `dossier.approve` | `status == SUBMITTED` | Updates `status: IN_REVIEW`, assigns `operatorUserId`. |
| 5a | Request Changes | `POST /api/dossiers/:id/request-changes` | `OPERATOR` or `CEO_ADMIN` | `status == IN_REVIEW` | Updates `status: NEED_CHANGES`, records reason in `dossier_comments`, notifies `salesUserId`. |
| 5b | Approve Dossier | `POST /api/dossiers/:id/approve` | `dossier.approve` (`CEO_ADMIN`) | `status == IN_REVIEW` | Updates `status: APPROVED`. Freezes active `estimate.status: APPROVED` and marks older estimates `SUPERSEDED`. |
| 6 | Lock Dossier | `POST /api/dossiers/:id/lock` | `dossier.lock` (`CEO_ADMIN`) | `status == COMPLETED` | Updates `status: LOCKED`. Prevents any future revenue, cost, or document modifications. |

### Negative & Deny Cases
- An attempt by `SALES` to modify estimate lines while status is `IN_REVIEW` or `APPROVED` throws `400 BadRequestException` (`Không thể sửa dự toán khi hồ sơ đang duyệt hoặc đã duyệt`).
- An attempt to access a dossier belonging to another organization throws `404 NotFoundException` (never reveals tenant existence).

---

## Flow 4: Excel Budget Ingestion, Formula Injection Sanitization & Ingestion Pipeline

**Purpose**: High-volume ingestion of customer budget files without blocking HTTP requests or opening spreadsheet macro/formula vulnerabilities.

- **Actors**: `SALES`, `OPERATOR`, `CEO_ADMIN`.
- **Preconditions**: Uploaded file is valid `.xlsx` or `.xls` under 30MB limit.
- **Success Outcome**: File parsed asynchronously by BullMQ worker, sanitized for CSV/formula injection, staged in `import_rows`, validated for CRM duplicate conflicts, and confirmed into live production tables.

### Execution Path & Trust Boundaries
```
[Client]                [ImportsController]        [BullMQ Queue]       [ImportProcessor Worker]
   │                            │                        │                         │
   │ 1. POST /api/imports       │                        │                         │
   │    (multipart/form-data)   │                        │                         │
   │───────────────────────────►│                        │                         │
   │                            │ 2. Create ImportSession│                         │
   │                            │    Save file to disk   │                         │
   │                            │    Add job to queue ──►│                         │
   │◄── 3. 201 Created (Id) ────┴────────────────────────┤                         │
   │                                                     │ 4. Worker picks up job  │
   │                                                     │    job: 'parse-excel'   │
   │                                                     │────────────────────────►│
   │                                                     │                         │ 5. Read SheetJS workbook
   │                                                     │                         │ 6. Formula Sanitize:
   │                                                     │                         │    [=,+,-,@] -> prepend '
   │                                                     │                         │ 7. Bulk INSERT into
   │                                                     │                         │    import_rows & errors
   │                                                     │                         │ 8. Status: READY_FOR_REVIEW
   │ 9. GET /api/imports/:id/preview                     │                         │
   │────────────────────────────────────────────────────►│                         │
   │◄── 10. Review parsed rows & validation warnings ────┤                         │
   │                                                     │                         │
   │ 11. POST /api/imports/:id/confirm                   │                         │
   │────────────────────────────────────────────────────►│                         │
   │                                                     │ 12. Atomic commit:      │
   │                                                     │     Create Customers,   │
   │                                                     │     Dossiers, Estimates │
   │◄── 13. Import Completed ────────────────────────────┴─────────────────────────┘
```

### Critical Security Sanitizer
- [import.processor.ts:23-30](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L23-L30):
  ```ts
  function sanitizeCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (['=', '+', '-', '@'].some((prefix) => str.startsWith(prefix))) {
      return `'${str}`;
    }
    return str;
  }
  ```
  Prevents Excel Formula Injection (CSV Injection) attacks where an uploaded spreadsheet contains malicious executable expressions (e.g., `=cmd|' /C calc'!A0`).

---

## Flow 5: Real-time Communication, SSE Token Grant & Ephemeral Redis PubSub Stream

**Purpose**: Deliver live chat messages, typing signals, and system notifications without persistent full-duplex WebSocket socket memory leaks.

- **Actors**: All active platform users.
- **Preconditions**: Valid user session.
- **Success Outcome**: User connects via native `EventSource`, subscribes to tenant channels, receives messages in real time, and auto-cleans on disconnect.

### Step-by-Step Sequence & Trust Boundaries
1. **Client → Auth Controller**: `POST /api/auth/stream-token`.
   - *Authz*: Caller has valid Bearer token.
   - *Side Effect*: Signs JWT with payload `{ id, organizationId, authVersion, stream: true }` and short 120-second expiration.
2. **Client → SSE Endpoint**: Initiates HTTP GET `EventSource('/api/conversations/stream?token=' + streamToken)`.
   - *Guard Check*: [JwtQueryAuthGuard:43-54](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-query-auth.guard.ts#L43-L54):
     - If `payload.stream !== true`: Throws `401 Unauthorized` (`Stream token không hợp lệ`).
     - Checks `user:auth-meta:${id}` in Redis. If revoked or inactive: Throws `401 Unauthorized`.
3. **ChatService / NotificationsService**:
   - Subscribes client to Redis Pub/Sub channel `channel:org:${organizationId}:user:${userId}`.
   - Wraps incoming Redis messages in RxJS `Observable<MessageEvent>` with 15-second heartbeat ping comments (`: ping\n\n`) to keep proxy connections alive.
4. **Message Dispatch**:
   - When a user sends a message via `POST /api/conversations/:id/messages`:
     - Message written to PostgreSQL `messages` table.
     - [ChatPubSubService](file:///d:/Sky-Lux-Business/backend/src/modules/chat/chat-pubsub.service.ts) publishes JSON payload to Redis.
     - Active SSE streams receive and push the message event directly down the open HTTP connection.
