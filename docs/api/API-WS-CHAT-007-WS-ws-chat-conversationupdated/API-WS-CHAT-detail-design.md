# API-WS-CHAT-007: Realtime Conversation Metadata Update Stream

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Các sự kiện thay đổi cuộc hội thoại (đổi tên nhóm, thêm/xóa thành viên, gán hồ sơ tour mới) được phát qua luồng SSE `GET /api/conversations/stream?token={streamToken}`.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-124 |
| Module | Chat & Messaging (MOD-WS-CHAT) |
| Action | Nhận thông tin cập nhật hội thoại thời gian thực |
| Stream Protocol | HTTP Server-Sent Events (SSE) |
| Stream Endpoint | `GET /api/conversations/stream?token={streamToken}` |
| Event Name | `conversation.updated` |

---

## 2. Authentication & Ranh giới Bảo mật

- **Authentication**: `JwtQueryAuthGuard` với `token` mang claim `stream: true`.
- **Tenant Scope**: Chỉ gửi cho các thành viên thuộc cuộc hội thoại trong cùng `organizationId`.

---

## 3. DTO & Data Contracts

### 3.1 SSE Inbound Event Payload
```text
event: message
data: {"type":"conversation.updated","payload":{"id":"488fb986-e5b1-4f74-8843-f1c5040eec5d","name":"Nhóm Điều Hành Tour Đà Lạt 4N3Đ","updatedAt":"2026-10-26T00:00:00.000Z"}}
```
