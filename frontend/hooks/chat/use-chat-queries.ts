import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { queryKeys } from '@/lib/query-keys';

/**
 * Hook lấy danh sách các cuộc hội thoại của người dùng (API-CHAT-001)
 */
export const useConversations = () => {
  return useQuery({
    queryKey: queryKeys.chat.conversations(),
    queryFn: ({ signal }) => chatService.getConversations({ signal }),
  });
};

/**
 * Hook lấy thông tin chi tiết của một cuộc hội thoại (API-CHAT-003)
 */
export const useConversationDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: ({ signal }) => chatService.getConversationDetail(id, { signal }),
    enabled: !!id,
  });
};

/**
 * Hook lấy lịch sử tin nhắn của một cuộc hội thoại
 */
export const useConversationMessages = (id: string) => {
  return useQuery({
    queryKey: queryKeys.chat.messages(id),
    queryFn: ({ signal }) => chatService.getConversationMessages(id, { signal }),
    enabled: !!id,
  });
};

/**
 * Hook lấy cuộc hội thoại liên kết với một hồ sơ tour (API-CHAT-004)
 */
export const useDossierConversation = (dossierId: string) => {
  return useQuery({
    queryKey: queryKeys.chat.dossierConversation(dossierId),
    queryFn: ({ signal }) => chatService.getDossierConversation(dossierId, { signal }),
    enabled: !!dossierId,
  });
};

/**
 * Hook lấy danh sách thành viên trong cuộc hội thoại (API-PARTICIPANT-002)
 */
export const useConversationParticipants = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.chat.participants(conversationId),
    queryFn: ({ signal }) => chatService.getParticipants(conversationId, { signal }),
    enabled: !!conversationId,
  });
};
