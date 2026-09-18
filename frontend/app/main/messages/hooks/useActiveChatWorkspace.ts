'use client';

import React, { useState } from 'react';
import { useChatRealtime } from '@/hooks/chat';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useConversationNavigation } from './useConversationNavigation';

/**
 * TICKET-42.3: Orchestrator Hook tinh gọn cho không gian làm việc chat
 * - useConversationNavigation: Quản lý danh sách phòng & điều hướng (TICKET-37.2)
 * - useChatRealtime: Lắng nghe SSE realtime ở chế độ tĩnh không re-render root (TICKET-38.1)
 *
 * Lưu ý kiến trúc Deep Module (/codebase-design):
 * - useMessageThread đã được chuyển hẳn vào MessageThreadArea (TICKET-42.2).
 * - Root orchestrator hoàn toàn không lưu giữ hay truyền các props tin nhắn (messages, inputText, isSending,...).
 * - Logic tạo nhóm được phân rã vào useCreateConversationFlow (TICKET-37.1).
 * - Logic nạp chi tiết dossier được co-locate vào ConversationInfoSidebar (TICKET-38.2).
 */
export function useActiveChatWorkspace() {
  const user = useAuthStore((state) => state.user);
  const isOperator = user?.roles?.includes('OPERATOR');

  const [showRightPanel, setShowRightPanel] = useState(true);

  // Zustand Chat UI Store
  const isCreateModalOpen = useChatUIStore((state) => state.isCreateGroupModalOpen);
  const setIsCreateModalOpen = useChatUIStore((state) => state.setIsCreateGroupModalOpen);

  // TICKET-37.2: Phân rã seam điều hướng danh sách hội thoại
  const nav = useConversationNavigation({ currentUserId: user?.id });

  // TICKET-38.1: SSE Listener duy trì kết nối toàn cục nhưng không ép root re-render khi gõ phím
  const { typingUsers } = useChatRealtime(nav.effectiveConversationId || undefined, { subscribeTyping: false });

  // TICKET-43.2: Lấy thông tin dossier trực tiếp từ relation đã định kiểu trong Conversation
  const relatedDossier = nav.activeConversation?.dossier || null;

  return {
    user,
    isOperator,
    selectedConversationId: nav.selectedConversationId,
    setSelectedConversationId: nav.setSelectedConversationId,
    effectiveConversationId: nav.effectiveConversationId,
    activeConversation: nav.activeConversation,
    conversations: nav.conversations,
    filteredConversations: nav.filteredConversations,
    isLoadingConversations: nav.isLoadingConversations,
    typingUsers,
    relatedDossier,
    searchQuery: nav.searchQuery,
    setSearchQuery: nav.setSearchQuery,
    activeFilterTab: nav.activeFilterTab,
    setActiveFilterTab: nav.setActiveFilterTab,
    isCreateModalOpen,
    setIsCreateModalOpen,
    showRightPanel,
    setShowRightPanel,
    getConversationTitle: nav.getConversationTitle,
  };
}
