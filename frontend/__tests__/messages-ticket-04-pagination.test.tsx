import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MessageBubbleList } from '@/app/main/messages/components/MessageBubbleList';
import { useMessageThread } from '@/app/main/messages/hooks/useMessageThread';
import { chatService } from '@/services/chat.service';
import { Message } from '@/types/chat';

jest.mock('@/services/chat.service', () => ({
  chatService: {
    getConversationMessages: jest.fn(),
    uploadAttachment: jest.fn(),
  },
}));

jest.mock('@/hooks/chat', () => ({
  useConversationMessages: jest.fn(),
  useDeleteMessage: () => ({ mutate: jest.fn() }),
  useSendMessage: () => ({ mutate: jest.fn(), isPending: false }),
  useStartTyping: () => ({ mutate: jest.fn() }),
  useStopTyping: () => ({ mutate: jest.fn() }),
  useTypingUsers: () => [],
}));

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

describe('TICKET-CHAT-04: Frontend Infinite Scrolling & Message Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MessageBubbleList UI', () => {
    const mockMessages: Message[] = [
      {
        id: 'msg-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        senderId: 'user-me',
        content: 'Tin nhắn gần nhất',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'user-me',
          fullName: 'Tôi',
          email: 'me@example.com',
          employeeCode: 'EMP001',
        },
      },
    ];

    it('renders "Tải thêm tin nhắn cũ" button when hasMore is true', () => {
      const mockOnLoadOlder = jest.fn();

      render(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          hasMore={true}
          isLoadingOlder={false}
          onLoadOlder={mockOnLoadOlder}
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />,
      );

      const loadMoreBtn = screen.getByLabelText('Tải thêm tin nhắn cũ');
      expect(loadMoreBtn).toBeInTheDocument();
      fireEvent.click(loadMoreBtn);
      expect(mockOnLoadOlder).toHaveBeenCalledTimes(1);
    });

    it('does not render "Tải thêm tin nhắn cũ" button when hasMore is false', () => {
      render(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          hasMore={false}
          isLoadingOlder={false}
          onLoadOlder={jest.fn()}
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />,
      );

      expect(screen.queryByLabelText('Tải thêm tin nhắn cũ')).not.toBeInTheDocument();
    });

    it('displays loading state while older messages are being fetched', () => {
      render(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          hasMore={true}
          isLoadingOlder={true}
          onLoadOlder={jest.fn()}
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />,
      );

      expect(screen.getByText('Đang tải tin nhắn cũ...')).toBeInTheDocument();
    });
  });

  describe('useMessageThread Pagination Logic', () => {
    it('prepends older messages and updates hasMore state when onLoadOlder is triggered', async () => {
      const { useConversationMessages } = require('@/hooks/chat');
      const initial30Messages: Message[] = Array.from(
        { length: 30 },
        (_, i) => ({
          id: `initial-msg-${i + 1}`,
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'user-sales',
          content: `Tin nhắn ban đầu ${i + 1}`,
          createdAt: new Date(1700000000000 + (i + 30) * 1000).toISOString(),
          sender: {
            id: 'user-sales',
            fullName: 'Lê Sales',
            email: 'sales@skylux.vn',
            employeeCode: 'EMP002',
          },
        }),
      );

      (useConversationMessages as jest.Mock).mockReturnValue({
        data: initial30Messages,
        isLoading: false,
      });

      const older30Messages: Message[] = Array.from(
        { length: 30 },
        (_, i) => ({
          id: `older-msg-${i + 1}`,
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'user-sales',
          content: `Tin nhắn cũ hơn ${i + 1}`,
          createdAt: new Date(1700000000000 + i * 1000).toISOString(),
          sender: {
            id: 'user-sales',
            fullName: 'Lê Sales',
            email: 'sales@skylux.vn',
            employeeCode: 'EMP002',
          },
        }),
      );

      (chatService.getConversationMessages as jest.Mock).mockResolvedValueOnce(
        older30Messages,
      );

      const { result } = renderHook(() =>
        useMessageThread({ conversationId: 'conv-1' }),
      );

      expect(result.current.messages).toHaveLength(30);
      expect(result.current.hasMore).toBe(true);

      // Trigger load older
      await act(async () => {
        await result.current.onLoadOlder();
      });

      expect(chatService.getConversationMessages).toHaveBeenCalledWith('conv-1', {
        limit: 30,
        before: 'initial-msg-1',
      });

      // Now messages contain both older (30) + initial (30) = 60 messages
      expect(result.current.messages).toHaveLength(60);
      expect(result.current.messages[0].id).toBe('older-msg-1');
      expect(result.current.messages[59].id).toBe('initial-msg-30');
    });
  });
});
