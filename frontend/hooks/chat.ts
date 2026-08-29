import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { chatService } from '@/services/chat.service';
import { API_BASE_URL } from '@/lib/api-client';
import {
  CreateConversationPayload,
  Message,
  ChatEvent,
  ConversationMember,
  AddParticipantsPayload,
  MarkReadPayload,
} from '@/types/chat';

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
  const [typingUsers, setTypingUsers] = useState<{ userId: string; fullName: string; expiresAt: number }[]>([]);
  const [tokenTrigger, setTokenTrigger] = useState(Cookies.get('access_token') || '');

  // Synchronize token trigger state if cookies change
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToken = Cookies.get('access_token') || '';
      if (currentToken !== tokenTrigger) {
        setTokenTrigger(currentToken);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [tokenTrigger]);

  // Periodic cleanup of expired typing indicators (Receiver GC)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const active = prev.filter((u) => u.expiresAt > now);
        if (active.length !== prev.length) return active;
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const token = Cookies.get('access_token');
    if (!token) return;

    // Khởi tạo luồng kết nối EventSource nhận tin nhắn mới
    const eventSource = new EventSource(
      `${API_BASE_URL}/conversations/stream?token=${token}`,
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
          // Float hội thoại có hoạt động mới lên trên cùng
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } else if (chatEvent.type === 'message.deleted') {
          const { id, conversationId: msgConversationId } = chatEvent.payload as {
            id: string;
            conversationId: string;
          };
          // Xóa tin nhắn khỏi cache nếu thuộc cuộc hội thoại hiện tại đang xem
          if (msgConversationId === conversationId) {
            queryClient.setQueryData<Message[]>(
              ['conversation-messages', conversationId],
              removeMessageFromCache(id),
            );
          }
          // Cập nhật danh sách cuộc hội thoại để thay đổi preview tin nhắn cuối
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } else if (chatEvent.type === 'member.joined') {
          const { conversationId: joinedConvId, member } = chatEvent.payload as {
            conversationId: string;
            member: ConversationMember;
          };
          // Thêm thành viên mới vào danh sách cache nếu thuộc cuộc hội thoại đang xem
          if (joinedConvId === conversationId) {
            queryClient.setQueryData<ConversationMember[]>(
              ['conversation-participants', conversationId],
              (old) => {
                if (!old) return [member];
                if (old.some((m) => m.id === member.id)) return old;
                return [...old, member];
              },
            );
          }
        } else if (chatEvent.type === 'member.left') {
          const { conversationId: leftConvId, userId } = chatEvent.payload as {
            conversationId: string;
            userId: string;
          };
          // Xóa thành viên khỏi danh sách cache nếu thuộc cuộc hội thoại đang xem
          if (leftConvId === conversationId) {
            queryClient.setQueryData<ConversationMember[]>(
              ['conversation-participants', conversationId],
              (old) => {
                if (!old) return [];
                return old.filter((m) => m.userId !== userId);
              },
            );
          }
        } else if (chatEvent.type === 'message.read') {
          const { conversationId: readConvId, userId, messageId, readAt } = chatEvent.payload as {
            conversationId: string;
            userId: string;
            messageId: string;
            readAt: string;
          };
          // Cập nhật trạng thái đã đọc của thành viên trong cache nếu thuộc cuộc hội thoại đang xem
          if (readConvId === conversationId) {
            queryClient.setQueryData<ConversationMember[]>(
              ['conversation-participants', conversationId],
              (old) => {
                if (!old) return [];
                return old.map((m) =>
                  m.userId === userId
                    ? { ...m, lastReadMessageId: messageId, lastReadAt: readAt }
                    : m,
                );
              },
            );
          }
        } else if (chatEvent.type === 'typing.start') {
          const { conversationId: typingConvId, userId, fullName } = chatEvent.payload as {
            conversationId: string;
            userId: string;
            fullName: string;
          };
          if (typingConvId === conversationId) {
            setTypingUsers((prev) => {
              const expiresAt = Date.now() + 6000; // Keep active for 6 seconds
              const filtered = prev.filter((u) => u.userId !== userId);
              return [...filtered, { userId, fullName, expiresAt }];
            });
          }
        } else if (chatEvent.type === 'typing.stop') {
          const { conversationId: typingConvId, userId } = chatEvent.payload as {
            conversationId: string;
            userId: string;
          };
          if (typingConvId === conversationId) {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
          }
        } else if (chatEvent.type === 'unread_count') {
          // Invalidate cache thông báo tin nhắn chưa đọc
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        } else if (chatEvent.type === 'conversation.updated') {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          if ((chatEvent.payload as { conversationId: string })?.conversationId === conversationId) {
            queryClient.invalidateQueries({ queryKey: ['conversation-detail', conversationId] });
          }
        }
      } catch (err) {
        console.error('Lỗi phân giải tin nhắn SSE:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Lỗi kết nối SSE stream:', err);
      const currentToken = Cookies.get('access_token') || '';
      if (currentToken && currentToken !== token) {
        console.log('Phát hiện token mới, thiết lập lại kết nối SSE...');
        setTokenTrigger(currentToken);
      }
    };

    return () => {
      eventSource.close();
      setTypingUsers([]); // Reset typing status on switching conversation or unmounting
    };
  }, [conversationId, queryClient, tokenTrigger]);

  return { typingUsers };
};

/**
 * Hook lấy danh sách thành viên trong cuộc hội thoại
 */
export const useConversationParticipants = (conversationId: string) => {
  return useQuery({
    queryKey: ['conversation-participants', conversationId],
    queryFn: () => chatService.getParticipants(conversationId),
    enabled: !!conversationId,
  });
};

/**
 * Hook đánh dấu đã đọc tin nhắn trong cuộc hội thoại
 */
export const useMarkMessageRead = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: MarkReadPayload) =>
      chatService.markAsRead(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation-participants', conversationId],
      });
    },
  });
};

/**
 * Hook thêm thành viên vào cuộc hội thoại nhóm
 */
export const useAddParticipants = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddParticipantsPayload) =>
      chatService.addParticipants(conversationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation-participants', conversationId],
      });
    },
  });
};

/**
 * Hook xóa thành viên hoặc rời khỏi cuộc hội thoại nhóm
 */
export const useRemoveParticipant = (conversationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      chatService.removeParticipant(conversationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation-participants', conversationId],
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
