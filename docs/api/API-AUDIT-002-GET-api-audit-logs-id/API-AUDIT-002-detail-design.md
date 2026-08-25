# API-AUDIT-002-GET-api-audit-logs-id Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-160 |
| Level 0 | Lap trinh Backend API (Tasks, Finance, KPI & Ops) |
| Level 1 | API Audit Log (MOD-AUDIT) |
| Level 2 | API-AUDIT-002-GET-api-audit-logs-id |
| Method | GET |
| Endpoint | `/api/audit-logs/:id` |
| Phase | Phase 1 |
| Mục tiêu | Chi tiet audit log |
| Nguồn | `outputs/sky_lux_api_tasks/sky_lux_api_tasks.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Có, yêu cầu JWT access token hợp lệ.
- Permission đề xuất: `audit.view hoặc admin/ceo scope`
- Tenant scope: Backend lấy `organizationId` từ authenticated context, không nhận scope quyết định từ client.
- Role scope gợi ý: Sales chỉ xem dữ liệu own/team theo permission; Operator xem assigned/team; CEO/Admin xem all theo permission.

## 3. Redis Cache

- Chính sách: Có thể dùng Redis cache nếu endpoint có traffic cao; mặc định ưu tiên query có phân trang.
- Cache key đề xuất: `skylux:audit::api:audit-logs:id:org:{organizationId}:user:{userId}:hash:{queryHash}`
- TTL đề xuất: `30s`
- Invalidation: Thường để TTL ngắn; không cần invalidation thủ công.
- Lưu ý: cache key phải bao gồm tenant, user scope và hash của query/filter để tránh rò dữ liệu giữa user/organization.

## 4. DTO & Data Models

### 4.1 Path Params DTO

Tên DTO: `AuditLogParamsDto`

- `id: string`

### 4.2 Query DTO

Tên DTO: `AuditLogQueryDto`

- `actorUserId?: string`
- `action?: string`
- `entityType?: string`
- `entityId?: string`
- `from?: string`
- `to?: string`
- `requestId?: string`

### 4.3 Request Body DTO

Tên DTO: `N/A`

- Không có.

### 4.4 Response DTO

Tên DTO: `AuditLogResponseDto`

```json
{
  "data": {
    "id": "uuid",
    "code": "string",
    "status": "ACTIVE",
    "createdAt": "2026-08-24T00:00:00.000Z",
    "updatedAt": "2026-08-24T00:00:00.000Z"
  },
  "meta": {}
}
```

### 4.5 Data Model liên quan

- Entity/aggregate chính: `AuditLog`
- Các field hệ thống nên có: `id`, `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`.
- Không expose field nhạy cảm như password hash, refresh token hash, private storage key hoặc internal cost rule nếu user không có permission.

## 5. Validation & Business Rules

- Không tin dữ liệu `organizationId` từ client; tenant lấy từ authenticated context.
- Không trả TypeORM Entity trực tiếp sang frontend.
- Response dùng format thống nhất `{ data, meta }`.
- Path param phải là UUID hợp lệ hoặc slug/code hợp lệ theo business rule.
- Audit log không có API delete cho user thông thường.

## 6. Service Flow

- Controller nhận request và bind DTO.
- Guard xác thực JWT, tenant context và permission.
- Validate path/query/body bằng DTO validator.
- Service áp dụng tenant scope, filter, pagination và cache policy.
- Repository truy vấn dữ liệu cần thiết, tránh trả TypeORM Entity trực tiếp.
- Mapper chuẩn hóa response `{ data, meta }`.

## 7. Error Handling

- 200 OK
- 400 Bad Request: input không hợp lệ.
- 401 Unauthorized: thiếu hoặc sai access token.
- 403 Forbidden: không đủ permission hoặc sai tenant scope.
- 404 Not Found: resource không tồn tại hoặc không thuộc tenant.
- 409 Conflict: trùng dữ liệu, trạng thái không hợp lệ, hoặc optimistic lock.
- 500 Internal Server Error: lỗi ngoài dự kiến.

Error response chuẩn:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "message": "Dữ liệu không hợp lệ",
  "details": []
}
```

## 8. Audit Log & Observability

- Ghi audit log cho thao tác tạo/sửa/xóa/lock/approve/export hoặc thay đổi dữ liệu tài chính.
- Log tối thiểu: `requestId`, `organizationId`, `actorUserId`, `method`, `endpoint`, `entityType`, `entityId`, `statusCode`, `durationMs`.
- Không log password, token, signed URL đầy đủ, file private URL hoặc dữ liệu nhạy cảm.
- Với endpoint đọc nhiều dữ liệu, track cache hit/miss và slow query.

## 9. Test Checklist

- Unit test DTO validation: required field, enum, UUID, pagination limit.
- Unit test permission guard và tenant scope.
- Service test happy path và business rule conflict.
- E2E test response format `{ data, meta }`.
- E2E test 401/403/404.
- Cache test: cache hit, cache miss và invalidation nếu endpoint dùng Redis.

## 10. Ghi chú triển khai

- Controller chỉ xử lý HTTP boundary; logic nghiệp vụ đặt trong service.
- DTO request/response cần xuất Swagger/OpenAPI để FE/BE review.
- Nếu endpoint chưa có rule chi tiết trong docs gốc, đánh dấu TODO trong issue/task trước khi code production.
