# API-WS-CHAT-003: Realtime Typing Start Signal Contract

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Tín hiệu bắt đầu gõ phím được gửi qua HTTP REST endpoint `POST /api/conversations/:id/typing/start`. Sự kiện được phân phối qua Redis Pub/Sub và đẩy tới các thành viên khác trong cuộc hội thoại qua SSE stream `GET /api/conversations/stream?token={streamToken}`.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-120 |
| Module | Chat & Messaging (MOD-WS-CHAT) |
| Action | Báo hiệu bắt đầu gõ phím |
| Client Inbound Method | `POST` |
| Client Inbound Endpoint | `/api/conversations/:id/typing/start` |
| Realtime Outbound Stream | SSE `GET /api/conversations/stream?token={streamToken}` |
| Realtime Event Name | `typing.start` |

---

## 2. Authorization & Ranh giới Bảo mật

- **Authentication**: Yêu cầu JWT Bearer Token trong Header.
- **Tenant Scope**: `organizationId` lấy từ authenticated context.
- **Member Validation**: Kiểm tra quyền thành viên trong cuộc hội thoại.

---

## 3. DTO & Data Contracts

### 3.1 Path Parameters
- `id`: UUID của cuộc hội thoại.

### 3.2 Request Body DTO
- Không yêu cầu body (`Empty`).

### 3.3 HTTP Response (200 OK)
- Trả về status `200 OK` (hoặc rỗng).

### 3.4 Realtime SSE Payload (Broadcasted via Redis Pub/Sub)
```json
{
  "type": "typing.start",
  "payload": {
    "conversationId": "488fb986-e5b1-4f74-8843-f1c5040eec5d",
    "userId": "5c0df3b7-789a-4e2b-bb68-8be42f210ea1"
  }
}
```
