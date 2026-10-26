'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  useConversationMessages,
  useDeleteMessage,
  useSendMessage,
  useStartTyping,
  useStopTyping,
} from '@/hooks/chat';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Message, ChatAttachment } from '@/types/chat';
import { chatService } from '@/services/chat.service';

export interface UseMessageThreadOptions {
  conversationId: string | null | undefined;
  typingUsersCount?: number;
}

/**
 * TICKET-37.3 & TICKET-42.1 & TICKET-CHAT-04: Hook chuyên biệt quản lý luồng tin nhắn và phân trang
 * - Tải 30 tin nhắn ban đầu từ TanStack Query (useConversationMessages)
 * - Tải thêm tin nhắn cũ (Infinite scrolling) theo con trỏ before, bảo toàn vị trí cuộn chuột
 * - Quản lý tin nhắn nháp (drafts) lưu trữ trong Zustand chat UI store
 * - Gửi tin nhắn Optimistic UI với clientMessageId và đính kèm tệp / ảnh
 * - Typing indicators & tự động báo dừng gõ sau 2 giây
 */
export function useMessageThread({
  conversationId,
}: UseMessageThreadOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialScrollDone = useRef(false);

  // Zustand Chat UI Store for draft messages
  const draftMessages = useChatUIStore((state) => state.draftMessages);
  const setDraftMessage = useChatUIStore((state) => state.setDraftMessage);
  const clearDraftMessage = useChatUIStore((state) => state.clearDraftMessage);

  const inputText = conversationId ? draftMessages[conversationId] || '' : '';

  // TanStack Query: Fetch 30 tin nhắn mới nhất theo conversationId
  const {
    data: initialMessages = [],
    isLoading: isLoadingMessages,
  } = useConversationMessages(conversationId || '');

  // Phân trang tin nhắn cũ (TICKET-CHAT-04)
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // Reset phân trang khi chuyển phòng chat
  useEffect(() => {
    setOlderMessages([]);
    setHasMore(true);
    setIsLoadingOlder(false);
    isInitialScrollDone.current = false;
  }, [conversationId]);

  // Hợp nhất tin nhắn cũ và tin nhắn mới (chống trùng lặp theo ID)
  const messages = useMemo(() => {
    const map = new Map<string, Message>();
    for (const msg of olderMessages) {
      if (msg?.id) map.set(msg.id, msg);
    }
    for (const msg of initialMessages) {
      if (msg?.id) map.set(msg.id, msg);
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [olderMessages, initialMessages]);

  // Mutations
  const sendMessageMutation = useSendMessage(conversationId || '');
  const deleteMessageMutation = useDeleteMessage(conversationId || '');
  const startTypingMutation = useStartTyping(conversationId || '');
  const stopTypingMutation = useStopTyping(conversationId || '');

  // TICKET-42.1: Tự động cuộn xuống cuối khi mở phòng hoặc gửi tin nhắn mới
  useEffect(() => {
    if (!isInitialScrollDone.current && messages.length > 0) {
      if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      isInitialScrollDone.current = true;
    }
  }, [messages.length]);

  // Tải thêm 30 tin nhắn cũ hơn (TICKET-CHAT-04)
  const handleLoadOlder = async () => {
    if (
      !conversationId ||
      isLoadingOlder ||
      !hasMore ||
      messages.length === 0
    ) {
      return;
    }

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoadingOlder(true);
    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    try {
      const older = await chatService.getConversationMessages(conversationId, {
        limit: 30,
        before: oldestMessage.id,
      });

      if (!Array.isArray(older) || older.length < 30) {
        setHasMore(false);
      }

      if (Array.isArray(older) && older.length > 0) {
        setOlderMessages((prev) => [...older, ...prev]);

        // Bảo toàn vị trí cuộn chuột tránh bị giật lag
        requestAnimationFrame(() => {
          if (container) {
            const heightDiff = container.scrollHeight - previousScrollHeight;
            container.scrollTop = previousScrollTop + heightDiff;
          }
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // TICKET-41.3: Dọn dẹp hẹn giờ debounce khi component unmount hoặc đổi phòng
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [conversationId]);

  // Xử lý gửi tin nhắn (TICKET-41.1 & TICKET-CHAT-02: Hỗ trợ đính kèm tệp / ảnh)
  const handleSendMessage = (
    overrideText?: string,
    clientMessageId?: string,
    attachments?: ChatAttachment[],
  ) => {
    const text =
      typeof overrideText === 'string' ? overrideText.trim() : inputText.trim();
    const hasAttachments =
      Array.isArray(attachments) && attachments.length > 0;
    if ((!text && !hasAttachments) || !conversationId) return;

    if (typeof overrideText !== 'string') {
      clearDraftMessage(conversationId);
    }

    const cid =
      clientMessageId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    stopTypingMutation.mutate();
    const payload: {
      content: string;
      clientMessageId: string;
      attachments?: ChatAttachment[];
    } = {
      content: text,
      clientMessageId: cid,
    };
    if (hasAttachments) {
      payload.attachments = attachments;
    }
    sendMessageMutation.mutate(payload);

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
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
    hasMore: hasMore && messages.length >= 30,
    isLoadingOlder,
    onLoadOlder: handleLoadOlder,
    scrollContainerRef,
    messagesEndRef,
    handleSendMessage,
    handleInputChange,
    deleteMessage,
  };
}
