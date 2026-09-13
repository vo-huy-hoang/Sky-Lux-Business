# API-CUSTOMER-006-GET-api-customers-id-activities

## 1. Tổng quan

| Trường | Giá trị |
| --- | --- |
| Task ID | Sky-Lux-031 |
| Module | API Customers (MOD-CUSTOMER) |
| Method | GET |
| Endpoint | `/api/customers/:id/activities` |
| Mục tiêu | Hiển thị lịch sử hoạt động đã được ghi nhận của một khách hàng |

API này phục vụ timeline “Hoạt động gần đây” ở màn hình chi tiết khách hàng. Nội dung hiển thị cho người dùng cuối nằm ở `title` và `description`; frontend không tự suy diễn hoặc tạo dữ liệu mẫu.

## 2. Authorization và tenant scope

- Yêu cầu JWT access token hợp lệ.
- Permission: `customer.manage` (permission đang được dùng cho các API khách hàng hiện tại).
- `organizationId` luôn lấy từ authenticated user, không nhận từ query hoặc request body.
- Chỉ trả hoạt động thuộc đồng thời `organizationId` của user và `customerId` trên URL.
- Khách hàng không tồn tại trong tổ chức hiện tại trả về `404`, không làm lộ dữ liệu tenant khác.

## 3. Query parameters

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
| --- | --- | --- | --- | --- |
| `page` | number | Không | `1` | Trang hiện tại, từ 1 |
| `limit` | number | Không | `20` | Số dòng mỗi trang, tối đa 100 |
| `type` | enum | Không | - | `CALL`, `QUOTE_SENT`, `CUSTOMER_RESPONSE`, `BROCHURE_SENT`, `NOTE`, hoặc event hệ thống |
| `from` | ISO 8601 | Không | - | Thời điểm bắt đầu lọc theo `occurredAt` |
| `to` | ISO 8601 | Không | - | Thời điểm kết thúc lọc theo `occurredAt` |

Kết quả được sắp xếp theo `occurredAt DESC`, sau đó `createdAt DESC`.

## 4. Response

```json
{
  "data": [
    {
      "id": "4aa2adf0-9e5a-4f35-bc2e-2dfb96f1cb7a",
      "customerId": "2bb2adf0-9e5a-4f35-bc2e-2dfb96f1cb7a",
      "type": "CALL",
      "title": "Gọi điện chăm sóc khách hàng",
      "description": "Trao đổi nhu cầu chương trình team building Q3",
      "occurredAt": "2026-09-13T03:15:00.000Z",
      "actorUserId": "3cc2adf0-9e5a-4f35-bc2e-2dfb96f1cb7a",
      "actor": {
        "id": "3cc2adf0-9e5a-4f35-bc2e-2dfb96f1cb7a",
        "fullName": "Nguyễn Thu Hà",
        "email": "ha@skylux.vn",
        "avatarUrl": null
      },
      "metadata": {},
      "createdAt": "2026-09-13T03:16:00.000Z",
      "updatedAt": "2026-09-13T03:16:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Không có hoạt động trả về `data: []` và metadata phân trang hợp lệ. API không trả dữ liệu hardcode và không tự tạo activity khi người dùng chỉ mở màn hình.

## 5. Database và business flow

- Bảng lưu trữ: `customer_activities`.
- `title` và `description` là nội dung nghiệp vụ được lưu trong database để người dùng không phải đọc mã kỹ thuật.
- `type` là mã ổn định phục vụ lọc và chọn icon; frontend chỉ dùng nó để trình bày, không dùng nó thay cho mô tả.
- `occurredAt` là thời điểm nghiệp vụ thực sự xảy ra, khác với `createdAt` là thời điểm bản ghi được lưu.
- `actorUserId` có thể null khi hoạt động do hệ thống ghi nhận; thông tin actor được trả ở dạng public, không lộ password/token.
- `metadata` dành cho dữ liệu bổ sung có cấu trúc và không được dùng để chứa secret, token hoặc thông tin xác thực.

Các loại hoạt động nghiệp vụ được hỗ trợ: cuộc gọi, gửi báo giá, phản hồi của khách hàng, gửi brochure, ghi chú; ngoài ra có các event tạo/sửa/xóa khách hàng và tạo/sửa hồ sơ để các luồng nghiệp vụ có thể ghi nhận thống nhất.

## 6. Error handling

- `400`: UUID, phân trang, enum hoặc thời gian không hợp lệ.
- `401`: thiếu hoặc sai JWT.
- `403`: không có `customer.manage`.
- `404`: khách hàng không tồn tại hoặc không thuộc tổ chức hiện tại.

## 7. Ví dụ gọi API

```http
GET /api/customers/2bb2adf0-9e5a-4f35-bc2e-2dfb96f1cb7a/activities?page=1&limit=20&type=CALL
Authorization: Bearer <access-token>
```

## 8. Triển khai database

Sau khi deploy code, chạy migration backend:

```bash
npm run migration:run
```

Migration: `1787939000008-CreateCustomerActivities.ts`.
