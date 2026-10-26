'use client';

import { useMemo, useState } from 'react';
import { useConversations } from '@/hooks/chat';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Conversation, ConversationMember } from '@/types/chat';

export interface UseConversationNavigationOptions {
  currentUserId?: string;
  initialConversationId?: string | null;
}

/**
 * TICKET-37.2: Hook chuyên biệt quản lý điều hướng danh sách cuộc trò chuyện
 * - Lấy danh sách hội thoại từ TanStack Query
 * - Tìm kiếm & lọc danh sách theo tên phòng / thành viên
 * - Quản lý phòng đang chọn (selectedConversationId & effectiveConversationId)
 * - Helper xác định tiêu đề hội thoại (getConversationTitle)
 */
export function useConversationNavigation(options?: UseConversationNavigationOptions) {
  const currentUserId = options?.currentUserId;
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    options?.initialConversationId || null,
  );

  // Zustand Chat UI Store
  const searchQuery = useChatUIStore((state) => state.searchQuery);
  const setSearchQuery = useChatUIStore((state) => state.setSearchQuery);
  const activeFilterTab = useChatUIStore((state) => state.activeFilterTab);
  const setActiveFilterTab = useChatUIStore((state) => state.setActiveFilterTab);

  // TanStack Query: Fetch danh sách hội thoại
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useConversations();

  // Cuộc hội thoại hiệu lực (đang chọn hoặc mặc định là cái đầu tiên)
  const effectiveConversationId =
    selectedConversationId || (conversations.length > 0 ? conversations[0].id : null);

  // Cuộc hội thoại đang active
  const activeConversation: Conversation | undefined = useMemo(() => {
    return conversations.find((c: Conversation) => c.id === effectiveConversationId);
  }, [conversations, effectiveConversationId]);

  // Lọc danh sách hội thoại theo từ khóa tìm kiếm và tab phân loại Zustand
  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (activeFilterTab === 'GROUPS') {
      result = result.filter((c: Conversation) => c.isGroup);
    } else if (activeFilterTab === 'DOSSIERS') {
      result = result.filter((c: Conversation) => Boolean(c.dossierId || c.dossier));
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter((c: Conversation) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const memberMatch = c.members?.some((m: ConversationMember) =>
        m.user?.fullName?.toLowerCase().includes(query),
      );
      return nameMatch || memberMatch;
    });
  }, [conversations, searchQuery, activeFilterTab]);

  // Tên hiển thị của cuộc hội thoại
  const getConversationTitle = (conv?: Conversation | null) => {
    if (!conv) return 'Cuộc trò chuyện';
    if (conv.name) return conv.name;
    const otherMembers = conv.members?.filter((m) => m.userId !== currentUserId) || [];
    if (otherMembers.length === 1) {
      return otherMembers[0].user?.fullName || 'Người dùng';
    }
    if (otherMembers.length > 1) {
      return otherMembers.map((m) => m.user?.fullName).join(', ');
    }
    return 'Cuộc trò chuyện';
  };

  return {
    conversations,
    filteredConversations,
    isLoadingConversations,
    searchQuery,
    setSearchQuery,
    activeFilterTab,
    setActiveFilterTab,
    selectedConversationId,
    setSelectedConversationId,
    effectiveConversationId,
    activeConversation,
    getConversationTitle,
  };
}
