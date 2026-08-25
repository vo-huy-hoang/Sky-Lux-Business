# SkyLux — API Contract Draft

## 1. Trạng thái tài liệu

File này là **API contract đề xuất** được suy ra từ:

- module Backend trong tài liệu cấu trúc;
- database model;
- phạm vi Phase 1–2;
- màn hình Sales / Điều hành / CEO.

Nguồn không cung cấp danh sách endpoint chính thức đã khóa, vì vậy tên endpoint dưới đây là **đề xuất để triển khai**, cần được FE/BE review trước khi coi là contract ổn định.

---

## 2. Nguyên tắc chung

Base path:

```text
/api
```

Ví dụ production:

```text
https://app.skylux.vn/api
```

Frontend không hard-code IP VPS.

### Request flow

```text
Next.js
  ↓ HTTP/JSON
NestJS Controller
  ↓
Guard / Tenant Context / Permission
  ↓
Service
  ↓
TypeORM
  ↓
PostgreSQL
```

### Tenant

Frontend không gửi `organization_id` để quyết định phạm vi dữ liệu.

Backend lấy tenant từ authenticated context.

---

## 3. Authentication

Endpoint đề xuất:

```http
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/change-password
```

`GET /auth/me` nên trả:

```json
{
  "id": "uuid",
  "fullName": "Nguyen Van A",
  "email": "a@skylux.vn",
  "organization": {
    "id": "uuid",
    "code": "SKYLUX"
  },
  "roles": ["SALES"],
  "permissions": [
    "dossier.view.own",
    "dossier.submit"
  ]
}
```

Chi tiết cơ chế access/refresh token chưa được tài liệu nguồn khóa; FE/BE cần thống nhất khi triển khai auth.

---

## 4. Quy ước response

Đề xuất response thành công:

```json
{
  "data": {},
  "meta": {}
}
```

Danh sách:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 128
  }
}
```

Error:

```json
{
  "statusCode": 400,
  "code": "IMPORT_VALIDATION_FAILED",
  "message": "Dữ liệu import chưa hợp lệ",
  "details": []
}
```

`code` nên ổn định để frontend map message/behavior.

---

## 5. Permission guard

Không hard-code:

```ts
if (user.role === 'CEO') {}
```

Nên dùng permission:

```ts
@Permissions('dossier.approve')
```

Permission nguồn:

```text
dossier.view.own
dossier.view.team
dossier.view.all
dossier.update
dossier.submit
dossier.approve
finance.view
report.export
user.manage
```

---

# 6. Auth / Users / RBAC

## Users

```http
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
POST   /api/users/:id/lock
POST   /api/users/:id/unlock
DELETE /api/users/:id
```

Phase 1 CEO/Admin screen yêu cầu:

- tạo/sửa/khóa user;
- phân Sales / Điều hành / Admin;
- xem phòng ban;
- quản lý quyền.

## Roles

```http
GET   /api/roles
POST  /api/roles
PATCH /api/roles/:id
GET   /api/permissions
PUT   /api/roles/:id/permissions
PUT   /api/users/:id/roles
```

---

# 7. Organizations / Settings

Phase 1 hiện dùng một organization nhưng API vẫn giữ tenant model.

```http
GET   /api/organization
PATCH /api/organization
GET   /api/organization/settings
PUT   /api/organization/settings/:key
```

Không đưa các API SaaS như subscription/billing vào Phase 1–2.

---

# 8. Customers

Sales screens có:

- danh sách khách hàng;
- cá nhân/doanh nghiệp;
- trạng thái chăm sóc;
- người liên hệ;
- hồ sơ liên quan;
- hoạt động gần đây.

API đề xuất:

```http
GET    /api/customers
GET    /api/customers/:id
POST   /api/customers
PATCH  /api/customers/:id
DELETE /api/customers/:id
```

Filter:

```text
type
status
assignedSalesId
search
page
pageSize
```

Contacts:

```http
GET    /api/customers/:id/contacts
POST   /api/customers/:id/contacts
PATCH  /api/customers/:id/contacts/:contactId
DELETE /api/customers/:id/contacts/:contactId
```

Hồ sơ liên quan:

```http
GET /api/customers/:id/dossiers
```

---

# 9. Suppliers

Phase 1/2 CEO và Điều hành có supplier/partner management.

```http
GET    /api/suppliers
GET    /api/suppliers/:id
POST   /api/suppliers
PATCH  /api/suppliers/:id
DELETE /api/suppliers/:id
```

Filter:

```text
supplierTypeId
status
search
```

---

# 10. Master Data

CEO screen cấu hình:

- mảng kinh doanh;
- loại thị trường;
- loại khách;
- loại nhà cung cấp;
- trạng thái hồ sơ;
- đơn vị;
- cấu hình import.

API có thể gom:

```http
GET /api/master-data/business-lines
GET /api/master-data/market-types
GET /api/master-data/service-categories
GET /api/master-data/passenger-types
GET /api/master-data/supplier-types
GET /api/master-data/units
```

CRUD cho admin có permission tương ứng.

---

# 11. Dossiers

## Danh sách

```http
GET /api/dossiers
```

Filter suy ra từ màn hình:

```text
status
salesUserId
operatorUserId
customerId
businessLineId
marketTypeId
fromDate
toDate
search
page
pageSize
```

Backend tự scope theo permission:

```text
Sales      → own
Operator   → team/assigned/pending scope
CEO/Admin  → all
```

## Chi tiết

```http
GET /api/dossiers/:id
```

Response có thể tổng hợp:

```json
{
  "data": {
    "dossier": {},
    "customer": {},
    "currentEstimate": {},
    "financialSummary": {},
    "workflow": [],
    "documents": [],
    "comments": []
  }
}
```

## Update metadata

```http
PATCH /api/dossiers/:id
```

Không dùng endpoint này để tùy ý đổi workflow status.

---

# 12. Estimate & Import Excel

Nguồn Phase 1 và UI xác định Excel là đường nhập dự toán chính.

## Import session

```http
POST /api/imports
```

`multipart/form-data`

Output:

```json
{
  "data": {
    "importSessionId": "uuid",
    "status": "UPLOADED"
  }
}
```

## Status

```http
GET /api/imports/:id
```

State:

```text
UPLOADED
QUEUED
PROCESSING
READY_FOR_REVIEW
CONFIRMED
FAILED
```

## Preview

```http
GET /api/imports/:id/preview
GET /api/imports/:id/errors
```

## Chỉnh dữ liệu staging

```http
PATCH /api/imports/:id/rows/:rowId
```

Chỉ sửa dữ liệu đã parse/import.

## Validate lại

```http
POST /api/imports/:id/validate
```

## Confirm

```http
POST /api/imports/:id/confirm
```

Confirm phải chạy transaction tạo:

```text
Dossier
Estimate
Revenue Lines
Cost Lines
```

## Estimate

```http
GET /api/dossiers/:id/estimates
GET /api/estimates/:id
PATCH /api/estimates/:id
```

Approved version phải được bảo vệ khỏi sửa trực tiếp; chỉnh sửa sau yêu cầu change nên tạo version mới theo business rule đã khóa.

---

# 13. Workflow / Approvals

Không update status hồ sơ bằng generic PATCH.

Dùng action endpoint:

```http
POST /api/dossiers/:id/submit
POST /api/dossiers/:id/start-review
POST /api/dossiers/:id/request-changes
POST /api/dossiers/:id/resubmit
POST /api/dossiers/:id/approve
POST /api/dossiers/:id/complete
POST /api/dossiers/:id/lock
```

Body ví dụ:

```json
{
  "comment": "Cần bổ sung thông tin nhà cung cấp."
}
```

History:

```http
GET /api/dossiers/:id/workflow-history
GET /api/dossiers/:id/approvals
```

Phase 2 phê duyệt nhiều cấp có thể bổ sung endpoint cấu hình workflow sau khi rule được chốt.

---

# 14. Documents

```http
GET    /api/dossiers/:id/documents
POST   /api/dossiers/:id/documents
GET    /api/documents/:id
DELETE /api/documents/:id
```

Download private file:

```http
GET /api/documents/:id/download-url
```

Backend:

1. kiểm tra tenant;
2. kiểm tra permission;
3. tạo signed URL;
4. trả URL ngắn hạn.

### Version Phase 2

```http
GET  /api/documents/:id/versions
POST /api/documents/:id/versions
```

---

# 15. Comments & Messaging / Chat

Module hỗ trợ bình luận theo hồ sơ và nhắn tin / chat trực tiếp giữa các vai trò (Sales, Operator, Admin...) hoặc chat gắn với ngữ cảnh hồ sơ.

## 15.1. Comments (Bình luận dossier)

```http
GET  /api/dossiers/:id/comments
POST /api/dossiers/:id/comments
```

## 15.2. Messaging / Chat REST API

### Conversations (Hội thoại)

```http
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id
GET    /api/dossiers/:dossierId/conversation
```

**Filter `GET /api/conversations`**:

```text
type         (DIRECT, GROUP, DOSSIER)
search       (tìm kiếm tên hội thoại / thành viên)
page
pageSize
```

**Body `POST /api/conversations`**:

```json
{
  "type": "DIRECT",
  "participantIds": ["user-uuid-1"],
  "title": "Trao đổi Sales & Operator",
  "dossierId": "dossier-uuid-optional"
}
```

### Messages (Tin nhắn)

```http
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
DELETE /api/messages/:messageId
```

**Query `GET /api/conversations/:id/messages`**:

```text
beforeMessageId (dùng cho cursor pagination load tin nhắn cũ)
limit           (default 50)
```

**Body `POST /api/conversations/:id/messages`**:

```json
{
  "messageType": "TEXT",
  "content": "Hồ sơ #DOS-2026-001 đã chuẩn bị xong dự toán, nhờ Điều hành kiểm tra.",
  "parentId": "message-uuid-optional",
  "attachments": [
    {
      "fileName": "bao_gia_nha_cung_cap.pdf",
      "fileUrl": "https://storage.skylux.vn/docs/uuid.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024500
    }
  ]
}
```

### Read Status & Participants

```http
POST   /api/conversations/:id/read
GET    /api/conversations/:id/participants
POST   /api/conversations/:id/participants
DELETE /api/conversations/:id/participants/:userId
```

**Body `POST /api/conversations/:id/read`**:

```json
{
  "lastReadMessageId": "message-uuid-latest"
}
```

## 15.3. Realtime WebSocket Gateway (`/ws/chat`)

Hệ thống NestJS WebSocket Gateway sử dụng namespace `/chat` (giao thức Socket.io với JWT Auth Handshake):

- **Client emit**:
  - `message:send` — Gửi tin nhắn mới realtime.
  - `message:read` — Đánh dấu tin nhắn đã đọc.
  - `typing:start` / `typing:stop` — Bật/tắt trạng thái đang gõ.
- **Server emit / Broadcast**:
  - `message:received` — Đẩy tin nhắn mới đến các thành viên trong hội thoại.
  - `message:read_updated` — Cập nhật trạng thái đã đọc của các thành viên.
  - `conversation:updated` — Cập nhật thứ tự `last_message_at` và danh sách hội thoại.
  - `notification:unread_count` — Cập nhật tổng số tin nhắn chưa đọc cho từng user.

---

# 16. Tasks — Phase 2

```http
GET    /api/tasks
GET    /api/tasks/:id
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Action:

```http
POST /api/tasks/:id/start
POST /api/tasks/:id/complete
POST /api/tasks/:id/request-extension
```

Checklist:

```http
GET   /api/tasks/:id/checklist
POST  /api/tasks/:id/checklist
PATCH /api/tasks/:id/checklist/:itemId
```

Filters:

```text
assignedTo
status
priority
dossierId
dueFrom
dueTo
overdue
```

---

# 17. Payments / Debt — Phase 2

```http
GET  /api/dossiers/:id/payments
POST /api/dossiers/:id/payments
GET  /api/payments/:id
PATCH /api/payments/:id
```

Financial summary:

```http
GET /api/dossiers/:id/finance-summary
```

Không cho client truyền `remainingDebt` để ghi đè.

Backend tính từ transaction hợp lệ.

---

# 18. KPI

Sales:

```http
GET /api/kpi/me
```

Operator/CEO:

```http
GET  /api/kpis
POST /api/kpis/targets
PATCH /api/kpis/targets/:id
GET  /api/kpis/sales
```

Filter:

```text
periodType
periodStart
periodEnd
departmentId
userId
```

---

# 19. Reports / Dashboard

Màn hình nguồn có dashboard riêng cho từng role.

## Sales

```http
GET /api/dashboard/sales
```

Dữ liệu:

- doanh thu cá nhân;
- hồ sơ đang xử lý;
- khách hàng đang chăm sóc;
- KPI;
- hồ sơ gần đây;
- việc cần làm;
- thông báo.

## Operator

```http
GET /api/dashboard/operator
```

Dữ liệu:

- hồ sơ chờ xử lý;
- cần bổ sung;
- doanh thu;
- Sales active;
- trạng thái hồ sơ;
- KPI team;
- việc cần xử lý.

## CEO

```http
GET /api/dashboard/ceo
```

Dữ liệu:

- tổng doanh thu;
- lợi nhuận;
- hồ sơ đang xử lý;
- chờ duyệt;
- KPI Sales;
- cơ cấu doanh thu;
- top Sales;
- pending approvals.

## Revenue report

```http
GET /api/reports/revenue
GET /api/reports/sales-performance
GET /api/reports/customer
GET /api/reports/supplier
```

Export:

```http
POST /api/reports/export
```

Phase 1–2 export nhỏ có thể xử lý đồng bộ; export lớn về sau có thể dùng queue/report job.

---

# 20. Accounting Period — Phase 2

```http
GET  /api/accounting-periods
POST /api/accounting-periods
POST /api/accounting-periods/:id/lock
POST /api/accounting-periods/:id/unlock
```

Unlock cần reason và audit.

---

# 21. Audit

CEO/Admin:

```http
GET /api/audit-logs
GET /api/audit-logs/:id
```

Filter:

```text
actorUserId
action
entityType
entityId
from
to
requestId
```

Audit không có API delete cho user thông thường.

---

# 22. Health

```http
GET /api/health
```

Ví dụ:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok"
}
```

Dùng cho monitoring/deployment verification.

---

# 23. HTTP status đề xuất

```text
200 OK
201 Created
204 No Content
400 Validation/Business rule
401 Unauthenticated
403 Forbidden
404 Not Found
409 Conflict / optimistic locking / duplicate
422 Import semantic validation
500 Internal Server Error
```

---

# 24. OpenAPI

NestJS nên xuất Swagger/OpenAPI để FE/BE thống nhất contract.

Các DTO phải mô tả:

- request;
- response;
- pagination;
- filter;
- validation;
- enum/status.

Không share TypeORM Entity trực tiếp sang frontend.

---

# 25. Tài liệu liên quan

- [Architecture](../architecture/README.md)
- [Database](../database/README.md)
- [Business Flow](../business-flow/README.md)
- [Deployment](../deployment/README.md)
