import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
} from '@/hooks/chat';
import { chatService } from '@/services/chat.service';

jest.mock('@/services/chat.service', () => ({
  chatService: {
    getConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    sendMessage: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useChat hooks', () => {
  const conversationId = 'conv-uuid-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockConversations = [
    {
      id: conversationId,
      organizationId: 'org-uuid-1',
      name: 'Nhóm Tour Phú Quốc',
      isGroup: true,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      members: [],
    },
  ];

  const mockMessages = [
    {
      id: 'msg-1',
      organizationId: 'org-uuid-1',
      conversationId,
      senderId: 'user-1',
      content: 'Xin chào đội ngũ SkyLux!',
      createdAt: '2026-09-01T00:00:00.000Z',
      sender: {
        id: 'user-1',
        fullName: 'Nguyễn Văn A',
        email: 'anv@skylux.vn',
        employeeCode: 'SL001',
      },
    },
  ];

  it('useConversations fetches list of conversations', async () => {
    (chatService.getConversations as jest.Mock).mockResolvedValueOnce(
      mockConversations,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConversations(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockConversations);
    expect(chatService.getConversations).toHaveBeenCalled();
  });

  it('useConversationMessages fetches messages for active conversation', async () => {
    (chatService.getConversationMessages as jest.Mock).mockResolvedValueOnce(
      mockMessages,
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useConversationMessages(conversationId),
      {
        wrapper: Wrapper,
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMessages);
    expect(chatService.getConversationMessages).toHaveBeenCalledWith(
      conversationId,
      { signal: expect.anything() },
    );
  });


  it('useSendMessage mutates and sends message', async () => {
    const sentMessage = {
      ...mockMessages[0],
      id: 'msg-2',
      content: 'Báo giá đã hoàn tất!',
    };
    (chatService.sendMessage as jest.Mock).mockResolvedValueOnce(sentMessage);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendMessage(conversationId), {
      wrapper: Wrapper,
    });

    result.current.mutate('Báo giá đã hoàn tất!');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatService.sendMessage).toHaveBeenCalledWith(
      conversationId,
      'Báo giá đã hoàn tất!',
      undefined,
    );
  });

  it('useSendMessage passes clientMessageId for idempotency', async () => {
    const conversationId = 'conv-uuid-123';
    const sentMessage = {
      id: 'msg-3',
      content: 'Tin nhắn gửi lại',
    };
    (chatService.sendMessage as jest.Mock).mockResolvedValueOnce(sentMessage);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSendMessage(conversationId), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      content: 'Tin nhắn gửi lại',
      clientMessageId: 'cmid-custom-123',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatService.sendMessage).toHaveBeenCalledWith(
      conversationId,
      'Tin nhắn gửi lại',
      'cmid-custom-123',
    );
  });
});

