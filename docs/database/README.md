# SkyLux — Database

## 1. Phạm vi

Database Phase 1–2 dùng **PostgreSQL**, tổ chức theo domain nghiệp vụ thay vì theo từng màn hình.

Nguồn database gốc xác định ba trục chính:

- `organizations` là root tenant;
- `dossiers` là trung tâm hồ sơ nghiệp vụ;
- `estimates` là trung tâm dự toán có version.

> Lưu ý: tài liệu database cũ có chỗ ghi `Prisma`, trong khi tài liệu cấu trúc triển khai mới hơn xác định Backend là `NestJS + TypeORM`. File này sử dụng TypeORM ở tầng implementation nhưng không thay đổi mô hình dữ liệu PostgreSQL nguồn.

---

## 2. Domain map

```text
PostgreSQL
│
├── Tenant
│   ├── organizations
│   └── organization_settings
│
├── Identity
│   ├── departments
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   └── role_permissions
│
├── CRM
│   ├── customers
│   ├── customer_contacts
│   ├── supplier_types
│   └── suppliers
│
├── Master Data
│   ├── business_lines
│   ├── market_types
│   ├── service_categories
│   ├── passenger_types
│   └── units
│
├── Business
│   ├── dossiers
│   ├── dossier_passengers
│   ├── estimates
│   ├── estimate_revenue_lines
│   └── estimate_cost_lines
│
├── Excel
│   ├── import_templates
│   ├── import_sessions
│   ├── import_rows
│   └── import_errors
│
├── Workflow
│   ├── approval_requests
│   └── workflow_history
│
├── Documents
│   ├── document_types
│   ├── documents
│   └── document_versions
│
├── Collaboration
│   └── comments
│
├── Messaging
│   ├── conversations
│   ├── conversation_participants
│   ├── messages
│   └── message_attachments
│
├── Task
│   ├── tasks
│   └── task_checklist_items
│
├── Finance
│   └── payments
│
├── Performance
│   ├── kpi_targets
│   └── kpi_results
│
├── Notification
│   └── notifications
│
└── Governance
    ├── accounting_periods
    ├── audit_logs
    └── organization_settings
```

---

## 3. Quy tắc kỹ thuật chung

### 3.1. ID

Khóa chính và foreign key dùng UUID.

TypeORM:

```ts
@PrimaryGeneratedColumn('uuid')
id: string;
```

### 3.2. Tiền

Dùng:

```text
NUMERIC(18,2)
```

Không dùng `FLOAT` / `DOUBLE` cho tiền.

Áp dụng cho:

- unit price;
- revenue;
- cost;
- payment;
- KPI tiền;
- profit.

### 3.3. Số lượng

```text
NUMERIC(12,3)
```

cho:

- quantity;
- multiplier;
- số ngày/lượt/hệ số.

### 3.4. Date/time

```text
DATE        → ngày tour, kỳ KPI, hạn thanh toán
TIMESTAMPTZ → created_at, submitted_at, approved_at, audit
```

### 3.5. JSONB

Phù hợp cho:

- `organization_settings.value`;
- raw/normalized import data;
- audit before/after.

### 3.6. Soft delete

Ưu tiên `deleted_at` cho dữ liệu có khả năng phục hồi:

- customers;
- suppliers;
- dossiers;
- documents.

Audit, lịch sử phê duyệt hoặc giao dịch đã xác nhận không nên hard delete tùy ý.

---

## 4. Tenant

### `organizations`

Trường chính:

| Field | Type | Rule |
|---|---|---|
| id | UUID | PK |
| code | VARCHAR(50) | UNIQUE |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE |
| logo_url | TEXT | nullable |
| status | VARCHAR(30) | indexed |
| timezone | VARCHAR(50) | default |
| currency | VARCHAR(10) | default |
| created_at | TIMESTAMPTZ | not null |
| updated_at | TIMESTAMPTZ | not null |
| deleted_at | TIMESTAMPTZ | nullable |

Phase 1–2 có thể chỉ có một organization nhưng vẫn phải giữ `organization_id` ở các bảng nghiệp vụ.

### `organization_settings`

| Field | Type |
|---|---|
| id | UUID |
| organization_id | UUID |
| key | VARCHAR(150) |
| value | JSONB |
| created_at | TIMESTAMPTZ |
| updated_at | TIMESTAMPTZ |

Ví dụ key:

```text
default_currency
default_timezone
dossier_code_prefix
finance.default_vat_rate
excel.max_file_size
notification.email_enabled
```

---

## 5. Identity & RBAC

### `users`

Các field cốt lõi:

```text
id
organization_id
department_id
employee_code
full_name
email
phone
password_hash
avatar_url
status
last_login_at
created_at
updated_at
deleted_at
```

Không lưu password plaintext.

### `roles`

Phase 1–2 có thể seed:

```text
SALES
OPERATOR
CEO_ADMIN
```

Role chỉ là nhóm permission, không phải nơi hard-code business logic.

### `permissions`

Ví dụ từ tài liệu nguồn:

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

### Mapping

```text
user_roles
role_permissions
```

`role_permissions.scope` có thể dùng:

```text
OWN
TEAM
ALL
```

---

## 6. CRM

### `customers`

Hỗ trợ:

```text
INDIVIDUAL
COMPANY
ORGANIZATION
```

Field chính:

```text
organization_id
code
customer_type
display_name
tax_code
phone
email
address
assigned_sales_id
status
```

### `customer_contacts`

Dùng cho khách doanh nghiệp có nhiều contact.

Không đồng nhất:

```text
Customer/Account ≠ Contact ≠ Passenger
```

### `suppliers`

Phục vụ estimate cost và dashboard chi phí theo NCC.

Field chính:

```text
supplier_type_id
code
name
tax_code
contact_name
phone
email
address
payment_terms
status
```

---

## 7. Business core

## `dossiers`

Hồ sơ là aggregate trung tâm.

Các field quan trọng:

```text
id
organization_id
code
name
customer_id
business_line_id
market_type_id
sales_user_id
operator_user_id
route
start_date
end_date
revenue_recognition_date
status
priority
version
locked_at
locked_by
created_by
created_at
updated_at
deleted_at
```

### Optimistic locking

```sql
UPDATE dossiers
SET ..., version = version + 1
WHERE id = :id
  AND organization_id = :orgId
  AND version = :currentVersion;
```

Nếu không update được bản ghi thì dữ liệu đã bị thay đổi bởi session khác.

### `revenue_recognition_date`

Nguồn yêu cầu phải chốt business rule thống nhất trước khi dashboard chính thức dùng số liệu theo tháng/quý.

---

## 8. Estimates

Không lưu toàn bộ dự toán trực tiếp trên dossier.

```text
dossier
  └── estimates
       ├── version 1
       ├── version 2
       └── version n
```

### `estimates`

Field chính:

```text
organization_id
dossier_id
version_no
status
source_import_session_id
parent_estimate_id
currency
note
created_by
submitted_by
approved_by
submitted_at
approved_at
created_at
updated_at
```

Trạng thái nguồn:

```text
DRAFT
SUBMITTED
IN_REVIEW
NEED_CHANGES
APPROVED
SUPERSEDED
```

### `estimate_revenue_lines`

Field:

```text
passenger_type_id
description
quantity
unit_id
multiplier
unit_price
vat_rate
price_basis
gross_amount
net_amount
note
sort_order
```

### `estimate_cost_lines`

Field:

```text
service_category_id
supplier_id
description
quantity
unit_id
multiplier
unit_price
vat_rate
price_basis
gross_amount
net_amount
validation_status
note
sort_order
```

Revenue và cost tách riêng vì thuộc tính nghiệp vụ khác nhau.

---

## 9. Tài chính

Các số tổng hợp nên tính ở PostgreSQL/backend:

```text
revenue_gross = SUM(revenue_lines.gross_amount)
revenue_net   = SUM(revenue_lines.net_amount)
cost_gross    = SUM(cost_lines.gross_amount)
cost_net      = SUM(cost_lines.net_amount)
profit        = revenue_net - cost_net
profit_margin = profit / revenue_net
```

### `payments` — Phase 2

Phạm vi Excel Phase 2 có chức năng:

- Sales cập nhật các lần khách thanh toán;
- Điều hành quản lý công nợ chi tiết;
- chứng từ liên quan;
- theo dõi tuổi nợ/cảnh báo quá hạn.

Field nguồn đề xuất:

```text
id
organization_id
dossier_id
payment_direction
amount
due_date
payment_date
payment_method
reference_code
status
document_id
note
created_by
timestamps
```

Direction:

```text
CUSTOMER_RECEIPT
SUPPLIER_PAYMENT
```

Không lưu `remaining_debt` như số cho người dùng sửa tay. Công nợ phải được tính từ dữ liệu hợp lệ.

---

## 10. Excel Import

Import Excel là đường tạo dự toán chính theo tài liệu nguồn.

### Bốn bảng staging

```text
import_templates
import_sessions
import_rows
import_errors
```

### Luồng dữ liệu

```text
Upload .xlsx
 ↓
import_session = UPLOADED
 ↓
QUEUE / PROCESSING
 ↓
Worker parse
 ↓
import_rows + import_errors
 ↓
READY_FOR_REVIEW
 ↓
User xử lý dữ liệu import
 ↓
CONFIRM
 ↓
Transaction
 ↓
Dossier + Estimate + Revenue Lines + Cost Lines
```

### `import_rows`

Lưu:

```text
sheet_name
row_number
raw_data JSONB
normalized_data JSONB
status
```

### `import_errors`

Lưu:

```text
column_name
error_code
error_message
severity
```

Severity:

```text
WARNING
ERROR
```

---

## 11. Workflow

### `approval_requests`

Field chính:

```text
organization_id
dossier_id
estimate_id
step_no
step_code
reviewer_user_id
status
requested_at
decided_at
comment
```

Ví dụ step:

```text
OPERATOR_REVIEW
CEO_APPROVAL
```

Phase 2 cho phép mở rộng phê duyệt nhiều cấp theo điều kiện.

### `workflow_history`

Phục vụ timeline UI:

```text
Draft
→ Đã gửi điều hành
→ Đang xem xét
→ Cần bổ sung
→ Đã gửi lại
→ Đã duyệt
```

Không chỉ dựa vào current status; cần history bất biến để truy vết.

---

## 12. Documents

Binary file không lưu trong PostgreSQL.

### `documents`

Metadata:

```text
organization_id
dossier_id
estimate_id
document_type_id
original_name
object_key
mime_type
file_size
checksum
version_no
uploaded_by
created_at
deleted_at
```

### `document_versions` — Phase 2

Excel Phase 2 yêu cầu người dùng:

- tải phiên bản tài liệu mới;
- xem lịch sử phiên bản cũ.

Do đó version history phải giữ được source file và người upload.

---

## 13. Tasks — Phase 2

### `tasks`

```text
organization_id
dossier_id
title
description
created_by
assigned_to
priority
status
progress_percent
start_at
due_at
completed_at
created_at
updated_at
deleted_at
```

Priority:

```text
LOW
MEDIUM
HIGH
URGENT
```

Status:

```text
TODO
IN_PROGRESS
WAITING
COMPLETED
```

### `task_checklist_items`

Dùng cho checklist chi tiết theo công việc.

---

## 14. Messaging & Chat

Phục vụ tính năng nhắn tin, trao đổi trực tiếp giữa các role user (Sales, Operator, Admin...) và trao đổi theo ngữ cảnh hồ sơ (Dossier).

### `conversations`

Quản lý thông tin cuộc trò chuyện / phòng chat.

Field chính:

| Field | Type | Rule |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | FK -> organizations.id |
| type | VARCHAR(30) | NOT NULL (`DIRECT`, `GROUP`, `DOSSIER`) |
| title | VARCHAR(255) | nullable (bắt buộc với `GROUP`, optional với `DIRECT` / `DOSSIER`) |
| dossier_id | UUID | FK -> dossiers.id, nullable (khi chat gắn với hồ sơ) |
| created_by | UUID | FK -> users.id |
| last_message_at | TIMESTAMPTZ | indexed, hỗ trợ sắp xếp danh sách chat |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable (soft delete) |

Hỗ trợ 3 loại hội thoại (`type`):
- `DIRECT`: Chat 1:1 giữa 2 người dùng (ví dụ: Sales trao đổi riêng với Operator).
- `GROUP`: Chat nhóm người dùng tự tạo.
- `DOSSIER`: Kênh chat tự động hoặc khởi tạo gắn với một hồ sơ nghiệp vụ cụ thể.

### `conversation_participants`

Quản lý danh sách thành viên tham gia hội thoại và trạng thái đã đọc.

Field chính:

| Field | Type | Rule |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | FK -> organizations.id |
| conversation_id | UUID | FK -> conversations.id |
| user_id | UUID | FK -> users.id |
| role | VARCHAR(30) | default `MEMBER` (`ADMIN`, `MEMBER`) |
| last_read_message_id | UUID | FK -> messages.id, nullable (đánh dấu tin nhắn cuối đã đọc) |
| last_read_at | TIMESTAMPTZ | nullable |
| joined_at | TIMESTAMPTZ | NOT NULL |
| left_at | TIMESTAMPTZ | nullable |

Ràng buộc UNIQUE: `(conversation_id, user_id)`.

### `messages`

Lưu trữ danh sách tin nhắn.

Field chính:

| Field | Type | Rule |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | FK -> organizations.id |
| conversation_id | UUID | FK -> conversations.id |
| sender_id | UUID | FK -> users.id |
| message_type | VARCHAR(30) | default `TEXT` (`TEXT`, `FILE`, `IMAGE`, `SYSTEM`) |
| content | TEXT | nullable (khi gửi tệp đính kèm) |
| parent_id | UUID | FK -> messages.id, nullable (dùng cho Reply/Thread) |
| metadata | JSONB | nullable (lưu thông tin payload hệ thống hoặc preview) |
| is_edited | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |
| deleted_at | TIMESTAMPTZ | nullable (thu hồi tin nhắn) |

### `message_attachments`

Quản lý tệp / hình ảnh đính kèm trong tin nhắn.

Field chính:

| Field | Type | Rule |
|---|---|---|
| id | UUID | PK |
| organization_id | UUID | FK -> organizations.id |
| message_id | UUID | FK -> messages.id |
| document_id | UUID | FK -> documents.id, nullable (nếu liên kết module Documents) |
| file_name | VARCHAR(255) | NOT NULL |
| file_url | TEXT | NOT NULL |
| file_type | VARCHAR(100) | MIME type |
| file_size | BIGINT | số byte |
| created_at | TIMESTAMPTZ | NOT NULL |

---

## 15. KPI

### `kpi_targets`

```text
organization_id
user_id
metric_code
period_type
period_start
period_end
target_value
created_by
created_at
updated_at
```

Metric nguồn:

```text
REVENUE
PROFIT
DOSSIER_COUNT
CLOSE_RATE
```

### `kpi_results`

Có thể dùng snapshot khi cần khóa kỳ.

Phase 1 có thể tính actual realtime nếu công thức còn đơn giản.

---

## 16. Audit & accounting periods

### `audit_logs`

```text
id
organization_id
actor_user_id
action
entity_type
entity_id
before_data JSONB
after_data JSONB
ip_address INET
user_agent
request_id
created_at
```

Không lưu password/token/secret trong before/after.

### `accounting_periods` — Phase 2

```text
organization_id
name
period_type
start_date
end_date
status
locked_at
locked_by
unlock_reason
created_at
updated_at
```

Khi `LOCKED`, backend phải chặn action làm thay đổi số liệu thuộc kỳ.

---

## 17. Index quan trọng

Nguồn đề xuất:

```sql
CREATE INDEX idx_dossiers_org_status
ON dossiers (organization_id, status);

CREATE INDEX idx_dossiers_org_sales_period
ON dossiers (organization_id, sales_user_id, revenue_recognition_date);

CREATE INDEX idx_cost_lines_supplier
ON estimate_cost_lines (organization_id, supplier_id);

CREATE INDEX idx_tasks_assignee_status_due
ON tasks (organization_id, assigned_to, status, due_at);

CREATE INDEX idx_approvals_reviewer_status
ON approval_requests (organization_id, reviewer_user_id, status);

CREATE INDEX idx_audit_entity_time
ON audit_logs (organization_id, entity_type, entity_id, created_at);

CREATE INDEX idx_conversations_org_last_msg
ON conversations (organization_id, last_message_at DESC);

CREATE INDEX idx_conv_participants_user
ON conversation_participants (organization_id, user_id, conversation_id);

CREATE INDEX idx_messages_conv_created
ON messages (conversation_id, created_at DESC);
```

Index thực tế phải được kiểm tra lại theo query plan khi có dữ liệu thật.

---

## 18. Transaction bắt buộc

Các operation nhiều bảng:

- confirm import;
- tạo dossier + estimate + lines;
- approve;
- cập nhật payment/chứng từ;
- lock/unlock accounting period.

TypeORM:

```ts
await dataSource.transaction(async (manager) => {
  // multiple writes
});
```

---

## 19. TypeORM rules

Production:

```ts
synchronize: false
```

Schema thay đổi bằng migration.

Cấu trúc:

```text
backend/src/database/
├── data-source.ts
├── migrations/
├── seeds/
└── subscribers/
```

Entities đặt theo module.

Ví dụ:

```text
modules/dossiers/entities/dossier.entity.ts
modules/estimates/entities/estimate.entity.ts
modules/customers/entities/customer.entity.ts
```

---

## 20. Danh sách bảng Phase 1–2

### Phase 1

```text
organizations
organization_settings
departments
users
roles
permissions
user_roles
role_permissions
customers
customer_contacts
supplier_types
suppliers
business_lines
market_types
service_categories
passenger_types
units
dossiers
dossier_passengers
estimates
estimate_revenue_lines
estimate_cost_lines
import_templates
import_sessions
import_rows
import_errors
approval_requests
workflow_history
document_types
documents
comments
conversations
conversation_participants
messages
message_attachments
kpi_targets
notifications
audit_logs
```

### Phase 2

```text
document_versions
tasks
task_checklist_items
payments
kpi_results
accounting_periods
```

Một số feature Phase 2 có thể yêu cầu mở rộng workflow config và partner data khi scope được khóa.

---

## 21. Tài liệu liên quan

- [Architecture](../architecture/README.md)
- [API](../api/README.md)
- [Business Flow](../business-flow/README.md)
- [Deployment](../deployment/README.md)
