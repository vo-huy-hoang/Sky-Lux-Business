# Sky-Lux CRM - Background Jobs & Queue Operations

This document catalogues all background workers, asynchronous queues, limits, retry policies, and operational safety controls in Sky-Lux CRM.

---

## 1. Background Jobs Inventory

Sky-Lux CRM uses **BullMQ 6.1** backed by Redis 7 for asynchronous execution. Scheduled cron timers (`@Cron`) are **not** currently used. All asynchronous work is event-driven through the `import-queue`.

| Queue Name | Job Name | Trigger / Origin | Processor Class & Function | Worker Secrets / Context | Concurrency & Limits | Retry Policy & Backoff |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `import-queue` | `parse-excel` | User uploads `.xlsx` via `POST /api/imports` | [ImportProcessor.handleParseExcel](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L66) | Database credentials (via TypeORM injection) | 1 active job per worker instance | 3 attempts, exponential backoff (1000ms delay) |
| `import-queue` | `validate-rows` | Triggered following successful Excel parse or via `POST /api/imports/:id/validate` | [ImportProcessor.handleValidateRows](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L54) | Database credentials | 1 active job per worker instance | 3 attempts, exponential backoff |

---

## 2. Idempotency & Concurrency Controls

1. **Session State Gate**:
   - Every job payload carries `sessionId` ([ImportProcessor:48](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L48)).
   - Before executing `parse-excel`, the worker checks `ImportSession.status`. If status is already `CONFIRMED` or `PROCESSING`, redundant work is prevented.
2. **Staging Isolation**:
   - Parse results are written strictly into the isolated staging tables (`import_rows`, `import_errors`).
   - Staging records carry `sessionId` as a foreign key. Subsequent re-validation passes delete existing `import_errors` for that session before repopulating, ensuring duplicate errors are never accumulated.
3. **Confirm Phase Atomic Commit**:
   - The user must explicitly inspect preview rows (`GET /api/imports/:id/preview`) and call `POST /api/imports/:id/confirm`.
   - The confirmation step executes inside a single database transaction, inserting production `customers`, `dossiers`, and `estimates`, and transitioning `ImportSession.status` to `CONFIRMED`.

---

## 3. Worker Authentication & Internal Authorization

- BullMQ workers operate as trusted server-side processes inside the NestJS execution context.
- **Trigger Authorization**: The HTTP endpoints that enqueue jobs (`POST /api/imports` and `POST /api/imports/:id/validate`) are protected by [JwtAuthGuard](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-auth.guard.ts) and require permission `import.manage`.
- **Tenant Scope Enforcement**: The worker inherits `organizationId` from the `ImportSession` entity in PostgreSQL, preventing cross-tenant data insertion.

---

## 4. Failure Handling & Observability

- **Error Recording**: If an uncaught exception occurs during parsing or row validation, `ImportProcessor.process()` catches the error, updates `ImportSession.status = FAILED`, and writes `summary: { error: error.message }` to the session record ([import.processor.ts:57-62](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L57-L62)).
- **Staging Audit**: Specific row validation errors (e.g. missing customer phone, invalid tax code, malformed number) are persisted in `import_errors` with row index and column name, visible to the user via `GET /api/imports/:id/errors`.
- **Job Retention**: Completed and failed BullMQ jobs are auto-evicted from Redis after 24 hours (`removeOnComplete: 100`, `removeOnFail: 500`) to prevent Redis memory bloat.
