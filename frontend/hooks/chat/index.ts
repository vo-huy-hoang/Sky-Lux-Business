/**
 * TICKET-39.2: Selective Re-export cho hệ thống Chat Sub-hooks trong internal module
 * Tối ưu hóa Tree-shaking Turbopack, loại bỏ hoàn toàn wildcard re-export
 */

export {
  appendMessageToCache,
  removeMessageFromCache,
} from './cache-reducers';

export {
  useConversations,
  useConversationDetail,
  useConversationMessages,
  useDossierConversation,
  useConversationParticipants,
} from './use-chat-queries';

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
} from './use-chat-mutations';
export type { SendMessageParams } from './use-chat-mutations';

export {
  useChatRealtime,
  useTypingUsers,
} from './use-chat-realtime';
export type { UseChatRealtimeOptions } from './use-chat-realtime';

export { calculateBackoffWithJitter } from '@/lib/backoff';
