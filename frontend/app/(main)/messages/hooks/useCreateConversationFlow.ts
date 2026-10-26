'use client';

import { useState } from 'react';
import { App, message as staticMessage } from 'antd';
import { useCreateConversation } from '@/hooks/chat';
import { useUsersList } from '@/hooks/use-users';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserItem } from '@/types/user';

export interface UseCreateConversationFlowOptions {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newConversationId: string) => void;
}

/**
 * Hook đóng gói toàn bộ logic tạo cuộc trò chuyện mới:
 * - Quản lý form input (newConvName, selectedUserIds)
 * - Lazy Fetching: Chỉ tải 50 users khi modal được mở (isOpen = true)
 * - Xử lý mutation tạo nhóm và callback đóng modal / chuyển phòng
 */
export function useCreateConversationFlow({
  isOpen,
  onClose,
  onCreated,
}: UseCreateConversationFlowOptions) {
  const antdApp = typeof App?.useApp === 'function' ? App.useApp() : null;
  const message = antdApp?.message || staticMessage;
  const user = useAuthStore((state) => state.user);
  const [newConvName, setNewConvName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // TICKET-37.1: Chỉ kích hoạt fetch users khi modal đang mở (Locality & Lazy Loading)
  const { users: allUsers = [], isLoading: isLoadingUsers } = useUsersList(
    { page: 1, pageSize: 50 },
    { enabled: isOpen },
  );

  const createConversationMutation = useCreateConversation();

  const handleCancel = () => {
    setNewConvName('');
    setSelectedUserIds([]);
    onClose();
  };

  const handleOk = () => {
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
          setNewConvName('');
          setSelectedUserIds([]);
          onClose();
          if (newConv?.id && onCreated) {
            onCreated(newConv.id);
          }
        },
        onError: () => {
          message.error('Không thể tạo cuộc trò chuyện');
        },
      },
    );
  };

  return {
    user,
    newConvName,
    setNewConvName,
    selectedUserIds,
    setSelectedUserIds,
    allUsers,
    isLoadingUsers,
    isCreating: createConversationMutation.isPending,
    handleOk,
    handleCancel,
  };
}
