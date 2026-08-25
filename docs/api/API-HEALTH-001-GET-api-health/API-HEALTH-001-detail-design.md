# API-HEALTH-001-GET-api-health Detail Design

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-162 |
| Level 0 | Lap trinh Backend API (Tasks, Finance, KPI & Ops) |
| Level 1 | API Health (MOD-HEALTH) |
| Level 2 | API-HEALTH-001-GET-api-health |
| Method | GET |
| Endpoint | `/api/health` |
| Phase | Phase 1 |
| Mục tiêu | Health check |
| Nguồn | `outputs/sky_lux_api_tasks/sky_lux_api_tasks.xlsx` |

> Tài liệu này được sinh từ file Excel API task. Nếu có khác biệt với code thực tế, ưu tiên review lại contract FE/BE trước khi khóa.

## 2. Authorization

- Cần xác thực: Không bắt buộc JWT nếu dùng cho monitoring/deployment check; không trả dữ liệu nhạy cảm.
- Permission đề xuất: `Không yêu cầu permission nghiệp vụ; chỉ trả trạng thái tổng quát, không expose thông tin hạ tầng nhạy cảm.`
- Tenant scope: Không áp dụng tenant scope.
- Role scope gợi ý: Không áp dụng role scope.

## 3. Redis Cache

- Chính sách: Không nên cache Redis cho endpoint này vì dữ liệu phiên/trạng thái thay đổi nhanh.
- Cache key đề xuất: `N/A`
- TTL đề xuất: `N/A`
- Invalidation: N/A
- Lưu ý: cache key phải bao gồm tenant, user scope và hash của query/filter để tránh rò dữ liệu giữa user/organization.

## 4. DTO & Data Models

### 4.1 Path Params DTO

Tên DTO: `N/A`

- Không có.

### 4.2 Query DTO

Tên DTO: `N/A`

- Không có.

### 4.3 Request Body DTO

Tên DTO: `N/A`

- Không có.

### 4.4 Response DTO

Tên DTO: `HealthStatusResponseDto`

```json
{
  "data": {
    "status": "ok",
    "database": "ok",
    "redis": "ok"
  },
  "meta": {}
}
```

### 4.5 Data Model liên quan

- Entity/aggregate chính: `HealthStatus`
- Các field hệ thống nên có: `id`, `organizationId`, `createdAt`, `updatedAt`, `createdById`, `updatedById`.
- Không expose field nhạy cảm như password hash, refresh token hash, private storage key hoặc internal cost rule nếu user không có permission.

## 5. Validation & Business Rules

- Không expose connection string, host nội bộ, secret hoặc version chi tiết.
- Health check phải nhẹ, có timeout ngắn và không tạo tải đáng kể lên database/Redis.
- Response dùng format thống nhất `{ data, meta }`.

## 6. Service Flow

- Controller gọi health service.
- Kiểm tra kết nối database ở mức nhẹ.
- Kiểm tra Redis ping nếu Redis là dependency bắt buộc.
- Trả trạng thái tổng hợp để phục vụ deployment/monitoring.

## 7. Error Handling

- 200 OK: dependency chính hoạt động.
- 503 Service Unavailable: database/redis hoặc dependency bắt buộc không sẵn sàng.
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
