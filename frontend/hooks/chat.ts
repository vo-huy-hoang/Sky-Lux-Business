/**
 * Re-export Proxy cho hệ thống Chat Sub-hooks
 * Bảo đảm 100% Backward Compatibility cho tất cả các file đang import từ '@/hooks/chat'.
 * Các logic cốt lõi đã được phân rã thành các sub-modules chuyên biệt trong thư mục './chat/':
 * - cache-reducers.ts: Thuật toán pure reducer cho TanStack Query cache
 * - use-chat-queries.ts: Các hook truy vấn GET danh sách, chi tiết, lịch sử tin nhắn, thành viên
 * - use-chat-mutations.ts: Các hook gửi/xóa tin nhắn, typing, phân quyền thành viên
 * - use-chat-realtime.ts: Động cơ lắng nghe luồng SSE thời gian thực và quản lý phục hồi mạng
 */
export * from './chat/index';
