'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  useChatRealtime,
  useConversationMessages,
  useConversations,
  useCreateConversation,
  useDeleteMessage,
  useSendMessage,
  useStartTyping,
  useStopTyping,
} from '@/hooks/chat';
import { useDossierDetail } from '@/hooks/dossiers';
import { useUsersList } from '@/hooks/use-users';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Conversation, Message } from '@/types/chat';
import { UserItem } from '@/types/user';

export function useActiveChatWorkspace() {
  const user = useAuthStore((state) => state.user);
  const isOperator = user?.roles?.includes('OPERATOR');

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConvName, setNewConvName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Zustand Chat UI Store
  const searchQuery = useChatUIStore((state) => state.searchQuery);
  const setSearchQuery = useChatUIStore((state) => state.setSearchQuery);
  const isCreateModalOpen = useChatUIStore((state) => state.isCreateGroupModalOpen);
  const setIsCreateModalOpen = useChatUIStore((state) => state.setIsCreateGroupModalOpen);
  const draftMessages = useChatUIStore((state) => state.draftMessages);
  const setDraftMessage = useChatUIStore((state) => state.setDraftMessage);
  const clearDraftMessage = useChatUIStore((state) => state.clearDraftMessage);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Danh sách hội thoại (TanStack Query)
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useConversations();

  // Cuộc hội thoại hiệu lực (đang chọn hoặc mặc định là cái đầu tiên)
  const effectiveConversationId =
    selectedConversationId || (conversations.length > 0 ? conversations[0].id : null);

  // Nội dung tin nhắn nháp tương ứng với hội thoại hiện tại
  const inputText = effectiveConversationId ? draftMessages[effectiveConversationId] || '' : '';

  // Cuộc hội thoại đang chọn
  const activeConversation: Conversation | undefined = useMemo(() => {
    return conversations.find((c) => c.id === effectiveConversationId);
  }, [conversations, effectiveConversationId]);

  // 2. Fetch Tin nhắn của hội thoại được chọn (TanStack Query)
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useConversationMessages(effectiveConversationId || '');

  // 3. Realtime SSE Listener
  const { typingUsers } = useChatRealtime(effectiveConversationId || undefined);

  // 4. Fetch Thông tin hồ sơ liên quan (nếu có dossierId)
  const { data: relatedDossier } = useDossierDetail(activeConversation?.dossierId || '');

  // 5. Fetch Danh sách người dùng để tạo nhóm mới
  const { users: allUsers } = useUsersList({ page: 1, pageSize: 50 });

  // 6. Mutations (TanStack Query)
  const sendMessageMutation = useSendMessage(effectiveConversationId || '');
  const deleteMessageMutation = useDeleteMessage(effectiveConversationId || '');
  const createConversationMutation = useCreateConversation();
  const startTypingMutation = useStartTyping(effectiveConversationId || '');
  const stopTypingMutation = useStopTyping(effectiveConversationId || '');

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = (overrideText?: string, clientMessageId?: string) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : inputText.trim();
    if (!text || !effectiveConversationId) return;

    if (typeof overrideText !== 'string') {
      clearDraftMessage(effectiveConversationId);
    }

    if (effectiveConversationId) {
      stopTypingMutation.mutate();
    }

    sendMessageMutation.mutate({ content: text, clientMessageId });
  };

  // Xử lý gõ phím và lưu tin nhắn nháp tức thời vào Zustand Store
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!effectiveConversationId) return;

    setDraftMessage(effectiveConversationId, val);
    startTypingMutation.mutate();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingMutation.mutate();
    }, 2000);
  };

  // Xử lý tạo cuộc trò chuyện mới
  const handleCreateConversation = () => {
    if (selectedUserIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 người tham gia');
      return;
    }

    createConversationMutation.mutate(
      {
        name: newConvName.trim() || undefined,
        isGroup: selectedUserIds.length > 1,
        userIds: selectedUserIds,
      },
      {
        onSuccess: (newConv) => {
          message.success('Đã tạo cuộc trò chuyện mới');
          setIsCreateModalOpen(false);
          setNewConvName('');
          setSelectedUserIds([]);
          if (newConv?.id) {
            setSelectedConversationId(newConv.id);
          }
        },
        onError: () => {
          message.error('Không thể tạo cuộc trò chuyện');
        },
      },
    );
  };

  // Lọc danh sách hội thoại theo từ khóa tìm kiếm
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const memberMatch = c.members?.some((m) =>
        m.user?.fullName?.toLowerCase().includes(query),
      );
      return nameMatch || memberMatch;
    });
  }, [conversations, searchQuery]);

  // Tên hiển thị của cuộc hội thoại
  const getConversationTitle = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherMembers = conv.members?.filter((m) => m.userId !== user?.id) || [];
    if (otherMembers.length === 1) {
      return otherMembers[0].user?.fullName || 'Người dùng';
    }
    if (otherMembers.length > 1) {
      return otherMembers.map((m) => m.user?.fullName).join(', ');
    }
    return 'Cuộc trò chuyện';
  };

  return {
    user,
    isOperator,
    selectedConversationId,
    setSelectedConversationId,
    effectiveConversationId,
    activeConversation,
    conversations,
    filteredConversations,
    isLoadingConversations,
    messages,
    isLoadingMessages,
    typingUsers,
    relatedDossier,
    allUsers,
    searchQuery,
    setSearchQuery,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newConvName,
    setNewConvName,
    selectedUserIds,
    setSelectedUserIds,
    showRightPanel,
    setShowRightPanel,
    inputText,
    messagesEndRef,
    isSending: sendMessageMutation.isPending,
    isCreating: createConversationMutation.isPending,
    deleteMessage: (msgId: string) => deleteMessageMutation.mutate(msgId),
    handleSendMessage,
    handleInputChange,
    handleCreateConversation,
    getConversationTitle,
  };
}
