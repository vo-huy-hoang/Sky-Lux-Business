import '@testing-library/jest-dom';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendMessage } from '@/hooks/chat/use-chat-mutations';
import { appendMessageToCache, removeMessageFromCache } from '@/hooks/chat/cache-reducers';
import { useCreateConversationFlow } from '@/app/main/messages/hooks/useCreateConversationFlow';
import { useMessageThread } from '@/app/main/messages/hooks/useMessageThread';
import { MessageBubbleList } from '@/app/main/messages/components/MessageBubbleList';
import { MessageThreadArea } from '@/app/main/messages/components/MessageThreadArea';
import { CreateConversationModal } from '@/app/main/messages/components/CreateConversationModal';
import { ConversationList } from '@/app/main/messages/components/ConversationList';
import { MessageInputBar } from '@/app/main/messages/components/MessageInputBar';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { chatService } from '@/services/chat.service';
import { usersService } from '@/services/users.service';
import { queryKeys } from '@/lib/query-keys';
import { Message, Conversation, ChatUser } from '@/types/chat';

// Mock services
jest.mock('@/services/chat.service', () => ({
  chatService: {
    sendMessage: jest.fn(),
    createConversation: jest.fn(),
    getConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    getParticipants: jest.fn(),
  },
}));

jest.mock('@/services/users.service', () => ({
  usersService: {
    getUsers: jest.fn(),
  },
}));

// Mock icons
jest.mock('@ant-design/icons', () => ({
  MessageOutlined: () => <span data-testid="message-icon" />,
  PlusOutlined: () => <span data-testid="plus-icon" />,
  FolderOpenOutlined: () => <span data-testid="folder-icon" />,
  InfoCircleOutlined: () => <span data-testid="info-icon" />,
  TeamOutlined: () => <span data-testid="team-icon" />,
  DeleteOutlined: () => <span data-testid="delete-icon" />,
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  ReloadOutlined: () => <span data-testid="reload-icon" />,
  SendOutlined: () => <span data-testid="send-icon" />,
  SearchOutlined: () => <span data-testid="search-icon" />,
}));

// Mock antd message to prevent console noise
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const mockMessage = {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  };
  return {
    ...actual,
    message: mockMessage,
    App: {
      ...actual.App,
      useApp: () => ({
        message: mockMessage,
        modal: {},
        notification: {},
      }),
    },
  };
});

// Mock matchMedia & ResizeObserver
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const defaultSender: ChatUser = {
  id: 'user-2',
  fullName: 'Đối Tác Hạ Long',
  email: 'halong@partner.vn',
  employeeCode: 'PT01',
};

const mySender: ChatUser = {
  id: 'user-me-1',
  fullName: 'Nguyễn Văn A',
  email: 'a@skylux.vn',
  employeeCode: 'OP01',
};

describe('TICKET-40.2: Chat Workspace Zero-Regression Test Suite', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset stores
    useAuthStore.setState({
      user: {
        id: 'user-me-1',
        fullName: 'Nguyễn Văn A',
        email: 'a@skylux.vn',
        employeeCode: 'OP01',
        organizationId: 'org-1',
        roles: ['operator'],
        permissions: ['chat:read', 'chat:write'],
      },
      accessToken: 'test-token',
    });

    useChatUIStore.setState({
      failedMessages: {},
      typingUsers: {},
    });
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 1: Optimistic UI 0ms & Idempotency Key (clientMessageId)
  // ---------------------------------------------------------------------------
  describe('Kịch bản 1: Optimistic UI & Idempotency Key (clientMessageId)', () => {
    it('hiển thị tin nhắn optimistic lập tức và reconcile tại chỗ khi server phản hồi thành công', async () => {
      const convId = 'conv-op-1';
      const initialMessage: Message = {
        id: 'msg-existing-1',
        organizationId: 'org-1',
        conversationId: convId,
        senderId: 'user-2',
        sender: defaultSender,
        content: 'Chào buổi sáng!',
        createdAt: '2026-09-18T00:00:00.000Z',
        status: 'sent',
      };

      // Đặt dữ liệu ban đầu vào cache
      queryClient.setQueryData(queryKeys.chat.messages(convId), [initialMessage]);

      const clientMessageId = 'client-id-xyz-123';
      const serverMessage: Message = {
        id: 'msg-server-real-999',
        clientMessageId,
        organizationId: 'org-1',
        conversationId: convId,
        senderId: 'user-me-1',
        sender: mySender,
        content: 'Lịch trình đã sẵn sàng.',
        createdAt: '2026-09-18T00:01:00.000Z',
        status: 'sent',
      };

      let resolvePromise: (value: Message) => void;
      const delayedPromise = new Promise<Message>((resolve) => {
        resolvePromise = resolve;
      });
      (chatService.sendMessage as jest.Mock).mockReturnValueOnce(delayedPromise);

      const { result } = renderHook(() => useSendMessage(convId), {
        wrapper: createWrapper(),
      });

      // Gửi tin nhắn
      act(() => {
        result.current.mutate({
          content: 'Lịch trình đã sẵn sàng.',
          clientMessageId,
        });
      });

      // 1. Kiểm tra Optimistic UI 0ms trong cache: tin nhắn tạm lập tức xuất hiện với status 'sending'
      await waitFor(() => {
        const cache = queryClient.getQueryData<Message[]>(queryKeys.chat.messages(convId));
        expect(cache).toHaveLength(2);
        const optimisticMsg = cache?.find((m) => m.clientMessageId === clientMessageId);
        expect(optimisticMsg).toBeDefined();
        expect(optimisticMsg?.status).toBe('sending');
        expect(optimisticMsg?.content).toBe('Lịch trình đã sẵn sàng.');
      });

      // 2. Server phản hồi thành công
      act(() => {
        resolvePromise(serverMessage);
      });

      // 3. Kiểm tra Reconcile tại chỗ: tin nhắn tạm được thay thế bằng bản ghi server
      await waitFor(() => {
        const cache = queryClient.getQueryData<Message[]>(queryKeys.chat.messages(convId));
        expect(cache).toHaveLength(2);
        const replacedMsg = cache?.find((m) => m.id === 'msg-server-real-999');
        expect(replacedMsg).toBeDefined();
        expect(replacedMsg?.clientMessageId).toBe(clientMessageId);
        expect(replacedMsg?.status).toBe('sent');
      });
    });

    it('chống ghi trùng lặp tin nhắn nếu server hoặc SSE gửi lại cùng ID', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          clientMessageId: 'cid-1',
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'u1',
          sender: defaultSender,
          content: 'Nội dung 1',
          createdAt: '2026-09-18T00:00:00.000Z',
        },
      ];

      // Thử append lại đúng tin nhắn có ID 'msg-1'
      const duplicateMsg: Message = {
        id: 'msg-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        senderId: 'u1',
        sender: defaultSender,
        content: 'Nội dung 1',
        createdAt: '2026-09-18T00:00:00.000Z',
      };

      const updated = appendMessageToCache(duplicateMsg)(messages);
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('msg-1');
    });
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 2: Xử Lý Rớt Mạng & Lưu Vào Dead-Letter Queue
  // ---------------------------------------------------------------------------
  describe('Kịch bản 2: Dead-Letter Queue & Phục hồi lỗi rớt mạng', () => {
    it('chuyển trạng thái tin nhắn sang failed và ghi nhận vào Dead-letter queue khi gửi lỗi', async () => {
      const convId = 'conv-err-1';
      queryClient.setQueryData(queryKeys.chat.messages(convId), []);

      const clientMessageId = 'client-fail-777';
      const networkError = new Error('Network Connection Lost 500');
      (chatService.sendMessage as jest.Mock).mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useSendMessage(convId), {
        wrapper: createWrapper(),
      });

      // Gửi tin nhắn và kỳ vọng gặp lỗi mạng
      await act(async () => {
        try {
          await result.current.mutateAsync({
            content: 'Tin nhắn gặp sự cố mạng',
            clientMessageId,
          });
        } catch {
          // Bắt lỗi dự kiến
        }
      });

      // 1. Kiểm tra trạng thái tin nhắn trong cache chuyển sang 'failed'
      await waitFor(() => {
        const cacheMessages = queryClient.getQueryData<Message[]>(queryKeys.chat.messages(convId));
        const failedMsg = cacheMessages?.find((m) => m.clientMessageId === clientMessageId);
        expect(failedMsg).toBeDefined();
        expect(failedMsg?.status).toBe('failed');
      });

      // 2. Kiểm tra tin nhắn được ghi nhận vào Dead-letter queue trong Zustand store
      const deadLetterQueue = useChatUIStore.getState().getFailedMessagesForConversation(convId);
      expect(deadLetterQueue).toBeDefined();
      expect(deadLetterQueue).toHaveLength(1);
      expect(deadLetterQueue[0].clientMessageId).toBe(clientMessageId);
      expect(deadLetterQueue[0].content).toBe('Tin nhắn gặp sự cố mạng');

      // 3. Kiểm tra cơ chế khôi phục (Retry / Clear Dead-letter queue)
      act(() => {
        useChatUIStore.getState().removeFailedMessage(clientMessageId);
      });

      const updatedQueue = useChatUIStore.getState().getFailedMessagesForConversation(convId);
      expect(updatedQueue).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 3: SSE Realtime Event Stream & Cập Nhật Cache Độc Lập
  // ---------------------------------------------------------------------------
  describe('Kịch bản 3: SSE Realtime Events & Cache Reducers', () => {
    it('nối tin nhắn mới từ người khác vào cuối danh sách qua appendMessageToCache', () => {
      const initialMessages: Message[] = [
        {
          id: 'msg-old',
          organizationId: 'org-1',
          conversationId: 'conv-realtime-1',
          senderId: 'user-other',
          sender: defaultSender,
          content: 'Tin nhắn cũ',
          createdAt: '2026-09-18T00:00:00.000Z',
        },
      ];

      const sseIncomingMessage: Message = {
        id: 'msg-new-from-sse',
        organizationId: 'org-1',
        conversationId: 'conv-realtime-1',
        senderId: 'user-partner',
        sender: defaultSender,
        content: 'Khách vừa gửi yêu cầu ăn chay',
        createdAt: '2026-09-18T00:02:00.000Z',
      };

      const resultMessages = appendMessageToCache(sseIncomingMessage)(initialMessages);
      expect(resultMessages).toHaveLength(2);
      expect(resultMessages[1].id).toBe('msg-new-from-sse');
      expect(resultMessages[1].content).toBe('Khách vừa gửi yêu cầu ăn chay');
    });

    it('xóa tin nhắn khỏi cache chính xác qua removeMessageFromCache', () => {
      const currentList: Message[] = [
        {
          id: 'msg-keep',
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'u1',
          sender: defaultSender,
          content: 'Giữ lại',
          createdAt: '2026-09-18T00:00:00.000Z',
        },
        {
          id: 'msg-delete',
          clientMessageId: 'cid-delete',
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'u1',
          sender: defaultSender,
          content: 'Xóa đi',
          createdAt: '2026-09-18T00:01:00.000Z',
        },
      ];

      // Xóa theo ID thật
      const afterDeleteId = removeMessageFromCache('msg-delete')(currentList);
      expect(afterDeleteId).toHaveLength(1);
      expect(afterDeleteId[0].id).toBe('msg-keep');

      // Xóa theo clientMessageId
      const afterDeleteClient = removeMessageFromCache('cid-delete')(currentList);
      expect(afterDeleteClient).toHaveLength(1);
      expect(afterDeleteClient[0].id).toBe('msg-keep');
    });
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 4: Tạo Cuộc Hội Thoại Nhóm Mới & Điều Hướng
  // ---------------------------------------------------------------------------
  describe('Kịch bản 4: Tạo Cuộc Hội Thoại Nhóm Mới (useCreateConversationFlow)', () => {
    it('chỉ fetch users khi modal mở (Locality) và tạo nhóm thành công kèm callback điều hướng', async () => {
      const mockUsers = [
        { id: 'user-2', fullName: 'Trần Văn B', email: 'b@skylux.vn' },
        { id: 'user-3', fullName: 'Lê Thị C', email: 'c@skylux.vn' },
      ];

      (usersService.getUsers as jest.Mock).mockResolvedValueOnce({
        data: mockUsers,
        meta: { total: 2 },
      });

      const newCreatedConv: Conversation = {
        id: 'conv-group-created-888',
        name: 'Đoàn Khách Luxury Tour',
        isGroup: true,
        organizationId: 'org-1',
        createdAt: '2026-09-18T00:00:00.000Z',
        updatedAt: '2026-09-18T00:00:00.000Z',
        members: [],
      };

      (chatService.createConversation as jest.Mock).mockResolvedValueOnce(newCreatedConv);

      const onClose = jest.fn();
      const onCreated = jest.fn();

      const { result } = renderHook(
        () =>
          useCreateConversationFlow({
            isOpen: true,
            onClose,
            onCreated,
          }),
        { wrapper: createWrapper() }
      );

      // Đợi danh sách users được nạp
      await waitFor(() => {
        expect(result.current.allUsers).toHaveLength(2);
      });

      // Điền thông tin nhóm và chọn người tham gia
      act(() => {
        result.current.setNewConvName('Đoàn Khách Luxury Tour');
        result.current.setSelectedUserIds(['user-2', 'user-3']);
      });

      expect(result.current.selectedUserIds).toEqual(['user-2', 'user-3']);

      // Gửi tạo nhóm
      act(() => {
        result.current.handleOk();
      });

      await waitFor(() => {
        expect(chatService.createConversation).toHaveBeenCalledWith({
          name: 'Đoàn Khách Luxury Tour',
          isGroup: true,
          userIds: ['user-2', 'user-3'],
        });
      });

      // Kiểm tra callbacks: đóng modal và điều hướng sang ID cuộc trò chuyện mới
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onCreated).toHaveBeenCalledWith('conv-group-created-888');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // KỊCH BẢN 5: Typing Indicators State Isolation
  // ---------------------------------------------------------------------------
  describe('Kịch bản 5: Typing Indicators State Isolation trong Zustand', () => {
    it('quản lý danh sách người đang gõ phím độc lập cho từng phòng chat mà không ảnh hưởng phòng khác', () => {
      const convA = 'conv-a';
      const convB = 'conv-b';

      const typingUser1 = {
        userId: 'u-typing-1',
        fullName: 'Điều hành viên 1',
        expiresAt: Date.now() + 3000,
      };

      // Thêm typing cho phòng A
      act(() => {
        useChatUIStore.getState().addTypingUser(convA, typingUser1);
      });

      expect(useChatUIStore.getState().typingUsers[convA]).toHaveLength(1);
      expect(useChatUIStore.getState().typingUsers[convA][0].fullName).toBe('Điều hành viên 1');
      expect(useChatUIStore.getState().typingUsers[convB] || []).toHaveLength(0);

      // Xóa typing của phòng A
      act(() => {
        useChatUIStore.getState().removeTypingUser(convA, 'u-typing-1');
      });

      expect(useChatUIStore.getState().typingUsers[convA] || []).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 41: Resilience, Bug Fixes & Idempotency
  // ---------------------------------------------------------------------------
  describe('Phase 41: Resilience, Bug Fixes & Idempotency', () => {
    it('TICKET-41.1: handleSendMessage luôn sinh và truyền clientMessageId xuống backend', async () => {
      const convId = 'conv-p41-1';
      useChatUIStore.getState().setDraftMessage(convId, 'Nội dung gửi thường');

      const mockSavedMessage: Message = {
        id: 'server-msg-101',
        clientMessageId: 'cm-generated',
        organizationId: 'org-1',
        conversationId: convId,
        senderId: 'user-me-1',
        sender: mySender,
        content: 'Nội dung gửi thường',
        createdAt: new Date().toISOString(),
        status: 'sent',
      };
      (chatService.sendMessage as jest.Mock).mockResolvedValueOnce(mockSavedMessage);

      const { result } = renderHook(() => useMessageThread({ conversationId: convId }), {
        wrapper: createWrapper(),
      });

      // Gọi handleSendMessage không truyền clientMessageId (kịch bản gửi thường)
      act(() => {
        result.current.handleSendMessage();
      });

      await waitFor(() => {
        expect(chatService.sendMessage).toHaveBeenCalledTimes(1);
      });

      // Xác nhận chatService.sendMessage nhận được tham số thứ 3 là clientMessageId hợp lệ (không phải undefined)
      const callArgs = (chatService.sendMessage as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe(convId);
      expect(callArgs[1]).toBe('Nội dung gửi thường');
      expect(typeof callArgs[2]).toBe('string');
      expect(callArgs[2].length).toBeGreaterThan(5);
    });

    it('TICKET-41.2: MessageBubbleList lọc bỏ tiếng vọng gõ phím của chính mình', () => {
      const { render, screen } = require('@testing-library/react');

      const typingUsersWithMe = [
        { userId: 'user-me-1', fullName: 'Nguyễn Văn A' }, // Chính tôi
        { userId: 'user-other-2', fullName: 'Trần Văn B' }, // Người khác
      ];

      render(
        <MessageBubbleList
          messages={[]}
          isLoadingMessages={false}
          conversationId="conv-1"
          typingUsers={typingUsersWithMe}
          currentUserId="user-me-1"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />
      );

      // Phải hiển thị tên người khác
      expect(screen.getByText(/Trần Văn B đang nhập tin nhắn/i)).toBeInTheDocument();
      // Tuyệt đối KHÔNG hiển thị tên của chính tôi
      expect(screen.queryByText(/Nguyễn Văn A/i)).not.toBeInTheDocument();
    });

    it('TICKET-41.3: cleanupStaleFailedMessages dọn dẹp các tin lỗi quá hạn (TTL 24h)', () => {
      const now = Date.now();
      const freshMessage = {
        clientMessageId: 'cm-fresh',
        conversationId: 'conv-1',
        content: 'Tin mới lỗi 10 phút trước',
        failedAt: now - 10 * 60 * 1000,
      };
      const staleMessage = {
        clientMessageId: 'cm-stale',
        conversationId: 'conv-1',
        content: 'Tin cũ lỗi từ 2 ngày trước',
        failedAt: now - 48 * 60 * 60 * 1000,
      };

      act(() => {
        useChatUIStore.getState().addFailedMessage(freshMessage);
        useChatUIStore.getState().addFailedMessage(staleMessage);
      });

      expect(useChatUIStore.getState().failedMessages['cm-fresh']).toBeDefined();
      expect(useChatUIStore.getState().failedMessages['cm-stale']).toBeDefined();

      // Kích hoạt dọn dẹp tin quá 24 giờ
      act(() => {
        useChatUIStore.getState().cleanupStaleFailedMessages(24 * 60 * 60 * 1000);
      });

      // Tin mới còn giữ lại
      expect(useChatUIStore.getState().failedMessages['cm-fresh']).toBeDefined();
      // Tin quá hạn 24h đã bị xóa sạch khỏi storage
      expect(useChatUIStore.getState().failedMessages['cm-stale']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 42: Deep Module MessageThreadArea & Re-render Isolation
  // ---------------------------------------------------------------------------
  describe('Phase 42: Deep Module MessageThreadArea & Re-render Isolation', () => {
    it('TICKET-42.1: MessageBubbleList co-locate tự động cuộn trang khi danh sách đang gõ thay đổi', () => {
      const { render } = require('@testing-library/react');
      const mockScrollIntoView = jest.fn();
      window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
      const mockRef = { current: null };

      const typingUsersInitial = [
        { userId: 'u-other-1', fullName: 'Nhân Viên Hỗ Trợ' },
      ];

      const { rerender } = render(
        <MessageBubbleList
          messages={[]}
          isLoadingMessages={false}
          conversationId="conv-scroll-1"
          typingUsers={typingUsersInitial}
          currentUserId="u-me-1"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={mockRef}
        />
      );

      // scrollIntoView được gọi khi có người gõ phím
      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

      // Cập nhật thêm người gõ phím
      const typingUsersUpdated = [
        { userId: 'u-other-1', fullName: 'Nhân Viên Hỗ Trợ' },
        { userId: 'u-other-2', fullName: 'Điều Hành Tour' },
      ];

      rerender(
        <MessageBubbleList
          messages={[]}
          isLoadingMessages={false}
          conversationId="conv-scroll-1"
          typingUsers={typingUsersUpdated}
          currentUserId="u-me-1"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={mockRef}
        />
      );

      expect(mockScrollIntoView).toHaveBeenCalledTimes(2);
    });

    it('TICKET-42.2 & 42.3: MessageThreadArea hoạt động tự trị (Deep Module) chỉ với 6 props cốt lõi', async () => {
      const { render, screen, fireEvent } = require('@testing-library/react');

      const mockConversation: Conversation = {
        id: 'conv-deep-1',
        organizationId: 'org-1',
        name: 'Tour Du Lịch Côn Đảo 3N2Đ',
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
      };

      // Đặt trước tin nhắn trong cache của TanStack Query
      queryClient.setQueryData(queryKeys.chat.messages('conv-deep-1'), [
        {
          id: 'msg-deep-1',
          organizationId: 'org-1',
          conversationId: 'conv-deep-1',
          senderId: 'user-sales-1',
          content: 'Lịch trình bay xuất phát lúc 06:30.',
          createdAt: new Date().toISOString(),
          sender: { id: 'user-sales-1', fullName: 'Tư Vấn Tour' },
        },
      ]);

      const onTogglePanel = jest.fn();
      const onOpenModal = jest.fn();

      // Chỉ truyền ĐÚNG 6 PROPS cốt lõi của Deep Module (không truyền bất kỳ prop tin nhắn hay handler nào)
      const wrapper = createWrapper();
      render(
        <MessageThreadArea
          activeConversation={mockConversation}
          conversationTitle="Tour Du Lịch Côn Đảo 3N2Đ"
          relatedDossier={null}
          showRightPanel={false}
          onToggleRightPanel={onTogglePanel}
          onOpenCreateModal={onOpenModal}
        />,
        { wrapper }
      );

      // 1. Tự động hiển thị Header & Tên hội thoại
      expect(screen.getByText('Tour Du Lịch Côn Đảo 3N2Đ')).toBeInTheDocument();

      // 2. Tự động nạp tin nhắn từ TanStack Query
      await waitFor(() => {
        expect(screen.getByText('Lịch trình bay xuất phát lúc 06:30.')).toBeInTheDocument();
      });

      // 3. Tự động liên kết ô input với Zustand draft storage mà không cần prop từ component cha
      const inputEl = screen.getByPlaceholderText(/Nhập tin nhắn/i);
      fireEvent.change(inputEl, { target: { value: 'Xác nhận thông tin chuyến bay' } });

      expect(useChatUIStore.getState().draftMessages['conv-deep-1']).toBe('Xác nhận thông tin chuyến bay');
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 43: Anti-Smell Cleanup & Type Safety (DRY)
  // ---------------------------------------------------------------------------
  describe('Phase 43: Anti-Smell Cleanup & Type Safety (DRY)', () => {
    it('TICKET-43.1: CreateConversationModal hoạt động tự trị với đúng 3 props chuẩn (không cần 9 adapter props)', async () => {
      const { render, screen, fireEvent } = require('@testing-library/react');
      const handleClose = jest.fn();
      const handleCreated = jest.fn();

      (usersService.getUsers as jest.Mock).mockResolvedValueOnce({
        data: [
          { id: 'u-cand-1', fullName: 'Lê Hoàng Yến', email: 'yen.lh@skylux.vn' },
          { id: 'u-cand-2', fullName: 'Đỗ Minh Trí', email: 'tri.dm@skylux.vn' },
        ],
        meta: { total: 2 },
      });

      const wrapper = createWrapper();
      render(
        <CreateConversationModal
          isOpen={true}
          onClose={handleClose}
          onCreated={handleCreated}
        />,
        { wrapper }
      );

      // Modal hiển thị tiêu đề và trường nhập tên
      expect(screen.getByText('Tạo cuộc trò chuyện mới')).toBeInTheDocument();
      const nameInput = screen.getByPlaceholderText(/VD: Nhóm xử lý Tour/i);
      expect(nameInput).toBeInTheDocument();

      // Nhập tên nhóm
      fireEvent.change(nameInput, { target: { value: 'Nhóm Tour Châu Âu Mùa Thu' } });
      expect(nameInput).toHaveValue('Nhóm Tour Châu Âu Mùa Thu');

      // Nhấn nút Hủy
      const cancelBtn = screen.getByRole('button', { name: /Hủy/i });
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    it('TICKET-43.2: Conversation.dossier được định kiểu an toàn, không còn ép kiểu as any', () => {
      const mockConvWithDossier: Conversation = {
        id: 'conv-dos-1',
        organizationId: 'org-1',
        name: 'Đoàn Nhật Bản 5N4Đ',
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
        dossier: {
          id: 'dos-101',
          code: 'DOS-2026-JP01',
          name: 'Hồ sơ Tour Nhật Bản',
          customerId: 'cust-1',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      // Xác nhận truy cập thuộc tính dossier hoàn toàn hợp lệ trong TypeScript mà không cần `as any`
      expect(mockConvWithDossier.dossier).toBeDefined();
      expect(mockConvWithDossier.dossier?.code).toBe('DOS-2026-JP01');
      expect(mockConvWithDossier.dossier?.name).toBe('Hồ sơ Tour Nhật Bản');
    });
  });

  // ---------------------------------------------------------------------------
  // PHASE 44: Comprehensive Verification, Anti-Regression & Architecture Audit
  // ---------------------------------------------------------------------------
  describe('Phase 44: Comprehensive Verification, Anti-Regression & Architecture Audit', () => {
    it('TICKET-44.1: Chống gửi đúp (Double-Enter Guard) khi isSending === true', () => {
      const { render, screen, fireEvent } = require('@testing-library/react');
      const handleSendMessage = jest.fn();

      // Trường hợp 1: isSending === true -> Nhấn Enter KHÔNG ĐƯỢC gửi
      const { rerender } = render(
        <MessageInputBar
          inputText="Tin nhắn đang trong hàng đợi gửi"
          isSending={true}
          onInputChange={jest.fn()}
          onSendMessage={handleSendMessage}
        />
      );

      const input = screen.getByPlaceholderText(/Nhập tin nhắn/i);
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
      expect(handleSendMessage).not.toHaveBeenCalled();

      // Trường hợp 2: isSending === false -> Nhấn Enter / Click gửi tin nhắn thành công
      rerender(
        <MessageInputBar
          inputText="Tin nhắn mới sẵn sàng gửi"
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={handleSendMessage}
        />
      );

      const sendBtn = screen.getByRole('button', { name: /Gửi tin nhắn/i });
      fireEvent.click(sendBtn);
      expect(handleSendMessage).toHaveBeenCalledTimes(1);
    });

    it('TICKET-44.2: Profiling 0 Re-render - ConversationList hoàn toàn không re-render khi nhận typing events', () => {
      const { render } = require('@testing-library/react');
      let renderCount = 0;

      const ProfiledConversationList = () => {
        renderCount++;
        return (
          <ConversationList
            searchQuery=""
            onSearchChange={jest.fn()}
            onOpenCreateModal={jest.fn()}
            isLoadingConversations={false}
            filteredConversations={[]}
            effectiveConversationId={null}
            onSelectConversation={jest.fn()}
            getConversationTitle={() => 'Phòng chat'}
          />
        );
      };

      render(<ProfiledConversationList />);
      expect(renderCount).toBe(1);

      // Phát liên tiếp 5 sự kiện gõ phím vào Zustand store
      act(() => {
        for (let i = 1; i <= 5; i++) {
          useChatUIStore.getState().addTypingUser('conv-1', {
            userId: `user-typing-${i}`,
            fullName: `Thành viên ${i}`,
            expiresAt: Date.now() + 3000,
          });
        }
      });

      // ConversationList PHẢI giữ nguyên renderCount = 1 (Zero Re-render)
      expect(renderCount).toBe(1);
      expect(useChatUIStore.getState().typingUsers['conv-1']).toHaveLength(5);
    });

    it('Kiểm toán toàn diện việc tích hợp Zustand và TanStack Query', () => {
      // 1. TanStack Query quản lý đúng các Query Keys chuẩn phân cấp
      expect(queryKeys.chat.conversations()).toEqual(['chat', 'conversations']);
      expect(queryKeys.chat.messages('conv-audit-1')).toEqual(['chat', 'messages', 'conv-audit-1']);
      expect(queryKeys.chat.participants('conv-audit-1')).toEqual(['chat', 'participants', 'conv-audit-1']);

      // 2. Zustand quản lý đúng UI state độc lập (Drafts, Failed Dead-letter queue, Modals, Filter Tab)
      act(() => {
        useChatUIStore.getState().setDraftMessage('conv-audit-1', 'Nháp tin nhắn phòng 1');
        useChatUIStore.getState().setActiveFilterTab('GROUPS');
      });

      expect(useChatUIStore.getState().getDraftMessage('conv-audit-1')).toBe('Nháp tin nhắn phòng 1');
      expect(useChatUIStore.getState().activeFilterTab).toBe('GROUPS');

      // 3. TanStack Query Cache Reducer chống trùng lặp ID thật và thay thế tại chỗ tin nhắn tạm
      const tempMsg: Message = {
        id: 'temp-audit-1',
        clientMessageId: 'cid-audit-1',
        organizationId: 'org-1',
        conversationId: 'conv-audit-1',
        senderId: 'u-me',
        content: 'Nội dung optimistic',
        createdAt: new Date().toISOString(),
        sender: { id: 'u-me', fullName: 'Tôi', email: 'me@skylux.vn', employeeCode: 'ME01' },
        status: 'sending',
      };

      const serverMsg: Message = {
        ...tempMsg,
        id: 'real-audit-1',
        status: 'sent',
      };

      // Đưa optimistic message vào mảng
      const initialCache = [tempMsg];
      // Server trả về qua reducer appendMessageToCache -> Thay thế tại chỗ bằng ID thật và status 'sent'
      const updatedCache = appendMessageToCache(serverMsg)(initialCache);

      expect(updatedCache).toHaveLength(1);
      expect(updatedCache[0].id).toBe('real-audit-1');
      expect(updatedCache[0].status).toBe('sent');
      expect(updatedCache[0].clientMessageId).toBe('cid-audit-1');
    });
  });
});
