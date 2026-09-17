import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { removeMessageFromCache } from './cache-reducers';
import {
  CreateConversationPayload,
  Message,
  AddParticipantsPayload,
  MarkReadPayload,
} from '@/types/chat';

/**
 * Hook tạo cuộc hội thoại mới (API-CHAT-002)
 */
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConversationPayload) =>
      chatService.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
};

export interface SendMessageParams {
  content: string;
  clientMessageId?: string;
}

/**
 * Hook gửi tin nhắn với Optimistic UI 0ms, chống gửi trùng qua clientMessageId (Idempotency Key),
 * lưu tin lỗi vào Zustand Dead-letter queue và Reconcile tại chỗ (Replace-in-place)
 */
export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  const addFailedMessage = useChatUIStore((state) => state.addFailedMessage);
  const removeFailedMessage = useChatUIStore((state) => state.removeFailedMessage);

  return useMutation<
    Message,
    Error,
    string | SendMessageParams,
    { previousMessages?: Message[]; tempId: string; clientMessageId: string }
  >({
    mutationFn: (variables) => {
      const content = typeof variables === 'string' ? variables : variables.content;
      const clientMessageId =
        (typeof variables !== 'string' && variables.clientMessageId) ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      if (typeof variables !== 'string') {
        variables.clientMessageId = clientMessageId;
      }
      return chatService.sendMessage(conversationId, content, clientMessageId);
    },
    onMutate: async (variables) => {
      const content = typeof variables === 'string' ? variables : variables.content;
      const clientMessageId =
        (typeof variables !== 'string' && variables.clientMessageId) ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      if (typeof variables !== 'string') {
        variables.clientMessageId = clientMessageId;
      }

      // 1. Cancel bất kỳ refetch nào đang chạy để tránh đè lên bản ghi optimistic
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.messages(conversationId) });

      // 2. Chụp snapshot cache hiện tại
      const previousMessages = queryClient.getQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
      );

      const currentUser = useAuthStore.getState().user;
      const tempId = `temp-${clientMessageId}`;

      const optimisticMessage: Message = {
        id: tempId,
        clientMessageId,
        organizationId: currentUser?.organizationId || '',
        conversationId,
        senderId: currentUser?.id || '',
        content,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser?.id || '',
          fullName: currentUser?.fullName || 'Tôi',
          email: currentUser?.email || '',
          employeeCode: currentUser?.employeeCode || '',
        },
        status: 'sending',
      };

      // 3. Đưa tin nhắn vào cache ngay lập tức (0ms delay)
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        (old = []) => [...old, optimisticMessage],
      );

      return { previousMessages, tempId, clientMessageId };
    },
    onError: (_err, variables, context) => {
      const content = typeof variables === 'string' ? variables : variables.content;
      if (context?.clientMessageId) {
        // Lưu vào hàng đợi tin lỗi trong Zustand
        addFailedMessage({
          clientMessageId: context.clientMessageId,
          conversationId,
          content,
          failedAt: Date.now(),
        });

        // Đổi trạng thái tin nhắn trong cache sang 'failed'
        queryClient.setQueryData<Message[]>(
          queryKeys.chat.messages(conversationId),
          (old = []) =>
            old.map((msg) =>
              msg.id === context.tempId || msg.clientMessageId === context.clientMessageId
                ? { ...msg, status: 'failed' }
                : msg,
            ),
        );
      }
    },
    onSuccess: (savedMessage, _variables, context) => {
      if (context?.clientMessageId) {
        removeFailedMessage(context.clientMessageId);
      }

      // 4. Reconcile: Thay thế tin nhắn tạm bằng tin nhắn chính thức từ server (Replace-in-place chống nhảy thứ tự)
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        (old = []) => {
          const exists = old.some(
            (msg) =>
              msg.id === savedMessage.id ||
              (context?.tempId && msg.id === context.tempId) ||
              (context?.clientMessageId && msg.clientMessageId === context.clientMessageId),
          );

          if (exists) {
            return old.map((msg) =>
              msg.id === savedMessage.id ||
              (context?.tempId && msg.id === context.tempId) ||
              (context?.clientMessageId && msg.clientMessageId === context.clientMessageId)
                ? { ...savedMessage, status: 'sent' as const }
                : msg,
            );
          }

          return [...old, { ...savedMessage, status: 'sent' as const }];
        },
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
};

/**
 * Hook xóa tin nhắn khỏi cuộc hội thoại và cập nhật nóng cache
 */
export const useDeleteMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Cập nhật nóng: Xóa tin nhắn khỏi lịch sử chat trong cache
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        removeMessageFromCache(messageId),
      );
      // Invalidate danh sách để cập nhật tin nhắn cuối cùng (nếu tin bị xóa là tin mới nhất)
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
};

/**
 * Hook đánh dấu đã đọc tin nhắn trong cuộc hội thoại (API-PARTICIPANT-001)
 */
export const useMarkMessageRead = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: MarkReadPayload) =>
      chatService.markAsRead(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.participants(conversationId),
      });
    },
  });
};

/**
 * Hook thêm thành viên vào cuộc hội thoại nhóm (API-PARTICIPANT-003)
 */
export const useAddParticipants = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddParticipantsPayload) =>
      chatService.addParticipants(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.participants(conversationId),
      });
    },
  });
};

/**
 * Hook xóa thành viên hoặc rời khỏi cuộc hội thoại nhóm (API-PARTICIPANT-004)
 */
export const useRemoveParticipant = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      chatService.removeParticipant(conversationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.participants(conversationId),
      });
    },
  });
};

/**
 * Hook báo hiệu bắt đầu gõ phím (API-CHAT-005)
 */
export const useStartTyping = (conversationId: string) => {
  return useMutation({
    mutationFn: () => chatService.startTyping(conversationId),
  });
};

/**
 * Hook báo hiệu dừng gõ phím (API-CHAT-006)
 */
export const useStopTyping = (conversationId: string) => {
  return useMutation({
    mutationFn: () => chatService.stopTyping(conversationId),
  });
};
