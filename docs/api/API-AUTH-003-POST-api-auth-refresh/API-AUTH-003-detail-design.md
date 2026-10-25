# API-AUTH-003-POST-api-auth-refresh Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-005 |
| Level 0 | Lap trinh Backend API (Core & Auth) |
| Level 1 | API Authentication (MOD-AUTH) |
| Level 2 | API-AUTH-003-POST-api-auth-refresh |
| Method | POST |
| Endpoint | `/api/auth/refresh` |
| Phase | Phase 1 |
| Mục tiêu | Lam moi token |
| Nguồn | `sky_lux_api_tasks_phase_sorted.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Không bắt buộc access token; bắt buộc refresh token hợp lệ.
- Permission đề xuất: `Không yêu cầu permission nghiệp vụ; validate refresh token/rotation là bắt buộc.`
- Tenant scope: Tenant lấy từ refresh token/token family sau khi validate, không nhận từ client.
- Role scope gợi ý: Role/permission chỉ được trả sau khi credential/token hợp lệ.

## 3. Redis Cache

- Chính sách: Không cache response. Có thể dùng Redis để quản lý refresh token rotation/reuse detection.
- Cache key đề xuất: `skylux:auth:refresh:{userId}:{tokenFamilyId}`
- TTL đề xuất: `Theo refresh token expiry.`
- Invalidation: Xóa token family khi logout hoặc phát hiện reuse.
- Lưu ý: cache key phải bao gồm tenant, user scope và hash của query/filter để tránh rò dữ liệu giữa user/organization.

## 4. DTO & Data Models

### 4.1 Path Params DTO

Tên DTO: `N/A`

- Không có.

### 4.2 Query DTO

Tên DTO: `N/A`

- Không có.

### 4.3 Request Body DTO

Tên DTO: `AuthSessionPostRequestDto`

- `refreshToken: string`

### 4.4 Response DTO

Tên DTO: `AuthSessionResponseDto`

```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "roles": ["SALES"],
      "permissions": ["dossier.view.own"]
    }
  },
  "meta": {}
}
```

### 4.5 Data Model liên quan

- Entity/aggregate chính: `AuthSession`
- Các field hệ thống nên có: `id`, `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`.
- Không expose field nhạy cảm như password hash, refresh token hash, private storage key hoặc internal cost rule nếu user không có permission.

## 5. Validation & Business Rules

- Không tin dữ liệu `organizationId` từ client; tenant lấy từ authenticated context.
- Không trả TypeORM Entity trực tiếp sang frontend.
- Response dùng format thống nhất `{ data, meta }`.
- Body DTO phải dùng whitelist/forbidNonWhitelisted để chặn field lạ.

## 6. Service Flow

- Controller nhận refresh token và bind DTO.
- Validate refresh token signature/expiry hoặc lookup token hash.
- Kiểm tra token family, reuse detection và trạng thái user.
- Rotate refresh token nếu dùng rotation.
- Sinh access token mới và trả response chuẩn.

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
