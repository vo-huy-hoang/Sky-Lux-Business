# API-WS-CHAT-001: Realtime Message Dispatch Contract

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Thiết kế ban đầu trong spreadsheet dự kiến cổng WebSocket (`/ws/chat`). Trong kiến trúc sản xuất thực tế, hệ thống đã chuyển sang chuẩn **HTTP POST + Server-Sent Events (SSE) backed by Redis Pub/Sub**:
> - **Gửi tin nhắn**: Thực hiện qua HTTP REST endpoint `POST /api/conversations/:id/messages`.
> - **Phát tin nhắn thời gian thực**: Backend publish sự kiện `message.created` lên Redis Pub/Sub và đẩy tới các client đang kết nối SSE stream qua `GET /api/conversations/stream?token={streamToken}`.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-118 |
| Module | Chat & Messaging (MOD-CHAT) |
| Action | Gửi tin nhắn và phát realtime |
| Client Inbound Method | `POST` |
| Client Inbound Endpoint | `/api/conversations/:id/messages` |
| Realtime Outbound Stream | SSE `GET /api/conversations/stream?token={streamToken}` |
| Realtime Event Name | `message.created` (hoặc `new_message`) |

---

## 2. Authorization & Ranh giới Bảo mật

- **Authentication**: Yêu cầu JWT Bearer Token trong Header (`Authorization: Bearer <token>`).
- **Permission**: `chat.access` (hoặc là thành viên thuộc cuộc hội thoại).
- **Tenant Scope**: Bắt buộc `organizationId` lấy từ `@CurrentUser()`, cấm truyền chéo tenant.
- **Member Validation**: Kiểm tra người gửi có phải là thành viên hợp lệ của cuộc hội thoại trong cơ sở dữ liệu (`conversation_members`).

---

## 3. DTO & Data Contracts

### 3.1 Path Parameters
- `id`: UUID của cuộc hội thoại (`Conversation.id`).

### 3.2 Request Body DTO (`SendMessageDto`)
```json
{
  "content": "Xin chào, cập nhật chi phí dịch vụ tour Hà Nội - Sa Pa",
  "clientMessageId": "msg-client-uuid-1234",
  "attachments": [
    {
      "url": "/uploads/chat/attachments/contract.pdf",
      "filename": "contract.pdf",
      "size": 1048576,
      "mimetype": "application/pdf"
    }
  ]
}
```

### 3.3 HTTP Response (201 Created)
```json
{
  "id": "7b134d10-8b01-4475-8473-b65ff7f32402",
  "conversationId": "488fb986-e5b1-4f74-8843-f1c5040eec5d",
  "senderId": "5c0df3b7-789a-4e2b-bb68-8be42f210ea1",
  "content": "Xin chào, cập nhật chi phí dịch vụ tour Hà Nội - Sa Pa",
  "attachments": [
    {
      "url": "/uploads/chat/attachments/contract.pdf",
      "filename": "contract.pdf",
      "size": 1048576,
      "mimetype": "application/pdf"
    }
  ],
  "createdAt": "2026-10-26T00:00:00.000Z"
}
```

### 3.4 Realtime SSE Payload (Broadcasted via Redis Pub/Sub)
```json
{
  "type": "message.created",
  "payload": {
    "id": "7b134d10-8b01-4475-8473-b65ff7f32402",
    "conversationId": "488fb986-e5b1-4f74-8843-f1c5040eec5d",
    "senderId": "5c0df3b7-789a-4e2b-bb68-8be42f210ea1",
    "content": "Xin chào, cập nhật chi phí dịch vụ tour Hà Nội - Sa Pa",
    "attachments": [...],
    "createdAt": "2026-10-26T00:00:00.000Z"
  }
}
```
