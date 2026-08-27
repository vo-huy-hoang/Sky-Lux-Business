# API-IMPORT-006-POST-api-imports-id-validate Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-063 |
| Level 0 | Lap trinh Backend API (Dossier, Import & Workflow) |
| Level 1 | API Import Excel (MOD-IMPORT) |
| Level 2 | API-IMPORT-006-POST-api-imports-id-validate |
| Method | POST |
| Endpoint | `/api/imports/:id/validate` |
| Phase | Phase 1 |
| Mục tiêu | Validate lai import |
| Nguồn | `sky_lux_api_tasks_phase_sorted.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Có, yêu cầu JWT access token hợp lệ.
- Permission đề xuất: `dossier.import`
- Tenant scope: Backend lấy `organizationId` từ authenticated context, không nhận scope quyết định từ client.
- Role scope gợi ý: Sales chỉ xem dữ liệu own/team theo permission; Operator xem assigned/team; CEO/Admin xem all theo permission.

## 3. Redis Cache

- Chính sách: Không cache response ghi dữ liệu.
- Cache key đề xuất: `N/A`
- TTL đề xuất: `N/A`
- Invalidation: Sau khi ghi thành công, xóa cache list/detail liên quan nếu có.
- Lưu ý: cache key phải bao gồm tenant, user scope và hash của query/filter để tránh rò dữ liệu giữa user/organization.

## 4. DTO & Data Models

### 4.1 Path Params DTO

Tên DTO: `ImportSessionParamsDto`

- `id: string`

### 4.2 Query DTO

Tên DTO: `N/A`

- Không có.

### 4.3 Request Body DTO

Tên DTO: `ImportSessionPostRequestDto`

- `comment?: string`

### 4.4 Response DTO

Tên DTO: `ImportSessionResponseDto`

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

- Entity/aggregate chính: `ImportSession`
- Các field hệ thống nên có: `id`, `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`.
- Không expose field nhạy cảm như password hash, refresh token hash, private storage key hoặc internal cost rule nếu user không có permission.

## 5. Validation & Business Rules

- Không tin dữ liệu `organizationId` từ client; tenant lấy từ authenticated context.
- Không trả TypeORM Entity trực tiếp sang frontend.
- Response dùng format thống nhất `{ data, meta }`.
- Path param phải là UUID hợp lệ hoặc slug/code hợp lệ theo business rule.
- Body DTO phải dùng whitelist/forbidNonWhitelisted để chặn field lạ.
- File import cần kiểm tra mime type, dung lượng, template version và số dòng tối đa.

## 6. Service Flow

- Controller nhận request và bind DTO.
- Guard xác thực JWT, tenant context và permission.
- Validate path/query/body bằng DTO validator.
- Service kiểm tra business rule và chạy transaction nếu ảnh hưởng nhiều bảng.
- Repository ghi dữ liệu, cập nhật audit fields.
- Ghi audit log, publish event nội bộ nếu cần, và invalidation cache liên quan.

## 7. Error Handling

- 201 Created
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
