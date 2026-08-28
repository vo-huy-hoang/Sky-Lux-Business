import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { chatService } from '@/services/chat.service';
import { CreateConversationPayload, Message, ChatEvent } from '@/types/chat';

const appendMessageToCache = (newMessage: Message) => (old?: Message[]) => {
  if (!old) return [newMessage];
  if (old.some((msg) => msg.id === newMessage.id)) return old;
  return [...old, newMessage];
};

const removeMessageFromCache = (messageId: string) => (old?: Message[]) => {
  if (!old) return [];
  return old.filter((msg) => msg.id !== messageId);
};

export const useConversations = () => {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.getConversations(),
  });
};

export const useConversationDetail = (id: string) => {
  return useQuery({
    queryKey: ['conversation-detail', id],
    queryFn: () => chatService.getConversationDetail(id),
    enabled: !!id,
  });
};

export const useConversationMessages = (id: string) => {
  return useQuery({
    queryKey: ['conversation-messages', id],
    queryFn: () => chatService.getConversationMessages(id),
    enabled: !!id,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateConversationPayload) =>
      chatService.createConversation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      chatService.sendMessage(conversationId, content),
    onSuccess: (newMessage) => {
      // Cập nhật nóng tin nhắn mới vào lịch sử chat trong cache
      queryClient.setQueryData<Message[]>(
        ['conversation-messages', conversationId],
        appendMessageToCache(newMessage),
      );
      // Invalidate danh sách hội thoại để sắp xếp lại theo tin nhắn mới nhất
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useDossierConversation = (dossierId: string) => {
  return useQuery({
    queryKey: ['dossier-conversation', dossierId],
    queryFn: () => chatService.getDossierConversation(dossierId),
    enabled: !!dossierId,
  });
};

export const useDeleteMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatService.deleteMessage(messageId),
    onSuccess: (_, messageId) => {
      // Cập nhật nóng: Xóa tin nhắn khỏi lịch sử chat trong cache
      queryClient.setQueryData<Message[]>(
        ['conversation-messages', conversationId],
        removeMessageFromCache(messageId),
      );
      // Invalidate danh sách để cập nhật tin nhắn cuối cùng (nếu tin bị xóa là tin mới nhất)
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

/**
 * Custom Hook lắng nghe tin nhắn thời gian thực qua Server-Sent Events (SSE)
 * tự động cập nhật cache của TanStack Query khi có tin mới hoặc tin bị xóa
 */
export const useChatRealtime = (conversationId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const token = Cookies.get('access_token');
    if (!token) return;

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    // Khởi tạo luồng kết nối EventSource nhận tin nhắn mới
    const eventSource = new EventSource(
      `${apiBaseUrl}/conversations/stream?token=${token}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const chatEvent = JSON.parse(event.data) as ChatEvent;

        if (chatEvent.type === 'message.created') {
          const newMessage = chatEvent.payload as Message;
          // Chỉ cập nhật cache tin nhắn nếu tin thuộc cuộc hội thoại hiện tại đang xem
          if (newMessage.conversationId === conversationId) {
            queryClient.setQueryData<Message[]>(
              ['conversation-messages', conversationId],
              appendMessageToCache(newMessage),
            );
          }
        } else if (chatEvent.type === 'message.deleted') {
          const { id, conversationId: msgConversationId } = chatEvent.payload;
          // Xóa tin nhắn khỏi cache nếu thuộc cuộc hội thoại hiện tại đang xem
          if (msgConversationId === conversationId) {
            queryClient.setQueryData<Message[]>(
              ['conversation-messages', conversationId],
              removeMessageFromCache(id),
            );
          }
        }

        // Invalidate danh sách để float hội thoại có hoạt động mới lên trên cùng
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } catch (err) {
        console.error('Lỗi phân giải tin nhắn SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Lỗi kết nối SSE stream:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [conversationId, queryClient]);
};
