# Sky-Lux CRM - Email & Outbound Messaging Policy

## 1. Current Phase Architecture: Zero Transactional Email

In Phase 1 and Phase 2 of Sky-Lux CRM, **no external transactional email provider** (e.g. AWS SES, SendGrid, Resend, Mailgun, or Nodemailer SMTP) is integrated.

### Explicit Architectural Boundary
1. **Zero Recurring External Cost**: Keeping the platform operational with zero third-party messaging subscription fees.
2. **Zero PII Outbound Exposure**: Customer contact information, passenger passport numbers, and financial quotes are never transmitted over unencrypted outbound SMTP relays.
3. **In-App Realtime Notifications**:
   - All system alerts (dossier submissions, review requests, approvals, task assignments) are written to the internal [notifications](file:///d:/Sky-Lux-Business/backend/src/modules/notifications/entities/notification.entity.ts) table in PostgreSQL.
   - Realtime delivery is executed via Server-Sent Events (SSE) at `/api/notifications/stream` backed by Redis Pub/Sub ([notifications.controller.ts:39](file:///d:/Sky-Lux-Business/backend/src/modules/notifications/notifications.controller.ts#L39)).

---

## 2. Future Email Integration Guardrails (When Enabled)

If outbound email delivery is introduced in a future release, the following architectural controls must be enforced:
1. **Queue Isolation**: Outbound emails must be routed through a dedicated BullMQ queue (`email-queue`) with exponential backoff.
2. **Template Sanitization**: HTML templates must escape all customer-provided strings to prevent HTML/XSS injection in mail clients.
3. **No Financial PII in Subject Lines**: Email subjects must not include customer revenue, pricing, or passenger passport details.
