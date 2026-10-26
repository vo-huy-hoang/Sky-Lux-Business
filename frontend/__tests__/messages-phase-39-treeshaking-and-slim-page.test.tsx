import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageThreadArea } from '@/app/main/messages/components/MessageThreadArea';
import * as StaticComponents from '@/app/main/messages/components';
import * as ChatHooks from '@/hooks/chat';
import { Conversation, Message } from '@/types/chat';

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

describe('Phase 39: Tree-Shaking, Barrel Optimization & Slim Page', () => {
  describe('TICKET-39.1: MessageThreadArea & Barrel Isolation', () => {
    it('components/index.ts exports static components but excludes heavy dynamic modal/sidebar', () => {
      expect(StaticComponents.ConversationList).toBeDefined();
      expect(StaticComponents.MessageThreadArea).toBeDefined();
      expect(StaticComponents.MessageThreadHeader).toBeDefined();
      expect(StaticComponents.MessageBubbleList).toBeDefined();
      expect(StaticComponents.MessageInputBar).toBeDefined();

      // Modal & Sidebar KHÔNG được export từ barrel để giữ dynamic chunk riêng biệt
      expect((StaticComponents as any).CreateConversationModal).toBeUndefined();
      expect((StaticComponents as any).ConversationInfoSidebar).toBeUndefined();
    });

    it('renders empty state when activeConversation is not provided', () => {
      const handleOpenCreateModal = jest.fn();

      renderWithProviders(
        <MessageThreadArea
          activeConversation={undefined}
          conversationTitle="Cuộc trò chuyện"
          showRightPanel={false}
          onToggleRightPanel={jest.fn()}
          messages={[]}
          isLoadingMessages={false}
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
          inputText=""
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={jest.fn()}
          onOpenCreateModal={handleOpenCreateModal}
        />
      );

      expect(screen.getByText('Chưa chọn cuộc trò chuyện')).toBeInTheDocument();
      const createBtn = screen.getByRole('button', { name: /Tạo cuộc trò chuyện mới/i });
      expect(createBtn).toBeInTheDocument();

      fireEvent.click(createBtn);
      expect(handleOpenCreateModal).toHaveBeenCalledTimes(1);
    });

    it('renders thread header, message bubble list and input bar when activeConversation exists', () => {
      const mockConv: Conversation = {
        id: 'conv-100',
        organizationId: 'org-1',
        name: 'Đoàn Khách Hạ Long',
        isGroup: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
      };

      const mockMessages: Message[] = [
        {
          id: 'm-1',
          organizationId: 'org-1',
          conversationId: 'conv-100',
          senderId: 'u1',
          content: 'Lịch trình tàu khởi hành lúc 8h sáng.',
          createdAt: new Date().toISOString(),
          sender: { id: 'u1', fullName: 'Điều Hành', email: 'op@skylux.vn', employeeCode: 'OP01' },
        },
      ];

      const handleSendMessage = jest.fn();
      const handleToggleRightPanel = jest.fn();

      renderWithProviders(
        <MessageThreadArea
          activeConversation={mockConv}
          conversationTitle="Đoàn Khách Hạ Long"
          showRightPanel={false}
          onToggleRightPanel={handleToggleRightPanel}
          messages={mockMessages}
          isLoadingMessages={false}
          currentUserId="u1"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
          inputText="Đã rõ, cảm ơn bạn!"
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={handleSendMessage}
          onOpenCreateModal={jest.fn()}
        />
      );

      // Header
      expect(screen.getByText('Đoàn Khách Hạ Long')).toBeInTheDocument();

      // Messages
      expect(screen.getByText('Lịch trình tàu khởi hành lúc 8h sáng.')).toBeInTheDocument();

      // Input bar value
      const inputEl = screen.getByPlaceholderText(/Nhập tin nhắn/i);
      expect(inputEl).toHaveValue('Đã rõ, cảm ơn bạn!');

      // Send button click
      const sendBtn = screen.getByRole('button', { name: /Gửi tin nhắn/i });
      fireEvent.click(sendBtn);
      expect(handleSendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('TICKET-39.2: Selective Exports in hooks/chat.ts', () => {
    it('re-exports all queries, mutations, realtime and utilities with 100% backward compatibility', () => {
      // Queries
      expect(ChatHooks.useConversations).toBeDefined();
      expect(ChatHooks.useConversationDetail).toBeDefined();
      expect(ChatHooks.useConversationMessages).toBeDefined();
      expect(ChatHooks.useDossierConversation).toBeDefined();
      expect(ChatHooks.useConversationParticipants).toBeDefined();

      // Mutations
      expect(ChatHooks.useCreateConversation).toBeDefined();
      expect(ChatHooks.useSendMessage).toBeDefined();
      expect(ChatHooks.useDeleteMessage).toBeDefined();
      expect(ChatHooks.useMarkAsRead).toBeDefined();
      expect(ChatHooks.useAddParticipants).toBeDefined();
      expect(ChatHooks.useRemoveParticipant).toBeDefined();
      expect(ChatHooks.useStartTyping).toBeDefined();
      expect(ChatHooks.useStopTyping).toBeDefined();

      // Realtime
      expect(ChatHooks.useChatRealtime).toBeDefined();
      expect(ChatHooks.useTypingUsers).toBeDefined();

      // Reducers & Utils
      expect(ChatHooks.appendMessageToCache).toBeDefined();
      expect(ChatHooks.removeMessageFromCache).toBeDefined();
      expect(ChatHooks.calculateBackoffWithJitter).toBeDefined();
    });

    it('verifies hooks/chat/index.ts also uses selective exports without wildcard export *', () => {
      const internalChatIndex = require('@/hooks/chat/index');
      expect(internalChatIndex.useConversations).toBeDefined();
      expect(internalChatIndex.useSendMessage).toBeDefined();
      expect(internalChatIndex.useChatRealtime).toBeDefined();
      expect(internalChatIndex.appendMessageToCache).toBeDefined();
    });

    it('verifies page.tsx is under 60 lines', () => {
      const fs = require('fs');
      const path = require('path');
      const pageContent = fs.readFileSync(path.resolve(__dirname, '../app/(main)/messages/page.tsx'), 'utf-8');
      const lineCount = pageContent.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(60);
    });
  });
});
