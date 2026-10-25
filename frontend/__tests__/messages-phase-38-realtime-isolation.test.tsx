import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageBubbleList } from '@/app/main/messages/components/MessageBubbleList';
import { ConversationInfoSidebar } from '@/app/main/messages/components/ConversationInfoSidebar';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useDossierDetail } from '@/hooks/dossiers';
import { Conversation, Message } from '@/types/chat';

// Mock antd icons
jest.mock('@ant-design/icons', () => ({
  DeleteOutlined: () => <span data-testid="delete-icon" />,
  LoadingOutlined: () => <span data-testid="loading-icon" />,
  MessageOutlined: () => <span data-testid="message-icon" />,
  ReloadOutlined: () => <span data-testid="reload-icon" />,
  CloseOutlined: () => <span data-testid="close-icon" />,
  FolderOpenOutlined: () => <span data-testid="folder-icon" />,
}));

// Mock useDossierDetail hook
jest.mock('@/hooks/dossiers', () => ({
  useDossierDetail: jest.fn(),
}));

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>);

// Mock matchMedia & ResizeObserver for AntD components
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

describe('Phase 38: Fine-Grained SSE Realtime & State Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatUIStore.setState({
      typingUsers: {},
    });
  });

  describe('TICKET-38.1: MessageBubbleList Isolated Typing Indicator', () => {
    const mockMessages: Message[] = [
      {
        id: 'msg-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        senderId: 'user-other',
        content: 'Chào buổi sáng!',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'user-other',
          fullName: 'Nguyễn Văn A',
          email: 'a@skylux.vn',
          employeeCode: 'EMP001',
        },
      },
    ];

    it('renders typing indicator reactively from Zustand store when conversationId matches', () => {
      renderWithProviders(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />
      );

      // Ban đầu không có typing indicator
      expect(screen.queryByText(/đang nhập tin nhắn/i)).not.toBeInTheDocument();

      // Giả lập sự kiện typing đến cho conv-1
      act(() => {
        useChatUIStore.getState().addTypingUser('conv-1', {
          userId: 'user-other',
          fullName: 'Nguyễn Văn A',
          expiresAt: Date.now() + 5000,
        });
      });

      // Indicator phải hiển thị ngay lập tức
      expect(screen.getByText(/Nguyễn Văn A đang nhập tin nhắn/i)).toBeInTheDocument();

      // Giả lập sự kiện typing dừng
      act(() => {
        useChatUIStore.getState().removeTypingUser('conv-1', 'user-other');
      });

      // Indicator biến mất
      expect(screen.queryByText(/đang nhập tin nhắn/i)).not.toBeInTheDocument();
    });

    it('does not display typing indicator when typing event belongs to a different conversation', () => {
      renderWithProviders(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />
      );

      // Typing event đến cho conv-999
      act(() => {
        useChatUIStore.getState().addTypingUser('conv-999', {
          userId: 'user-other',
          fullName: 'Trần Văn C',
          expiresAt: Date.now() + 5000,
        });
      });

      // Không hiển thị trong conv-1
      expect(screen.queryByText(/đang nhập tin nhắn/i)).not.toBeInTheDocument();
    });

    it('retains backward compatibility if typingUsers prop is passed explicitly', () => {
      renderWithProviders(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          typingUsers={[{ userId: 'u3', fullName: 'Lê Văn Khách' }]}
          currentUserId="user-me"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />
      );

      expect(screen.getByText(/Lê Văn Khách đang nhập tin nhắn/i)).toBeInTheDocument();
    });
  });

  describe('TICKET-38.2: Co-locate useDossierDetail into ConversationInfoSidebar', () => {
    const mockConversationWithDossier: Conversation = {
      id: 'conv-10',
      organizationId: 'org-1',
      name: 'Trao đổi đoàn Nhật Bản',
      isGroup: true,
      dossierId: 'dossier-tokyo-10',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          id: 'm1',
          conversationId: 'conv-10',
          userId: 'user-me',
          role: 'ADMIN',
          joinedAt: new Date().toISOString(),
          user: {
            id: 'user-me',
            fullName: 'Điều Hành Viên',
            email: 'op@skylux.vn',
            employeeCode: 'OP01',
          },
        },
      ],
    };

    const mockConversationWithoutDossier: Conversation = {
      id: 'conv-20',
      organizationId: 'org-1',
      name: 'Nhóm Nội Bộ',
      isGroup: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [],
    };

    it('lazily queries useDossierDetail with enabled=true only when dossierId exists', () => {
      (useDossierDetail as jest.Mock).mockReturnValue({
        data: {
          id: 'dossier-tokyo-10',
          code: 'DOS-2026-TOKYO',
          name: 'Tour Tokyo Hè 2026',
          status: 'IN_REVIEW',
          customer: { displayName: 'Tập đoàn ABC' },
          route: 'Hà Nội - Tokyo - Kyoto',
        },
        isLoading: false,
      });

      renderWithProviders(
        <ConversationInfoSidebar
          activeConversation={mockConversationWithDossier}
          currentUserId="user-me"
          onClose={jest.fn()}
        />
      );

      // useDossierDetail được gọi với dossierId và options { enabled: true }
      expect(useDossierDetail).toHaveBeenCalledWith(
        'dossier-tokyo-10',
        expect.objectContaining({ enabled: true })
      );

      // Hiển thị đầy đủ thông tin hồ sơ
      expect(screen.getByText('DOS-2026-TOKYO')).toBeInTheDocument();
      expect(screen.getByText('Tour Tokyo Hè 2026')).toBeInTheDocument();
      expect(screen.getByText(/Tập đoàn ABC/)).toBeInTheDocument();
      expect(screen.getByText(/Hà Nội - Tokyo - Kyoto/)).toBeInTheDocument();
    });

    it('renders skeleton while dossier detail is loading', () => {
      (useDossierDetail as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { container } = renderWithProviders(
        <ConversationInfoSidebar
          activeConversation={mockConversationWithDossier}
          currentUserId="user-me"
          onClose={jest.fn()}
        />
      );

      expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
    });

    it('disables query and shows fallback box when conversation has no dossierId', () => {
      (useDossierDetail as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderWithProviders(
        <ConversationInfoSidebar
          activeConversation={mockConversationWithoutDossier}
          currentUserId="user-me"
          onClose={jest.fn()}
        />
      );

      expect(useDossierDetail).toHaveBeenCalledWith(
        '',
        expect.objectContaining({ enabled: false })
      );

      expect(
        screen.getByText(/Hội thoại chung \(Không gắn với hồ sơ tour\)/i)
      ).toBeInTheDocument();
    });
  });
});
