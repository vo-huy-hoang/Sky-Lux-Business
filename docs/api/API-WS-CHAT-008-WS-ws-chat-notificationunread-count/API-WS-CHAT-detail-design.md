# API-WS-CHAT-008: Realtime Notification & Unread Count Stream

## 1. Tổng quan & Kiến trúc Thực thi

> **Architectural Transition Notice (Phase 2 Reality)**:  
> Cập nhật số lượng thông báo hoặc tin nhắn chưa đọc được phát qua các luồng SSE chuyên biệt:
> - Tin nhắn chat chưa đọc: `GET /api/conversations/stream?token={streamToken}` (event: `unread_count`).
> - Thông báo hệ thống thời gian thực: `GET /api/notifications/stream?token={streamToken}` (event: `notification` hoặc `unread_count`).

| Trường | Giá trị |
| :--- | :--- |
| Task ID | Sky-Lux-125 |
| Module | Notifications & Realtime (MOD-NOTIFICATION) |
| Action | Nhận số lượng tin nhắn / thông báo chưa đọc thời gian thực |
| Stream Protocol | HTTP Server-Sent Events (SSE) |
| Stream Endpoints | `GET /api/notifications/stream` & `GET /api/conversations/stream` |
| Event Name | `unread_count` |

---

## 2. Authentication & Ranh giới Bảo mật

- **Authentication**: `JwtQueryAuthGuard` yêu cầu token có claim `stream: true`.
- **Target Isolation**: Bộ lọc trong `chat.service.ts` và `notifications.service.ts` đảm bảo payload số lượng chưa đọc chỉ gửi tới đúng `userId` mục tiêu, tuyệt đối không phát tán cho user khác.

---

## 3. DTO & Data Contracts

### 3.1 SSE Inbound Event Payload
```text
event: message
data: {"type":"unread_count","payload":{"userId":"5c0df3b7-789a-4e2b-bb68-8be42f210ea1","unreadCount":5}}
```
