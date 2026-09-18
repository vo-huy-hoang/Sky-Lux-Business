import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateConversationFlow } from '@/app/main/messages/hooks/useCreateConversationFlow';
import { useConversationNavigation } from '@/app/main/messages/hooks/useConversationNavigation';
import { useMessageThread } from '@/app/main/messages/hooks/useMessageThread';
import { useActiveChatWorkspace } from '@/app/main/messages/hooks/useActiveChatWorkspace';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Conversation, Message } from '@/types/chat';

// Mock antd message
jest.mock('antd', () => ({
  message: {
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock auth store
const mockCurrentUser = { id: 'user-me', fullName: 'Current User', roles: ['OPERATOR'] };
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: jest.fn((selector) => selector({ user: mockCurrentUser })),
}));

// Mock use-users hook
const mockUseUsersList = jest.fn();
jest.mock('@/hooks/use-users', () => ({
  useUsersList: (params: any, options: any) => mockUseUsersList(params, options),
}));

// Mock chat hooks
const mockMutateCreateConv = jest.fn();
const mockMutateSendMessage = jest.fn();
const mockMutateDeleteMessage = jest.fn();
const mockMutateStartTyping = jest.fn();
const mockMutateStopTyping = jest.fn();
const mockConversationsData: Conversation[] = [
  {
    id: 'conv-1',
    organizationId: 'org-1',
    name: 'Phòng Chiến Dịch Đà Nẵng',
    isGroup: true,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    members: [
      { id: 'm1', conversationId: 'conv-1', userId: 'user-me', role: 'ADMIN', joinedAt: '2026-09-01', user: { id: 'user-me', fullName: 'Current User' } as any },
      { id: 'm2', conversationId: 'conv-1', userId: 'user-2', role: 'MEMBER', joinedAt: '2026-09-01', user: { id: 'user-2', fullName: 'Hoàng Văn Tour' } as any },
    ],
  },
  {
    id: 'conv-2',
    organizationId: 'org-1',
    name: undefined,
    isGroup: false,
    createdAt: '2026-09-02',
    updatedAt: '2026-09-02',
    members: [
      { id: 'm3', conversationId: 'conv-2', userId: 'user-me', role: 'ADMIN', joinedAt: '2026-09-02', user: { id: 'user-me', fullName: 'Current User' } as any },
      { id: 'm4', conversationId: 'conv-2', userId: 'user-3', role: 'MEMBER', joinedAt: '2026-09-02', user: { id: 'user-3', fullName: 'Lê Hướng Dẫn' } as any },
    ],
  },
];

const mockMessagesData: Message[] = [
  {
    id: 'msg-1',
    organizationId: 'org-1',
    conversationId: 'conv-1',
    senderId: 'user-me',
    content: 'Xin chào đoàn tour!',
    createdAt: '2026-09-01T10:00:00Z',
    sender: { id: 'user-me', fullName: 'Current User' } as any,
  },
];

jest.mock('@/hooks/chat', () => ({
  useConversations: jest.fn(() => ({
    data: mockConversationsData,
    isLoading: false,
  })),
  useConversationMessages: jest.fn((convId: string) => ({
    data: convId === 'conv-1' ? mockMessagesData : [],
    isLoading: false,
  })),
  useCreateConversation: jest.fn(() => ({
    mutate: mockMutateCreateConv,
    isPending: false,
  })),
  useSendMessage: jest.fn(() => ({
    mutate: mockMutateSendMessage,
    isPending: false,
  })),
  useDeleteMessage: jest.fn(() => ({
    mutate: mockMutateDeleteMessage,
  })),
  useStartTyping: jest.fn(() => ({
    mutate: mockMutateStartTyping,
  })),
  useStopTyping: jest.fn(() => ({
    mutate: mockMutateStopTyping,
  })),
  useChatRealtime: jest.fn(() => ({
    typingUsers: [],
  })),
  useTypingUsers: jest.fn(() => []),
}));

jest.mock('@/hooks/dossiers', () => ({
  useDossierDetail: jest.fn(() => ({ data: null })),
}));

describe('Phase 37: Locality Decomposition & Modular Seams', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
    useChatUIStore.setState({
      draftMessages: {},
      failedMessages: {},
      searchQuery: '',
      activeFilterTab: 'ALL',
      isCreateGroupModalOpen: false,
    });
    mockUseUsersList.mockReturnValue({
      users: [
        { id: 'user-2', fullName: 'Hoàng Văn Tour', email: 'hoang@skylux.vn' },
        { id: 'user-3', fullName: 'Lê Hướng Dẫn', email: 'le@skylux.vn' },
      ],
      isLoading: false,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('TICKET-37.1: useCreateConversationFlow & Locality', () => {
    it('disables user fetching when modal is closed (isOpen: false)', () => {
      renderHook(
        () => useCreateConversationFlow({ isOpen: false, onClose: jest.fn() }),
        { wrapper },
      );

      expect(mockUseUsersList).toHaveBeenCalledWith(
        { page: 1, pageSize: 50 },
        { enabled: false },
      );
    });

    it('enables user fetching with enabled: true when modal is opened (isOpen: true)', () => {
      renderHook(
        () => useCreateConversationFlow({ isOpen: true, onClose: jest.fn() }),
        { wrapper },
      );

      expect(mockUseUsersList).toHaveBeenCalledWith(
        { page: 1, pageSize: 50 },
        { enabled: true },
      );
    });

    it('submits mutation with correct payload and triggers onCreated and onClose callbacks', () => {
      const mockOnClose = jest.fn();
      const mockOnCreated = jest.fn();

      mockMutateCreateConv.mockImplementation((payload, { onSuccess }) => {
        onSuccess({ id: 'conv-new-123' });
      });

      const { result } = renderHook(
        () =>
          useCreateConversationFlow({
            isOpen: true,
            onClose: mockOnClose,
            onCreated: mockOnCreated,
          }),
        { wrapper },
      );

      act(() => {
        result.current.setNewConvName('Nhóm Hè 2026');
        result.current.setSelectedUserIds(['user-2', 'user-3']);
      });

      act(() => {
        result.current.handleOk();
      });

      expect(mockMutateCreateConv).toHaveBeenCalledWith(
        {
          name: 'Nhóm Hè 2026',
          isGroup: true,
          userIds: ['user-2', 'user-3'],
        },
        expect.any(Object),
      );

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnCreated).toHaveBeenCalledWith('conv-new-123');
    });
  });

  describe('TICKET-37.2: useConversationNavigation Seam', () => {
    it('computes effectiveConversationId and activeConversation', () => {
      const { result } = renderHook(
        () => useConversationNavigation({ currentUserId: 'user-me' }),
        { wrapper },
      );

      // Defaults to the first conversation if none explicitly selected
      expect(result.current.effectiveConversationId).toBe('conv-1');
      expect(result.current.activeConversation?.name).toBe('Phòng Chiến Dịch Đà Nẵng');

      // Can change selected conversation
      act(() => {
        result.current.setSelectedConversationId('conv-2');
      });

      expect(result.current.effectiveConversationId).toBe('conv-2');
      expect(result.current.activeConversation?.id).toBe('conv-2');
    });

    it('filters conversations by conversation name and member full name', () => {
      const { result } = renderHook(
        () => useConversationNavigation({ currentUserId: 'user-me' }),
        { wrapper },
      );

      expect(result.current.filteredConversations).toHaveLength(2);

      // Filter by name
      act(() => {
        result.current.setSearchQuery('Đà Nẵng');
      });
      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('conv-1');

      // Filter by member name
      act(() => {
        result.current.setSearchQuery('Hướng Dẫn');
      });
      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('conv-2');
    });

    it('generates proper title for named and 1-on-1 conversations', () => {
      const { result } = renderHook(
        () => useConversationNavigation({ currentUserId: 'user-me' }),
        { wrapper },
      );

      // Named conv
      expect(result.current.getConversationTitle(mockConversationsData[0])).toBe('Phòng Chiến Dịch Đà Nẵng');

      // 1-on-1 conv with user-3
      expect(result.current.getConversationTitle(mockConversationsData[1])).toBe('Lê Hướng Dẫn');
    });
  });

  describe('TICKET-37.3: useMessageThread Seam', () => {
    it('sends message with optimistic clearing of draft text', () => {
      const { result } = renderHook(
        () => useMessageThread({ conversationId: 'conv-1' }),
        { wrapper },
      );

      // Type message
      act(() => {
        result.current.handleInputChange({
          target: { value: 'Tin nhắn gửi thử' },
        } as any);
      });

      expect(result.current.inputText).toBe('Tin nhắn gửi thử');
      expect(mockMutateStartTyping).toHaveBeenCalled();

      // Send message
      act(() => {
        result.current.handleSendMessage();
      });

      expect(mockMutateStopTyping).toHaveBeenCalled();
      expect(mockMutateSendMessage).toHaveBeenCalledWith({
        content: 'Tin nhắn gửi thử',
        clientMessageId: expect.any(String),
      });

      // Draft cleared
      expect(result.current.inputText).toBe('');
    });

    it('deletes message via mutation', () => {
      const { result } = renderHook(
        () => useMessageThread({ conversationId: 'conv-1' }),
        { wrapper },
      );

      act(() => {
        result.current.deleteMessage('msg-1');
      });

      expect(mockMutateDeleteMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('Orchestration: useActiveChatWorkspace composition', () => {
    it('seamlessly binds navigation and thread without bloated root state', () => {
      const { result } = renderHook(() => useActiveChatWorkspace(), { wrapper });

      expect(result.current.effectiveConversationId).toBe('conv-1');
      expect((result.current as any).messages).toBeUndefined();
      expect(result.current.isOperator).toBe(true);
      expect(result.current.showRightPanel).toBe(true);

      // Check modal toggle
      act(() => {
        result.current.setIsCreateModalOpen(true);
      });
      expect(result.current.isCreateModalOpen).toBe(true);
    });
  });
});
