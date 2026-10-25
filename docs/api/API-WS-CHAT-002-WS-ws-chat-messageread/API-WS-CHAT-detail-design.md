# API-WS-CHAT-002: Realtime Message Read Receipt Contract

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Đánh dấu đã đọc tin nhắn được thực hiện qua HTTP REST endpoint `POST /api/conversations/:id/read`. Sự kiện cập nhật trạng thái đọc sau đó được phát tới các thành viên cuộc hội thoại qua luồng SSE `GET /api/conversations/stream?token={streamToken}`.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-119 |
| Module | Chat & Messaging (MOD-PARTICIPANT) |
| Action | Đánh dấu đã đọc tin nhắn |
| Client Inbound Method | `POST` |
| Client Inbound Endpoint | `/api/conversations/:id/read` |
| Realtime Outbound Stream | SSE `GET /api/conversations/stream?token={streamToken}` |
| Realtime Event Name | `message.read` |

---

## 2. Authorization & Ranh giới Bảo mật

- **Authentication**: Yêu cầu JWT Bearer Token trong Header.
- **Tenant Scope**: `organizationId` lấy từ authenticated context.
- **Member Validation**: Người dùng phải là thành viên hợp lệ của cuộc hội thoại.

---

## 3. DTO & Data Contracts

### 3.1 Path Parameters
- `id`: UUID của cuộc hội thoại.

### 3.2 Request Body DTO (`MarkReadDto`)
```json
{
  "lastReadMessageId": "7b134d10-8b01-4475-8473-b65ff7f32402"
}
```

### 3.3 HTTP Response (200 OK)
```json
{
  "success": true,
  "conversationId": "488fb986-e5b1-4f74-8843-f1c5040eec5d",
  "userId": "5c0df3b7-789a-4e2b-bb68-8be42f210ea1",
  "lastReadMessageId": "7b134d10-8b01-4475-8473-b65ff7f32402",
  "readAt": "2026-10-26T00:00:00.000Z"
}
```

### 3.4 Realtime SSE Payload (Broadcasted via Redis Pub/Sub)
```json
{
  "type": "message.read",
  "payload": {
    "conversationId": "488fb986-e5b1-4f74-8843-f1c5040eec5d",
    "userId": "5c0df3b7-789a-4e2b-bb68-8be42f210ea1",
    "lastReadMessageId": "7b134d10-8b01-4475-8473-b65ff7f32402"
  }
}
```
