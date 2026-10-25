# API-WS-CHAT-005: Realtime Inbound Message Delivery Stream

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Thay vì client lắng nghe qua kênh WebSocket 2 chiều, client thiết lập một kết nối Server-Sent Events (SSE) theo chuẩn W3C EventSource tới `GET /api/conversations/stream?token={streamToken}`. Khi có tin nhắn mới trong bất kỳ cuộc hội thoại nào mà user tham gia, backend đẩy sự kiện theo thời gian thực.

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-122 |
| Module | Chat & Messaging (MOD-WS-CHAT) |
| Action | Nhận tin nhắn mới thời gian thực |
| Stream Protocol | HTTP Server-Sent Events (SSE) |
| Stream Endpoint | `GET /api/conversations/stream?token={streamToken}` |
| Message Event Name | `message.created` |
| Token Prerequisite | `POST /api/auth/stream-token` |

---

## 2. Authentication & Guard Seam

- **SSE Stream Auth Guard**: [JwtQueryAuthGuard](file:///d:/Sky-Lux-Business/backend/src/common/guards/jwt-query-auth.guard.ts) xác thực query parameter `token`.
- **Ranh giới an toàn**: Token trong URL query bắt buộc phải mang claim `stream === true` (được cấp bởi `POST /api/auth/stream-token` với thời hạn ngắn 120 giây). Token đăng nhập thông thường không được phép truyền qua query URL để ngăn rò rỉ vào log server.
- **Tenant Scope & Membership**: Backend chỉ đẩy các tin nhắn thuộc cuộc hội thoại mà user là thành viên trong cùng `organizationId`.

---

## 3. DTO & Data Contracts

### 3.1 EventSource Stream Connection
```http
GET /api/conversations/stream?token=eyJhbGciOiJIUzI1NiIsInR5cCI... HTTP/1.1
Host: app.skylux.vn
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 3.2 SSE Inbound Event Payload
```text
event: message
data: {"type":"message.created","payload":{"id":"7b134d10-8b01-4475-8473-b65ff7f32402","conversationId":"488fb986-e5b1-4f74-8843-f1c5040eec5d","senderId":"5c0df3b7-789a-4e2b-bb68-8be42f210ea1","content":"Báo giá tour đã được phê duyệt","attachments":[],"createdAt":"2026-10-26T00:00:00.000Z"}}
```
