# API-DOCUMENT-001-GET-api-dossiers-id-documents Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-080 |
| Level 0 | Lap trinh Backend API (Documents & Communication) |
| Level 1 | API Documents (MOD-DOCUMENT) |
| Level 2 | API-DOCUMENT-001-GET-api-dossiers-id-documents |
| Method | GET |
| Endpoint | `/api/dossiers/:id/documents` |
| Phase | Phase 1 |
| Mục tiêu | Danh sach tai lieu cua ho so |
| Nguồn | `sky_lux_api_tasks_phase_sorted.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Có, yêu cầu JWT access token hợp lệ.
- Permission đề xuất: `dossier.view.own/team/all`
- Tenant scope: Backend lấy `organizationId` từ authenticated context, không nhận scope quyết định từ client.
- Role scope gợi ý: Sales chỉ xem dữ liệu own/team theo permission; Operator xem assigned/team; CEO/Admin xem all theo permission.

## 3. Redis Cache

- Chính sách: Có thể dùng Redis cache nếu endpoint có traffic cao; mặc định ưu tiên query có phân trang.
- Cache key đề xuất: `skylux:dossiers::api:dossiers:id:documents:org:{organizationId}:user:{userId}:hash:{queryHash}`
- TTL đề xuất: `60s`
- Invalidation: Khi dossier/import/estimate/workflow/document/comment thay đổi.
- Lưu ý: cache key phải bao gồm tenant, user scope và hash của query/filter để tránh rò dữ liệu giữa user/organization.

## 4. DTO & Data Models

### 4.1 Path Params DTO

Tên DTO: `DossierParamsDto`

- `id: string`

### 4.2 Query DTO

Tên DTO: `QueryDocumentDto`

- `page?: number`
- `limit?: number`
- `pageSize?: number`
- `search?: string`
- `documentTypeId?: string`

### 4.3 Request Body DTO

Tên DTO: `N/A`

- Không có.

### 4.4 Response DTO

Tên DTO: `PaginatedDocumentResponseDto`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    "items": [
      {
        "id": "uuid",
        "organizationId": "uuid",
        "dossierId": "uuid",
        "estimateId": "uuid",
        "documentTypeId": "uuid",
        "originalName": "passport.pdf",
        "mimeType": "application/pdf",
        "fileSize": 1024,
        "checksum": "md5",
        "versionNo": 1,
        "uploadedBy": "uuid",
        "uploader": {
          "id": "uuid",
          "fullName": "Nguyen Van A",
          "email": "a@skylux.vn",
          "avatarUrl": null
        },
        "documentType": {
          "id": "uuid",
          "code": "PASSPORT",
          "name": "Passport",
          "status": "ACTIVE"
        },
        "createdAt": "2026-08-24T00:00:00.000Z",
        "updatedAt": "2026-08-24T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "timestamp": "2026-08-24T00:00:00.000Z"
}
```

Không trả `objectKey`, signed URL hoặc thông tin nhạy cảm trong API danh sách.

Ví dụ sau khi FE unwrap response envelope:

```json
{
  "items": [
    {
      "id": "uuid",
      "originalName": "passport.pdf",
      "mimeType": "application/pdf",
      "fileSize": 1024,
      "versionNo": 1,
      "createdAt": "2026-08-24T00:00:00.000Z",
      "updatedAt": "2026-08-24T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### 4.5 Data Model liên quan

- Entity/aggregate chính: `Document`
- Các field hệ thống nên có: `id`, `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`.
- Không expose field nhạy cảm như password hash, refresh token hash, private storage key hoặc internal cost rule nếu user không có permission.

## 5. Validation & Business Rules

- Không tin dữ liệu `organizationId` từ client; tenant lấy từ authenticated context.
- Không trả TypeORM Entity trực tiếp sang frontend.
- Response dùng envelope thống nhất của backend; payload phân trang dùng `{ items, total, page, limit, totalPages }`.
- Path param phải là UUID hợp lệ hoặc slug/code hợp lệ theo business rule.
- Giới hạn `pageSize` mặc định 20, tối đa 100.

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
