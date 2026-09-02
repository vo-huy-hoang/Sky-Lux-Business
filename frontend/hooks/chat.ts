import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';


import { chatService } from '@/services/chat.service';
import { API_BASE_URL } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
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
    queryKey: queryKeys.chat.conversations(),
    queryFn: ({ signal }) => chatService.getConversations({ signal }),
  });
};

export const useConversationDetail = (id: string) => {
  return useQuery({
    queryKey: queryKeys.chat.conversation(id),
    queryFn: ({ signal }) => chatService.getConversationDetail(id, { signal }),
    enabled: !!id,
  });
};

export const useConversationMessages = (id: string) => {
  return useQuery({
    queryKey: queryKeys.chat.messages(id),
    queryFn: ({ signal }) => chatService.getConversationMessages(id, { signal }),
    enabled: !!id,
  });
};


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
      const clientMessageId = typeof variables === 'string' ? undefined : variables.clientMessageId;
      return chatService.sendMessage(conversationId, content, clientMessageId);
    },
    onMutate: async (variables) => {
      const content = typeof variables === 'string' ? variables : variables.content;
      const clientMessageId =
        (typeof variables !== 'string' && variables.clientMessageId) ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

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

      // 4. Reconcile: Thay thế tin nhắn tạm bằng tin nhắn chính thức từ server
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        (old = []) => {
          const withoutTemp = old.filter(
            (msg) => msg.id !== context?.tempId && msg.clientMessageId !== context?.clientMessageId,
          );
          if (withoutTemp.some((msg) => msg.id === savedMessage.id)) {
            return withoutTemp;
          }
          return [...withoutTemp, { ...savedMessage, status: 'sent' }];
        },
      );

      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
};


export const useDossierConversation = (dossierId: string) => {
  return useQuery({
    queryKey: ['dossier-conversation', dossierId],
    queryFn: ({ signal }) => chatService.getDossierConversation(dossierId, { signal }),
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
        queryKeys.chat.messages(conversationId),
        removeMessageFromCache(messageId),
      );
      // Invalidate danh sách để cập nhật tin nhắn cuối cùng (nếu tin bị xóa là tin mới nhất)
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
    },
  });
};

/**

 * Thuật toán Exponential Backoff with Full Jitter theo chuẩn AWS Architecture
 * - Attempt 0: Fast Immediate Retry (0ms) cho sự cố giật mạng nhẹ.
 * - Attempt >= 1: delay = random(0, min(maxDelay, baseDelay * 2^(attempt - 1)))
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelay = 500,
  maxDelay = 5000,
): number {
  if (attempt <= 0) return 0;
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));
  return Math.floor(Math.random() * exponential);
}

/**
 * Custom Hook lắng nghe tin nhắn thời gian thực qua Server-Sent Events (SSE)
 * tự động cập nhật cache của TanStack Query khi có tin mới hoặc tin bị xóa.
 * Trang bị Exponential Backoff + Full Jitter và trạng thái phục hồi tự động qua Zustand.
 */
export const useChatRealtime = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<{ userId: string; fullName: string; expiresAt: number }[]>([]);
  const [tokenTrigger, setTokenTrigger] = useState(Cookies.get('access_token') || '');

  const attemptRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);

  const setReconnectAttempt = useUIStore((state) => state.setReconnectAttempt);

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

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const token = Cookies.get('access_token');
    if (!token) {
      setConnectionStatus('offline');
      return;
    }

    try {
      // Khởi tạo luồng kết nối EventSource nhận tin nhắn mới
      const eventSource = new EventSource(
        `${API_BASE_URL}/conversations/stream?token=${token}`,
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        attemptRef.current = 0;
        setReconnectAttempt(0);
        setConnectionStatus('connected');
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      };

      eventSource.onmessage = (event) => {
        try {
          const chatEvent = JSON.parse(event.data) as ChatEvent;

          if (chatEvent.type === 'message.created') {
            const newMessage = chatEvent.payload as Message;
            if (newMessage.conversationId === conversationId) {
              queryClient.setQueryData<Message[]>(
                ['conversation-messages', conversationId],
                appendMessageToCache(newMessage),
              );
            }
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          } else if (chatEvent.type === 'message.deleted') {
            const { id, conversationId: msgConversationId } = chatEvent.payload as {
              id: string;
              conversationId: string;
            };
            if (msgConversationId === conversationId) {
              queryClient.setQueryData<Message[]>(
                ['conversation-messages', conversationId],
                removeMessageFromCache(id),
              );
            }
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          } else if (chatEvent.type === 'member.joined') {
            const { conversationId: joinedConvId, member } = chatEvent.payload as {
              conversationId: string;
              member: ConversationMember;
            };
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
                const expiresAt = Date.now() + 6000;
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
            queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
          } else if (chatEvent.type === 'conversation.updated') {
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
            if ((chatEvent.payload as { conversationId: string })?.conversationId === conversationId) {
              queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversation(conversationId) });
            }
          }
        } catch (err) {
          console.error('Lỗi phân giải tin nhắn SSE:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        const currentToken = Cookies.get('access_token') || '';
        if (currentToken && currentToken !== token) {
          setTokenTrigger(currentToken);
          return;
        }

        // Full Jitter Exponential Backoff
        const nextAttempt = attemptRef.current + 1;
        attemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);
        setConnectionStatus('reconnecting');

        const delay = calculateBackoffWithJitter(nextAttempt);

        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(() => {
          connectRef.current();
        }, delay);
      };
    } catch {
      setConnectionStatus('reconnecting');
    }
  }, [conversationId, queryClient, setConnectionStatus, setReconnectAttempt]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Online / Offline System Event Listeners for Fast Recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      // Mạng có lại: Lập tức reset attempt về 0 và thử kết nối lại ngay tức thì (0ms)
      attemptRef.current = 0;
      setReconnectAttempt(0);
      setConnectionStatus('reconnecting');
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      connectRef.current();
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setConnectionStatus, setReconnectAttempt]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [connect, tokenTrigger]);


  return { typingUsers };
};


/**
 * Hook lấy danh sách thành viên trong cuộc hội thoại
 */
export const useConversationParticipants = (conversationId: string) => {
  return useQuery({
    queryKey: queryKeys.chat.participants(conversationId),
    queryFn: ({ signal }) => chatService.getParticipants(conversationId, { signal }),
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
        queryKey: queryKeys.chat.participants(conversationId),
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
        queryKey: queryKeys.chat.participants(conversationId),
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
