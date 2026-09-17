import '@testing-library/jest-dom';
import React from 'react';

jest.mock('@ant-design/icons', () => ({
  MessageOutlined: () => <span data-testid="message-icon" />,
  PlusOutlined: () => <span data-testid="plus-icon" />,
  SearchOutlined: () => <span data-testid="search-icon" />,
  SendOutlined: () => <span data-testid="send-icon" />,
  DeleteOutlined: () => <span data-testid="delete-icon" />,
  UserOutlined: () => <span data-testid="user-icon" />,
  TeamOutlined: () => <span data-testid="team-icon" />,
  CloseOutlined: () => <span data-testid="close-icon" />,
  FolderOpenOutlined: () => <span data-testid="folder-icon" />,
  InfoCircleOutlined: () => <span data-testid="info-icon" />,
  MoreOutlined: () => <span data-testid="more-icon" />,
  CheckOutlined: () => <span data-testid="check-icon" />,
  CheckCircleOutlined: () => <span data-testid="check-circle-icon" />,
  ClockCircleOutlined: () => <span data-testid="clock-icon" />,
  ExclamationCircleOutlined: () => <span data-testid="exclamation-icon" />,
}));

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessagesPage from '@/app/main/messages/page';
import CreateConversationModal, { CreateConversationModal as NamedModal } from '@/app/main/messages/components/CreateConversationModal';
import ConversationInfoSidebar, { ConversationInfoSidebar as NamedSidebar } from '@/app/main/messages/components/ConversationInfoSidebar';

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={testQueryClient}>{ui}</QueryClientProvider>);

// Mock matchMedia for AntD components
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
});

// Mock hook useActiveChatWorkspace
const mockWorkspaceState = {
  isOperator: false,
  user: { id: 'user-1', fullName: 'Operator 1' },
  searchQuery: '',
  setSearchQuery: jest.fn(),
  isCreateModalOpen: false,
  setIsCreateModalOpen: jest.fn(),
  isLoadingConversations: false,
  filteredConversations: [],
  effectiveConversationId: null,
  setSelectedConversationId: jest.fn(),
  getConversationTitle: jest.fn(() => 'Test Conversation'),
  activeConversation: null as any,
  relatedDossier: null,
  showRightPanel: false,
  setShowRightPanel: jest.fn(),
  messages: [],
  isLoadingMessages: false,
  typingUsers: [],
  deleteMessage: jest.fn(),
  handleSendMessage: jest.fn(),
  messagesEndRef: { current: null },
  inputText: '',
  isSending: false,
  handleInputChange: jest.fn(),
  isCreating: false,
  newConvName: '',
  setNewConvName: jest.fn(),
  selectedUserIds: [],
  setSelectedUserIds: jest.fn(),
  allUsers: [],
  handleCreateConversation: jest.fn(),
};

jest.mock('@/app/main/messages/hooks/useActiveChatWorkspace', () => ({
  useActiveChatWorkspace: () => mockWorkspaceState,
}));

describe('Phase 36: Dynamic Code-Splitting for Messages Page', () => {
  it('TICKET-36.1 & TICKET-36.2: exports both default and named exports for dynamic compatibility', () => {
    expect(CreateConversationModal).toBeDefined();
    expect(NamedModal).toBe(CreateConversationModal);

    expect(ConversationInfoSidebar).toBeDefined();
    expect(NamedSidebar).toBe(ConversationInfoSidebar);
  });

  it('renders initial empty state without mounting lazy modal or sidebar', () => {
    mockWorkspaceState.isCreateModalOpen = false;
    mockWorkspaceState.showRightPanel = false;
    mockWorkspaceState.activeConversation = null;

    renderWithProviders(<MessagesPage />);

    // Empty state should be visible
    expect(screen.getByText('Chưa chọn cuộc trò chuyện')).toBeInTheDocument();
    expect(screen.getByText('Tạo cuộc trò chuyện mới')).toBeInTheDocument();

    // Lazy components should NOT be mounted in DOM
    expect(screen.queryByText('Tên cuộc trò chuyện (Tùy chọn)')).not.toBeInTheDocument();
    expect(screen.queryByText('Thông tin hội thoại')).not.toBeInTheDocument();
  });

  it('renders CreateConversationModal when isCreateModalOpen is true', async () => {
    mockWorkspaceState.isCreateModalOpen = true;

    renderWithProviders(<MessagesPage />);

    // Modal is dynamically loaded, so wait for it
    expect(await screen.findByText('Tên cuộc trò chuyện (Tùy chọn)')).toBeInTheDocument();
  });

  it('renders ConversationInfoSidebar when showRightPanel and activeConversation exist', async () => {
    mockWorkspaceState.isCreateModalOpen = false;
    mockWorkspaceState.activeConversation = {
      id: 'conv-1',
      name: 'Tour Hà Nội - Sa Pa',
      isGroup: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      members: [],
    };
    mockWorkspaceState.showRightPanel = true;

    renderWithProviders(<MessagesPage />);

    expect(await screen.findByText('Thông tin hội thoại')).toBeInTheDocument();
  });
});
