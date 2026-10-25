# Sky-Lux CRM - System Architecture

## 1. Product Overview & Core Domain

**Sky-Lux CRM** is an enterprise-grade Travel & Tour Management ERP platform specifically built for inbound and outbound tour operators. The platform manages the full lifecycle of custom tour requests:
- Customer intake and CRM management.
- Multi-version cost & revenue estimation ([EstimatesModule](file:///d:/Sky-Lux-Business/backend/src/modules/estimates/estimates.module.ts)).
- Excel budget importing with staging & formula injection sanitization ([ImportsModule](file:///d:/Sky-Lux-Business/backend/src/modules/imports/imports.module.ts)).
- Formal workflow approval chain (Sales → Operator → CEO/Manager → Locked).
- Supplier tracking, multi-currency revenue calculation, payments, and in-app realtime collaboration ([ChatModule](file:///d:/Sky-Lux-Business/backend/src/modules/chat/chat.module.ts), [NotificationsModule](file:///d:/Sky-Lux-Business/backend/src/modules/notifications/notifications.module.ts)).

### Core Domain Principles
1. **Multi-Tenancy Isolation**: Every tenant organization is strictly isolated by `organizationId`. Cross-tenant queries are blocked at query building time in services.
2. **Deterministic Financial Accuracy**: All currency values use PostgreSQL `NUMERIC(18,2)` with custom JavaScript float driver parsing ([main.ts:12](file:///d:/Sky-Lux-Business/backend/src/main.ts#L12)).
3. **Auditable Lifecycle**: Every state transition on dossiers and financial estimates is recorded in `audit_logs` ([AuditLogsService](file:///d:/Sky-Lux-Business/backend/src/modules/audit-logs/audit-logs.service.ts)).
4. **Zero Recurring Third-Party API Costs**: System runs on self-hosted infrastructure (PostgreSQL 16, Redis 7, Cloudflare R2 / MinIO for object storage) with no recurring external AI or email API fees.

---

## 2. Technology Stack

| Layer | Technologies & Libraries | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 16.3.1](file:///d:/Sky-Lux-Business/frontend/package.json#L33) (App Router), [React 19.2.8](file:///d:/Sky-Lux-Business/frontend/package.json#L34), Ant Design 6.6, ECharts 6.1, Tailwind CSS v4 | Server-side rendering, client interactive dashboards, state management (Zustand), route protection via [middleware.ts](file:///d:/Sky-Lux-Business/frontend/middleware.ts). |
| **Backend API** | [NestJS 11.0.1](file:///d:/Sky-Lux-Business/backend/package.json#L38), Express 5, TypeScript 5, TypeORM 1.1 | Modular monolithic architecture, REST API, Swagger OpenAPI documentation at `/api/docs`. |
| **Authentication & Caching** | `@nestjs/jwt`, `@nestjs/throttler`, [ioredis 5.11](file:///d:/Sky-Lux-Business/backend/package.json#L53), [RedisService](file:///d:/Sky-Lux-Business/backend/src/common/redis/redis.service.ts) | Stateless JWT tokens, Redis-backed `user:auth-meta:${id}` sub-millisecond cache with immediate invalidation, Redis rate-limiting storage. |
| **Database** | PostgreSQL 16, TypeORM migrations ([data-source.ts](file:///d:/Sky-Lux-Business/backend/src/database/data-source.ts)) | Relational schema across 14 domain clusters, UUID primary keys, soft delete via `deletedAt`. |
| **Background Jobs** | [BullMQ 6.1.2](file:///d:/Sky-Lux-Business/backend/package.json#L49), `@nestjs/bullmq` | Asynchronous Excel budget parsing, row schema validation, batch data ingestion. |
| **Realtime Messaging** | Server-Sent Events (SSE) via RxJS `Observable`, Redis Pub/Sub ([ChatPubSubService](file:///d:/Sky-Lux-Business/backend/src/modules/chat/chat-pubsub.service.ts)) | Realtime conversation messages and user notifications without persistent full-duplex WebSocket overhead. |
| **Object Storage** | AWS S3 SDK v3 (`@aws-sdk/client-s3`), Cloudflare R2 / MinIO | Presigned upload/download URLs for documents and chat attachments ([storage.config.ts](file:///d:/Sky-Lux-Business/backend/src/config/storage.config.ts)). |

---

## 3. End-to-End Authentication, Sessions & Claims Flow

```
[Browser Client]
       │
       │ 1. POST /api/auth/login { email, password }
       ▼
[AuthService] ── Verify bcrypt hash ──► [PostgreSQL: users]
       │
       │ 2. Issue JWT (id, email, organizationId, departmentId, roles, permissions, authVersion)
       │    & Cache { status: ACTIVE, authVersion, organizationId } in Redis (TTL: 300s)
       ▼
[Browser Client: Cookie/Storage]
       │
       │ 3. HTTP Request with Header: "Authorization: Bearer <JWT>"
       ▼
[JwtAuthGuard (Global)]
       ├── Verify JWT signature with JWT_SECRET
       ├── Check Redis key `user:auth-meta:${userId}` (<1ms fast path)
       │     └─ Cache miss? Query PostgreSQL `users` table & hydrate Redis cache
       ├── Validate: user.status === ACTIVE
       ├── Validate: payload.authVersion === cached.authVersion
       └── Validate: payload.organizationId === cached.organizationId
       │
       ▼ (Valid)
[RolesGuard / PermissionsGuard]
       ├── Inspect @Roles() or @RequirePermissions() metadata
       ├── Admin bypass: roles include 'SUPER_ADMIN' or 'CEO_ADMIN' (from app.adminRoles)
       └── Check user.permissions[] against required scope/code
       │
       ▼ (Authorized)
[Domain Controller & Service] (Injects @CurrentUser() with tenant scope)
```

### Realtime Stream Authentication (SSE)
SSE connections cannot send custom HTTP Authorization headers in native browser `EventSource`. To prevent credential leaks:
1. Client calls `POST /api/auth/stream-token` to obtain a dedicated, short-lived token with claim `stream: true` ([auth.service.ts:401](file:///d:/Sky-Lux-Business/backend/src/modules/auth/auth.service.ts#L401)).
2. Client connects to `/api/conversations/stream?token=...` or `/api/notifications/stream?token=...`.
3. [JwtQueryAuthGuard:43](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-query-auth.guard.ts#L43) verifies that `payload.stream === true` and validates `authVersion` against Redis. Standard API access tokens are rejected if passed in query parameters.

---

## 4. Trust Boundaries & Enforcement Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Browser ──► Next.js Edge / SSR Middleware                 │
│ Enforcement: frontend/middleware.ts checks 'access_token' cookie.           │
│ Redirects unauthenticated requests to /auth/login?redirect=...              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ TRUST BOUNDARY 2: Client ──► NestJS HTTP API Layer                          │
│ Enforcement:                                                                │
│ - Helmet & CORS whitelist (main.ts:37-51)                                   │
│ - Rate Limiting (CustomThrottlerGuard via Redis, app.module.ts:53-71)       │
│ - Global ValidationPipe (whitelist: true, forbidNonWhitelisted: true)       │
│ - JwtAuthGuard / JwtQueryAuthGuard (authVersion & user status verification) │
│ - RolesGuard & PermissionsGuard (RBAC authorization)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ TRUST BOUNDARY 3: Service Layer ──► Multi-Tenant Data Isolation             │
│ Enforcement:                                                                │
│ - Code-enforced query builder scoping: `WHERE entity.organizationId = :org` │
│   (e.g., dossiers.service.ts:74, customers.service.ts:47)                   │
│ - SuperAdmin guard: explicit assertSuperAdmin() check on cross-tenant ops   │
│   (organizations.controller.ts:95, users.controller.ts:123)                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ TRUST BOUNDARY 4: Background Workers & Queue Execution                      │
│ Enforcement:                                                                │
│ - BullMQ 'import-queue' isolated worker (import.processor.ts:32)            │
│ - Formula Injection Defense: sanitizeCellValue prepends single quote (')    │
│   to values starting with =, +, -, @ (import.processor.ts:23-30)            │
│ - Execution sandboxed to database staging tables (import_rows)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Known Risks & Architectural Assumptions

1. **Empty Environment Validation Schema ([env.validations.ts](file:///d:/Sky-Lux-Business/backend/src/config/env.validations.ts))**:
   - *Risk*: `backend/src/config/env.validations.ts` is currently a 0-byte file. Missing environment variables (e.g. `JWT_SECRET`, `DB_PASSWORD`, `REDIS_HOST`) do not cause a fail-fast boot crash, leading to deferred runtime errors.
   - *Code Evidence*: [app.module.ts:73-76](file:///d:/Sky-Lux-Business/backend/src/app.module.ts#L73-L76).
2. **Admin Roles Global Bypass in RBAC Guards**:
   - *Risk*: Both [RolesGuard:48-52](file:///d:/Sky-Lux-Business/backend/src/common/guards/roles.guard.ts#L48-L52) and [PermissionsGuard:46-51](file:///d:/Sky-Lux-Business/backend/src/common/guards/permissions.guard.ts#L46-L51) treat any role listed in `app.adminRoles` (`SUPER_ADMIN`, `CEO_ADMIN`) as a universal permission bypass (`return true;`). If an endpoint requires `@Roles('SUPER_ADMIN')` exclusively, a `CEO_ADMIN` would bypass it unless the controller explicitly executes an additional manual check (e.g., `assertSuperAdmin` in [organizations.controller.ts:95](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.controller.ts#L95) and [users.controller.ts:123](file:///d:/Sky-Lux-Business/backend/src/modules/users/users.controller.ts#L123)).
3. **Specification vs Implementation Drift in Realtime Layer**:
   - *Risk*: API design specifications in `docs/api/API-WS-CHAT-001` through `008` detail WebSocket interfaces (`ws://...`), but the implemented backend uses Server-Sent Events (`@Sse`) with Redis Pub/Sub. Clients relying on native WebSockets will fail.
   - *Code Evidence*: [chat.controller.ts:67](file:///d:/Sky-Lux-Business/backend/src/modules/chat/chat.controller.ts#L67), [notifications.controller.ts:39](file:///d:/Sky-Lux-Business/backend/src/modules/notifications/notifications.controller.ts#L39).
4. **Absence of Public `robots.txt`**:
   - *Risk*: [frontend/public](file:///d:/Sky-Lux-Business/frontend/public) lacks a `robots.txt` file disallowing search crawler indexing for internal enterprise endpoints.
5. **No Transactional Email Provider in Phase 1-2**:
   - *Assumption*: Notifications are delivered strictly in-app via the `notifications` table and realtime SSE streams. No third-party SMTP/SES provider is integrated.

---

## 6. Related Documents Index

All documents in `documentation/` are cross-referenced below:
- [flows.md](file:///d:/Sky-Lux-Business/documentation/flows.md) — Runtime step-by-step journeys, authorization checks, and side effects.
- [permissions.md](file:///d:/Sky-Lux-Business/documentation/permissions.md) — Static RBAC matrix, token claims vs DB checks, and row-level security.
- [variables.md](file:///d:/Sky-Lux-Business/documentation/variables.md) — Configuration and secrets inventory, leak auditing, and rotation guidelines.
- [tests.md](file:///d:/Sky-Lux-Business/documentation/tests.md) — Verification map: existing test coverage, proposed tests, and ranked gaps.
- [cron.md](file:///d:/Sky-Lux-Business/documentation/cron.md) — Background job inventory (BullMQ `import-queue`) and scheduled execution safety.
- [emails.md](file:///d:/Sky-Lux-Business/documentation/emails.md) — In-app notification architecture (No transactional email in Phase 1-2).
- [seo.md](file:///d:/Sky-Lux-Business/documentation/seo.md) — Internal ERP route indexing policy and crawler defenses.
- [automation.md](file:///d:/Sky-Lux-Business/documentation/automation.md) — Realtime Redis event streaming and Excel worker automation.
