import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageInputBar } from '@/app/main/messages/components/MessageInputBar';
import { MessageBubbleList } from '@/app/main/messages/components/MessageBubbleList';
import { chatService } from '@/services/chat.service';
import { Message } from '@/types/chat';

jest.mock('@/services/chat.service', () => ({
  chatService: {
    uploadAttachment: jest.fn(),
  },
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

  if (!window.URL) {
    (window as unknown as { URL: Record<string, unknown> }).URL = {};
  }
  window.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
  window.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TICKET-CHAT-02: Message Attachments UI', () => {
  describe('MessageInputBar', () => {
    it('renders attachment triggers (paperclip and picture buttons) and file inputs', () => {
      render(
        <MessageInputBar
          inputText=""
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={jest.fn()}
        />,
      );

      expect(screen.getByLabelText('Đính kèm tệp')).toBeInTheDocument();
      expect(screen.getByLabelText('Gửi ảnh')).toBeInTheDocument();
      expect(screen.getByTestId('chat-file-input')).toBeInTheDocument();
      expect(screen.getByTestId('chat-image-input')).toBeInTheDocument();
    });

    it('uploads file and displays attachment preview chip with remove button', async () => {
      (chatService.uploadAttachment as jest.Mock).mockResolvedValueOnce({
        url: '/uploads/chat/flight-ticket.jpg',
        originalName: 'flight-ticket.jpg',
        fileSize: 204800,
        mimeType: 'image/jpeg',
        thumbnailUrl: '/uploads/chat/flight-ticket.jpg',
      });

      render(
        <MessageInputBar
          inputText=""
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={jest.fn()}
        />,
      );

      const fileInput = screen.getByTestId('chat-file-input');
      const testFile = new File(['fake-content'], 'flight-ticket.jpg', {
        type: 'image/jpeg',
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(chatService.uploadAttachment).toHaveBeenCalledWith(testFile);
      });

      expect(await screen.findByText('flight-ticket.jpg')).toBeInTheDocument();
      expect(screen.getByLabelText('Xóa đính kèm flight-ticket.jpg')).toBeInTheDocument();

      // Remove attachment
      fireEvent.click(screen.getByLabelText('Xóa đính kèm flight-ticket.jpg'));
      expect(screen.queryByText('flight-ticket.jpg')).not.toBeInTheDocument();
    });

    it('submits message with attachments when send is triggered', async () => {
      const mockSendMessage = jest.fn();
      (chatService.uploadAttachment as jest.Mock).mockResolvedValueOnce({
        url: '/uploads/chat/voucher.pdf',
        originalName: 'voucher.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
      });

      render(
        <MessageInputBar
          inputText="Gửi xác nhận cọc"
          isSending={false}
          onInputChange={jest.fn()}
          onSendMessage={mockSendMessage}
        />,
      );

      const fileInput = screen.getByTestId('chat-file-input');
      const testFile = new File(['doc'], 'voucher.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText('voucher.pdf')).toBeInTheDocument();
      });

      const sendBtn = screen.getByLabelText('Gửi tin nhắn');
      fireEvent.click(sendBtn);

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Gửi xác nhận cọc',
        undefined,
        [
          {
            url: '/uploads/chat/voucher.pdf',
            originalName: 'voucher.pdf',
            fileSize: 102400,
            mimeType: 'application/pdf',
          },
        ],
      );
    });
  });

  describe('MessageBubbleList Attachment Rendering', () => {
    it('renders image attachment thumbnail and preview', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg-1',
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'user-2',
          content: 'Vé máy bay khứ hồi',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-2',
            fullName: 'Lê Sales',
            email: 'sales@example.com',
            employeeCode: 'EMP002',
          },
          attachments: [
            {
              url: '/uploads/chat/airticket.jpg',
              originalName: 'airticket.jpg',
              fileSize: 204800,
              mimeType: 'image/jpeg',
              thumbnailUrl: '/uploads/chat/airticket.jpg',
            },
          ],
        },
      ];

      render(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />,
      );

      expect(screen.getByText('Vé máy bay khứ hồi')).toBeInTheDocument();
      const img = screen.getByAltText('airticket.jpg');
      expect(img).toBeInTheDocument();
    });

    it('renders downloadable document card for PDF and Office files', () => {
      const mockMessages: Message[] = [
        {
          id: 'msg-2',
          organizationId: 'org-1',
          conversationId: 'conv-1',
          senderId: 'user-me',
          content: 'Lịch trình tour chi tiết',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-me',
            fullName: 'Tôi',
            email: 'me@example.com',
            employeeCode: 'EMP001',
          },
          attachments: [
            {
              url: '/uploads/chat/tour-itinerary.pdf',
              originalName: 'tour-itinerary.pdf',
              fileSize: 524288,
              mimeType: 'application/pdf',
            },
          ],
        },
      ];

      render(
        <MessageBubbleList
          messages={mockMessages}
          isLoadingMessages={false}
          conversationId="conv-1"
          currentUserId="user-me"
          onDeleteMessage={jest.fn()}
          onRetryMessage={jest.fn()}
          messagesEndRef={{ current: null }}
        />,
      );

      expect(screen.getByText('tour-itinerary.pdf')).toBeInTheDocument();
      expect(screen.getByText('512 KB')).toBeInTheDocument();
      const downloadLink = screen.getByTitle('Tải xuống tour-itinerary.pdf');
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href');
    });
  });
});
