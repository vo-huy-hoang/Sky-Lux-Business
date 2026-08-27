# API-AUTH-001-POST-api-auth-login Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-003 |
| Level 0 | Lap trinh Backend API (Core & Auth) |
| Level 1 | API Authentication (MOD-AUTH) |
| Level 2 | API-AUTH-001-POST-api-auth-login |
| Method | POST |
| Endpoint | `/api/auth/login` |
| Phase | Phase 1 |
| Mục tiêu | Dang nhap |
| Nguồn | `sky_lux_api_tasks_phase_sorted.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Không bắt buộc JWT; bắt buộc validate credential và rate-limit.
- Permission đề xuất: `Không yêu cầu permission nghiệp vụ; validate credential và rate-limit là bắt buộc.`
- Tenant scope: Không lấy `organizationId` từ client; nếu cần multi-tenant login thì xác định tenant từ subdomain/orgCode/email domain trước khi validate credential.
- Role scope gợi ý: Role/permission chỉ được trả sau khi credential/token hợp lệ.

## 3. Redis Cache

- Chính sách: Không cache response. Nên dùng Redis cho rate limit đăng nhập và đếm số lần sai mật khẩu theo IP/email.
- Cache key đề xuất: `skylux:auth:login-attempt:{ip}:{emailHash}`
- TTL đề xuất: `300s-900s`
- Invalidation: Reset bộ đếm khi đăng nhập thành công; tự hết hạn khi quá TTL.
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

- `email: string`
- `password: string`

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

- Controller nhận email/password và bind DTO.
- Validate body DTO và rate limit theo IP/email.
- Service tìm user theo email trong tenant/organization phù hợp.
- So sánh password bằng hash an toàn, không log password.
- Sinh access token/refresh token, lưu refresh token hash hoặc token family nếu dùng rotation.
- Trả thông tin user, roles, permissions theo format `{ data, meta }`.

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
