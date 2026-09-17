/**
 * TICKET-39.2: Selective Re-export Proxy cho hệ thống Chat Sub-hooks
 * Tối ưu hóa Tree-shaking cho Next.js Turbopack và bảo đảm 100% Backward Compatibility
 * cho tất cả các file đang import từ '@/hooks/chat'.
 *
 * Các module chuyên biệt:
 * - ./chat/use-chat-queries: Quản lý các truy vấn GET TanStack Query
 * - ./chat/use-chat-mutations: Quản lý các mutation gửi/xóa tin, typing, participants
 * - ./chat/use-chat-realtime: Quản lý luồng SSE thời gian thực và typing indicators
 * - ./chat/cache-reducers: Các pure reducers cập nhật cache TanStack Query
 */

export {
  useConversations,
  useConversationDetail,
  useConversationMessages,
  useDossierConversation,
  useConversationParticipants,
} from './chat/use-chat-queries';

export {
  useCreateConversation,
  useSendMessage,
  useDeleteMessage,
  useMarkMessageRead,
  useMarkMessageRead as useMarkAsRead,
  useAddParticipants,
  useRemoveParticipant,
  useStartTyping,
  useStopTyping,
} from './chat/use-chat-mutations';
export type { SendMessageParams } from './chat/use-chat-mutations';

export {
  useChatRealtime,
  useTypingUsers,
} from './chat/use-chat-realtime';
export type { UseChatRealtimeOptions } from './chat/use-chat-realtime';

export {
  appendMessageToCache,
  removeMessageFromCache,
} from './chat/cache-reducers';

export { calculateBackoffWithJitter } from '@/lib/backoff';
