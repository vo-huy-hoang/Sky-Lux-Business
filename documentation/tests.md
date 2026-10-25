# Sky-Lux CRM - Verification & Test Coverage Map

This document maps documented system rules and security boundaries against empirical verification evidence across unit, integration, and e2e test suites.

---

## 1. Existing Coverage (Empirically Verified Today)

Every row below is backed by passing tests in the repository today:
- **Backend**: 73 test suites, 543 passing tests ([backend/package.json](file:///d:/Sky-Lux-Business/backend/package.json))
- **Frontend**: 64 test suites, 417 passing tests ([frontend/package.json](file:///d:/Sky-Lux-Business/frontend/package.json))
- **Grand Total**: 137 test suites, 960 automated tests passing 100%.

| Domain & Use-Case | Rule Enforced | Expected Behavior (Positive & Deny) | Evidence Source (Code & Test Suite) | Status | CI Gate |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Auth: Concurrency & Rollback** | Concurrent login requests must generate valid sessions without race conditions; DB failures roll back | Multiple concurrent login requests succeed; transaction rollback cleans state | [auth-concurrency-and-rollback.integration.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/auth/auth-concurrency-and-rollback.integration.spec.ts) | Existing | Yes |
| **Auth: Token Verification** | Reject invalid signatures, expired tokens, or inactive users | Valid -> 200; Inactive/malformed -> 401 Unauthorized | [jwt-auth.guard.spec.ts](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-auth.guard.spec.ts) | Existing | Yes |
| **Auth: Redis Auth Cache** | Sub-millisecond verification via `user:auth-meta:${id}`; graceful fallback to DB on Redis timeout | Cache hit -> skip DB; Redis down -> query DB & warn, no 500 error | [jwt-auth.guard.spec.ts](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-auth.guard.spec.ts) | Existing | Yes |
| **Auth: Realtime Stream Tokens** | SSE endpoints require `stream: true` claim; regular JWT rejected | Token with `stream: true` -> 200; standard JWT -> 401 Unauthorized | [jwt-query-auth.guard.spec.ts](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-query-auth.guard.spec.ts) | Existing | Yes |
| **Org: Atomic Onboarding** | Creating organization, settings, departments, roles, and CEO must be in single transaction | All succeed or entire transaction rolls back; no orphan records | [organizations.service.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.service.spec.ts) | Existing | Yes |
| **Org: Super Admin Guard** | Only `SUPER_ADMIN` can list all tenants or create organizations | `SUPER_ADMIN` -> 200; `CEO_ADMIN` or other -> 403 Forbidden | [organizations.controller.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/organizations/organizations.controller.spec.ts) | Existing | Yes |
| **Dossier: State Machine** | Transitions follow strict lifecycle (`DRAFT` -> `SUBMITTED` -> `IN_REVIEW` -> `APPROVED` -> `LOCKED`) | Valid step -> updates state; invalid transition -> 400 BadRequest | [dossier-workflow.service.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/approvals/dossier-workflow.service.spec.ts) | Existing | Yes |
| **Dossier: Tenant Isolation** | Queries must strictly isolate dossiers by `organizationId` | Scoped to caller tenant; cross-tenant UUID -> 404 NotFound | [dossiers.integration.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/dossiers/dossiers.integration.spec.ts) | Existing | Yes |
| **Dossier: Row Visibility** | `dossier.view.own` sees only assigned; `dossier.view.team` sees department | Out of scope dossier -> empty list or 404 | [dossiers.service.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/dossiers/dossiers.service.spec.ts) | Existing | Yes |
| **Estimates: Calculations** | Revenue & cost lines must calculate gross profit & margin accurately | `profit = totalRevenue - totalCost`; `margin = profit / revenue` | [estimates.service.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/estimates/estimates.service.spec.ts) | Existing | Yes |
| **Estimates: Freeze on Approval**| Approved estimates cannot have revenue/cost lines mutated | Editing approved estimate -> 400 BadRequest | [estimates.integration.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/estimates/estimates.integration.spec.ts) | Existing | Yes |
| **Import: Formula Injection** | Cells starting with `=`, `+`, `-`, `@` must be sanitized with `'` prefix | Malicious cell values sanitized in staging rows | [import.processor.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.spec.ts) | Existing | Yes |
| **Import: Workbook Parsing** | Customer budget excel structure parsed into customer, dossier, and estimate items | Valid structure -> staged; invalid headers -> 400 with errors | [customer-budget.parser.spec.ts](file:///d:/Sky-Lux-Business/backend/src/modules/imports/customer-budget.parser.spec.ts) | Existing | Yes |
| **Rate Limiter: Redis Storage** | Requests exceeding throttler limits rejected with 429 | Exceeded limit -> 429 Too Many Requests | [throttler.spec.ts](file:///d:/Sky-Lux-Business/backend/src/common/throttler/throttler.spec.ts) | Existing | Yes |
| **RBAC: Permission Evaluation** | Wildcard `*` and hierarchical permissions evaluated correctly | Matching code -> allow; missing code -> 403 Forbidden | [permission.util.spec.ts](file:///d:/Sky-Lux-Business/backend/src/common/utils/permission.util.spec.ts) | Existing | Yes |

---

## 2. Proposed Tests (Recommended Prior to Production Launch)

The following tests are designed to cover edge conditions and boundary crossings:

| Use-Case | Target Rule | Test Type | Expected Behavior | Proposed Verification Method |
| :--- | :--- | :---: | :--- | :--- |
| **Multi-Tenancy Cross-Org Mutation** | Preventing tenant ID tampering in nested entity creation (e.g. creating customer contact with mismatched org ID) | Automated Integration | Mutation blocked with `400` or `404`; contact never assigned to foreign tenant | E2E test executing `POST /api/customers/:id/contacts` with spoofed foreign IDs |
| **Environment Boot Fail-Fast** | Server boot must abort immediately if `JWT_SECRET` or `DB_PASSWORD` is empty | Automated Unit | NestJS bootstrap throws error during `ConfigModule` initialization | Test bootstrapping app with `process.env.JWT_SECRET = ''` |
| **Excel Staging Overload** | Enforcing 30MB file size limits and 10,000-row batch boundary in `ImportProcessor` | Guarded Live | Rejects oversized files before reading entire workbook into heap | Upload synthetic 50,000-row workbook and assert worker memory ceiling |
| **SSE Client Keep-Alive Teardown** | Abrupt SSE client disconnect must cleanly unregister Redis Pub/Sub subscription | Automated Integration | Redis subscriber count drops to zero after connection drop | Simulate client TCP reset during message streaming |
| **Frontend Middleware Leak** | Unauthenticated direct navigation to `/main/dossiers` without cookie | Automated Integration | Returns 307 redirect to `/auth/login?redirect=/main/dossiers` | Jest test running `NextRequest` through `middleware.ts` |

---

## 3. Gaps (Documented Rules Lacking Automated CI Verification)

Ranked strictly by what crossing the gap exposes to the platform:

### 1. Gap 1: Unenforced Environment Variable Schema (Severity: High)
- **Documented Rule**: [docs/architecture/README.md](file:///d:/Sky-Lux-Business/docs/architecture/README.md) states configuration must fail fast on missing environment variables.
- **Current State**: [backend/src/config/env.validations.ts](file:///d:/Sky-Lux-Business/backend/src/config/env.validations.ts) is 0 bytes; no validation schema is hooked into `ConfigModule.forRoot`.
- **Exposure**: Server boots successfully even with missing secrets; crashes later during user transactions or connects insecurely.

### 2. Gap 2: Crawler Defense via `robots.txt` (Severity: Moderate)
- **Documented Rule**: [docs/architecture/README.md](file:///d:/Sky-Lux-Business/docs/architecture/README.md) defines Sky-Lux as an internal enterprise ERP with zero public indexable surfaces.
- **Current State**: [frontend/public](file:///d:/Sky-Lux-Business/frontend/public) lacks `robots.txt`.
- **Exposure**: Web crawlers can index public assets, brand logos, or spam login redirect endpoints.

### 3. Gap 3: WebSocket vs. SSE Protocol Divergence (Severity: Low)
- **Documented Rule**: API specs `docs/api/API-WS-CHAT-001` through `008` specify `ws://` WebSocket frames.
- **Current State**: Zero WebSocket test suites exist because the backend implemented SSE via `@Sse` and HTTP POST.
- **Exposure**: API consumer confusion when developing third-party mobile or external integrations expecting WebSockets.
