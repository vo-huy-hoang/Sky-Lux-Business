# API-WS-CHAT-006: Realtime Read Status Update Stream

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Khi một thành viên trong cuộc hội thoại đọc tin nhắn, sự kiện cập nhật trạng thái đã đọc được phát tới các thành viên khác qua kết nối SSE `GET /api/conversations/stream?token={streamToken}`.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-123 |
| Module | Chat & Messaging (MOD-WS-CHAT) |
| Action | Nhận trạng thái cập nhật đã đọc tin nhắn thời gian thực |
| Stream Protocol | HTTP Server-Sent Events (SSE) |
| Stream Endpoint | `GET /api/conversations/stream?token={streamToken}` |
| Event Name | `message.read` |

---

## 2. Authentication & Ranh giới Bảo mật

- **Authentication**: Xác thực qua `JwtQueryAuthGuard` với `token` mang claim `stream: true`.
- **Tenant Scope**: Chỉ phát sự kiện cho các thành viên trong cùng cuộc hội thoại thuộc `organizationId`.

---

## 3. DTO & Data Contracts

### 3.1 SSE Inbound Event Payload
```text
event: message
data: {"type":"message.read","payload":{"conversationId":"488fb986-e5b1-4f74-8843-f1c5040eec5d","userId":"5c0df3b7-789a-4e2b-bb68-8be42f210ea1","lastReadMessageId":"7b134d10-8b01-4475-8473-b65ff7f32402","readAt":"2026-10-26T00:00:00.000Z"}}
```
