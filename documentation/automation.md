# Sky-Lux CRM - Automation & Asynchronous Pathways Reference

This document maps all automated and background execution paths within Sky-Lux CRM, clarifying the boundary between user-initiated actions and automated background processes.

---

## 1. System Inventory: Production Automation Pathways

Sky-Lux CRM currently contains **zero embedded external LLM agents or autonomous AI tool-calling workflows**. All automated processing is deterministic, rule-based, and confined to the following internal pathways:

| Pathway Name | Trigger / Initiator | Execution Context | Inputs Read | Enforced Hard Guardrails | Output & State Mutations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Excel Ingestion Worker** | User initiates `POST /api/imports` | Isolated BullMQ process ([ImportProcessor](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts)) | Uploaded `.xlsx` binary from disk | Max file size 30MB; Formula injection sanitization (prepending `'` to `=,+,-,@`); isolated staging tables (`import_rows`) | Persists staged rows; emits validation errors; marks session `READY_FOR_REVIEW` |
| **Realtime Pub/Sub Broadcaster** | User sends message or system triggers notification | In-memory Redis Pub/Sub ([ChatPubSubService](file:///d:/Sky-Lux-Business/backend/src/modules/chat/chat-pubsub.service.ts)) | Message entity / Notification entity | Tenant channel partitioning (`channel:org:${orgId}:...`); SSE authentication via `stream: true` token | Broadcasts JSON payload to active EventSource clients |
| **Security Audit Recorder** | Controller operations (mutations on users, dossiers, estimates, settings) | Synchronous / Asynchronous [AuditLogsService](file:///d:/Sky-Lux-Business/backend/src/modules/audit-logs/audit-logs.service.ts) | User ID, IP address, user agent, before/after entity state | Strips sensitive fields (e.g. `password`, `hash`); scoped to `organizationId` | Inserts immutable record into `audit_logs` table |

---

## 2. Hard Non-Prompt Guardrails vs. Approvals

1. **Two-Phase Commit for Batch Imports**:
   - The worker never automatically inserts parsed rows into production CRM tables.
   - It only populates staging tables. A human user with `import.manage` permission must review the preview and explicitly trigger `POST /api/imports/:id/confirm`.
2. **Formula Injection Neutralization**:
   - Spreadsheet cells containing potential formula injection characters (`=`, `+`, `-`, `@`) are escaped unconditionally in [import.processor.ts:23-30](file:///d:/Sky-Lux-Business/backend/src/modules/imports/queue/import.processor.ts#L23-L30) before being written to the database.
3. **Session Invalidation Eviction**:
   - Security-critical user mutations (role change, account locking, password reset) automatically evict cached auth metadata in Redis (`user:auth-meta:${id}`), forcing token re-evaluation within 0ms.

---

## 3. Policy for Future Embedded AI / LLM Additions

If embedded LLM agents or AI-assisted quote generation are added in future iterations:
- **No Direct Database Writes**: AI agents must only produce structured suggestions. All mutations to dossiers, estimates, and customer records must pass through standard DTO validation and require human review.
- **Strict Tool Whitelisting**: Any tool provided to an agent must be read-only (e.g., `search_suppliers`, `calculate_estimate_totals`). Write tools must require user approval before execution.
- **Tenant Scope Enclosure**: Tool handlers must unconditionally bind to `@CurrentUser('organizationId')` to guarantee an agent cannot be prompted into accessing cross-tenant data.
