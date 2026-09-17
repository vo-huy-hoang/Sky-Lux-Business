import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore, TypingUser } from '@/lib/stores/chat-ui-store';
import { apiClient, API_BASE_URL } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { calculateBackoffWithJitter } from '@/lib/backoff';
import { appendMessageToCache, removeMessageFromCache } from './cache-reducers';
import {
  Message,
  ChatEvent,
  ConversationMember,
} from '@/types/chat';

const EMPTY_TYPING_USERS: TypingUser[] = [];

/**
 * Hook chuyên biệt trích xuất mảng typingUsers cho một conversationId cụ thể
 * Chỉ trigger re-render cho đúng component đăng ký tiêu thụ danh sách này (MessageBubbleList).
 */
export const useTypingUsers = (conversationId?: string | null) => {
  return useChatUIStore((state) =>
    conversationId ? state.typingUsers[conversationId] || EMPTY_TYPING_USERS : EMPTY_TYPING_USERS
  );
};

export interface UseChatRealtimeOptions {
  /**
   * Nếu true, hook sẽ subscribe mảng typingUsers trực tiếp và trả về typingUsers
   * Mặc định là false để tránh ép root component re-render khi có người gõ phím.
   */
  subscribeTyping?: boolean;
}

/**
 * Custom Hook lắng nghe tin nhắn thời gian thực qua Server-Sent Events (SSE)
 * tự động cập nhật cache của TanStack Query khi có tin mới hoặc tin bị xóa.
 * Trang bị:
 * - Exponential Backoff + Full Jitter theo chuẩn AWS
 * - Trạng thái phục hồi tự động qua Zustand UI Store
 * - activeConversationIdRef để loại bỏ hiện tượng ngắt/mở lại SSE liên tục (Anti-thrashing)
 * - Page Visibility & Online/Offline reconnection tự động
 * - Tách biệt typing indicator về Zustand Store để cách ly re-render khỏi root
 */
export const useChatRealtime = (
  conversationId?: string,
  options?: UseChatRealtimeOptions,
) => {
  const queryClient = useQueryClient();
  const authAccessToken = useAuthStore((state) => state.accessToken);
  const [tokenTrigger, setTokenTrigger] = useState(authAccessToken || Cookies.get('access_token') || '');

  const activeConversationIdRef = useRef<string | undefined>(conversationId);
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const setConnectionStatus = useUIStore((state) => state.setConnectionStatus);
  const setChatStatus = useUIStore((state) => state.setChatStatus);
  const setReconnectAttempt = useUIStore((state) => state.setReconnectAttempt);
  const reconnectTrigger = useUIStore((state) => state.reconnectTrigger);

  // Khi người dùng click chuyển cuộc trò chuyện: cập nhật ref và xóa typing indicator của phòng cũ
  // KHÔNG ngắt hay khởi tạo lại kết nối SSE vì đây là luồng toàn cục của User
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
    if (conversationId) {
      useChatUIStore.getState().clearTypingUsers(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTokenRefreshed = (e: Event) => {
      const customEvt = e as CustomEvent<{ accessToken: string }>;
      const newToken = customEvt.detail?.accessToken || Cookies.get('access_token') || '';
      if (newToken && newToken !== tokenTrigger) {
        setTokenTrigger(newToken);
      }
    };
    window.addEventListener('skylux:token-refreshed', handleTokenRefreshed);
    return () => {
      window.removeEventListener('skylux:token-refreshed', handleTokenRefreshed);
    };
  }, [tokenTrigger]);

  // Periodic cleanup of expired typing indicators (Receiver GC) and stale failed messages qua Zustand Store
  useEffect(() => {
    useChatUIStore.getState().cleanupStaleFailedMessages();
    const timer = setInterval(() => {
      useChatUIStore.getState().cleanupExpiredTypingUsers();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    let streamToken = '';
    try {
      const response = await apiClient.get<any, { token: string }>('/auth/stream-token');
      streamToken = response.token;
    } catch {
      setChatStatus('idle');
      setConnectionStatus('connected');
      return;
    }
    if (!streamToken) return;

    try {
      setChatStatus('reconnecting');
      // Khởi tạo luồng kết nối EventSource nhận tin nhắn mới
      const eventSource = new EventSource(
        `${API_BASE_URL}/conversations/stream?token=${encodeURIComponent(streamToken)}`,
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        attemptRef.current = 0;
        setReconnectAttempt(0);
        setChatStatus('connected');
        setConnectionStatus('connected');
        queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
      };

      eventSource.onmessage = (event) => {
        try {
          const chatEvent = JSON.parse(event.data) as ChatEvent;

          if (chatEvent.type === 'message.created') {
            const newMessage = chatEvent.payload as Message;
            if (newMessage.conversationId === activeConversationIdRef.current) {
              queryClient.setQueryData<Message[]>(
                queryKeys.chat.messages(newMessage.conversationId),
                appendMessageToCache(newMessage),
              );
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
          } else if (chatEvent.type === 'message.deleted') {
            const { id, conversationId: msgConversationId } = chatEvent.payload as {
              id: string;
              conversationId: string;
            };
            if (msgConversationId === activeConversationIdRef.current) {
              queryClient.setQueryData<Message[]>(
                queryKeys.chat.messages(msgConversationId),
                removeMessageFromCache(id),
              );
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
          } else if (chatEvent.type === 'member.joined') {
            const { conversationId: joinedConvId, member } = chatEvent.payload as {
              conversationId: string;
              member: ConversationMember;
            };
            if (joinedConvId === activeConversationIdRef.current) {
              queryClient.setQueryData<ConversationMember[]>(
                queryKeys.chat.participants(joinedConvId),
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
            if (leftConvId === activeConversationIdRef.current) {
              queryClient.setQueryData<ConversationMember[]>(
                queryKeys.chat.participants(leftConvId),
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
            if (readConvId === activeConversationIdRef.current) {
              queryClient.setQueryData<ConversationMember[]>(
                queryKeys.chat.participants(readConvId),
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
            const currentUserId = useAuthStore.getState().user?.id;
            // TICKET-41.2: Bỏ qua tiếng vọng gõ phím của chính mình
            if (userId && userId !== currentUserId) {
              useChatUIStore.getState().addTypingUser(typingConvId, {
                userId,
                fullName,
                expiresAt: Date.now() + 6000,
              });
            }
          } else if (chatEvent.type === 'typing.stop') {
            const { conversationId: typingConvId, userId } = chatEvent.payload as {
              conversationId: string;
              userId: string;
            };
            useChatUIStore.getState().removeTypingUser(typingConvId, userId);
          } else if (chatEvent.type === 'unread_count') {
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadCount() });
          } else if (chatEvent.type === 'conversation.updated') {
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
            if ((chatEvent.payload as { conversationId: string })?.conversationId === activeConversationIdRef.current) {
              queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversation(activeConversationIdRef.current) });
            }
          }
        } catch (err) {
          console.error('Lỗi phân giải tin nhắn SSE:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        // Full Jitter Exponential Backoff
        const nextAttempt = attemptRef.current + 1;
        attemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);

        // Giới hạn tối đa 5 lần thử lại tự động: dừng vòng lặp và chuyển sang chế độ chờ nút bấm thủ công
        if (nextAttempt > 5) {
          setChatStatus('reconnect_failed');
          setConnectionStatus('reconnect_failed');
          return;
        }

        setChatStatus('reconnecting');
        setConnectionStatus('reconnecting');

        // Khi tab đang ẩn: tạm hoãn retry để tiết kiệm tài nguyên mạng và kết nối SSE
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        const delay = calculateBackoffWithJitter(nextAttempt);

        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(() => {
          connectRef.current();
        }, delay);
      };
    } catch {
      setChatStatus('reconnecting');
      setConnectionStatus('reconnecting');
    }
  }, [queryClient, setConnectionStatus, setChatStatus, setReconnectAttempt]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Lắng nghe tín hiệu kích hoạt kết nối lại thủ công từ Header banner
  useEffect(() => {
    if (reconnectTrigger > 0) {
      attemptRef.current = 0;
      setReconnectAttempt(0);
      setChatStatus('reconnecting');
      setConnectionStatus('reconnecting');
      connectRef.current();
    }
  }, [reconnectTrigger, setConnectionStatus, setChatStatus, setReconnectAttempt]);

  // Online / Offline System Event Listeners for Fast Recovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      // Mạng có lại: Lập tức reset attempt về 0 và thử kết nối lại ngay tức thì (0ms)
      attemptRef.current = 0;
      setReconnectAttempt(0);
      setChatStatus('reconnecting');
      setConnectionStatus('reconnecting');
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      connectRef.current();
    };

    const handleOffline = () => {
      setChatStatus('offline');
      setConnectionStatus('offline');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    // Page Visibility API: Quản lý vòng đời kết nối khi người dùng ẩn/hiện tab
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        if (!eventSourceRef.current) {
          attemptRef.current = 0;
          setReconnectAttempt(0);
          setChatStatus('reconnecting');
          setConnectionStatus('reconnecting');
          connectRef.current();
        } else {
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.conversations() });
          if (activeConversationIdRef.current) {
            queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(activeConversationIdRef.current) });
          }
        }
      } else {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, setChatStatus, setConnectionStatus, setReconnectAttempt]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (activeConversationIdRef.current) {
        useChatUIStore.getState().clearTypingUsers(activeConversationIdRef.current);
      }
      // Lazy-scoped: khi rời khỏi màn hình Chat, trả trạng thái chat về idle
      setChatStatus('idle');
      setConnectionStatus('connected');
      setReconnectAttempt(0);
    };
  }, [connect, authAccessToken, tokenTrigger, setConnectionStatus, setChatStatus, setReconnectAttempt]);

  const subscribedTypingUsers = useTypingUsers(options?.subscribeTyping ? conversationId : undefined);
  return { typingUsers: subscribedTypingUsers };
};
