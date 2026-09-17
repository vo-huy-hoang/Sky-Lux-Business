'use client';

import React, { useEffect, useRef } from 'react';
import {
  useConversationMessages,
  useDeleteMessage,
  useSendMessage,
  useStartTyping,
  useStopTyping,
} from '@/hooks/chat';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Message } from '@/types/chat';

export interface UseMessageThreadOptions {
  conversationId: string | null | undefined;
  typingUsersCount?: number;
}

/**
 * TICKET-37.3 & TICKET-42.1: Hook chuyên biệt quản lý luồng tin nhắn và thao tác gửi/xóa trong phòng chat
 * - Tải tin nhắn từ TanStack Query (useConversationMessages)
 * - Quản lý tin nhắn nháp (drafts) lưu trữ trong Zustand chat UI store
 * - Gửi tin nhắn Optimistic UI với clientMessageId và chống trùng lặp
 * - Typing indicators & tự động báo dừng gõ sau 2 giây
 * - Tự động cuộn trang (auto-scroll) theo [messages] độc lập hoàn toàn với typing indicators
 */
export function useMessageThread({
  conversationId,
}: UseMessageThreadOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Zustand Chat UI Store for draft messages
  const draftMessages = useChatUIStore((state) => state.draftMessages);
  const setDraftMessage = useChatUIStore((state) => state.setDraftMessage);
  const clearDraftMessage = useChatUIStore((state) => state.clearDraftMessage);

  const inputText = conversationId ? draftMessages[conversationId] || '' : '';

  // TanStack Query: Fetch danh sách tin nhắn theo conversationId
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useConversationMessages(conversationId || '');

  // Mutations
  const sendMessageMutation = useSendMessage(conversationId || '');
  const deleteMessageMutation = useDeleteMessage(conversationId || '');
  const startTypingMutation = useStartTyping(conversationId || '');
  const stopTypingMutation = useStopTyping(conversationId || '');

  // TICKET-42.1: Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // TICKET-41.3: Dọn dẹp hẹn giờ debounce khi component unmount hoặc đổi phòng
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId]);

  // Xử lý gửi tin nhắn (TICKET-41.1: Khóa Idempotency Key luôn có giá trị)
  const handleSendMessage = (overrideText?: string, clientMessageId?: string) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : inputText.trim();
    if (!text || !conversationId) return;

    if (typeof overrideText !== 'string') {
      clearDraftMessage(conversationId);
    }

    const cid =
      clientMessageId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    stopTypingMutation.mutate();
    sendMessageMutation.mutate({ content: text, clientMessageId: cid });
  };

  // Xử lý gõ phím & lưu tin nhắn nháp tức thời vào Zustand Store
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!conversationId) return;

    setDraftMessage(conversationId, val);
    startTypingMutation.mutate();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingMutation.mutate();
    }, 2000);
  };

  // Xử lý xóa tin nhắn
  const deleteMessage = (msgId: string) => {
    deleteMessageMutation.mutate(msgId);
  };

  return {
    messages,
    isLoadingMessages,
    inputText,
    isSending: sendMessageMutation.isPending,
    messagesEndRef,
    handleSendMessage,
    handleInputChange,
    deleteMessage,
  };
}
