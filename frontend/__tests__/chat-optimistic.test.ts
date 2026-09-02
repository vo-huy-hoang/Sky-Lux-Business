import { QueryClient } from '@tanstack/react-query';
import { useChatUIStore } from '../lib/stores/chat-ui-store';
import { useAuthStore } from '../lib/stores/auth-store';
import { Message } from '../types/chat';

describe('Phase 22: Cache-First Optimistic UI & Idempotency Key in Chat', () => {
  let queryClient: QueryClient;
  const conversationId = 'conv-test-optimistic';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.setState({
      user: {
        id: 'user-me',
        organizationId: 'org-1',
        fullName: 'Nguyễn Văn Tôi',
        email: 'me@skylux.vn',
        employeeCode: 'EMP001',
        roles: [],
        permissions: [],
        departmentId: 'dep-1',
      },

      isAuthenticated: true,
      accessToken: 'fake-token',
    });

    useChatUIStore.setState({
      draftMessages: {},
      failedMessages: {},
    });
  });

  it('should immediately inject optimistic message with sending status into cache', async () => {
    const existingMessages: Message[] = [
      {
        id: 'msg-existing-1',
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-other',
        content: 'Chào bạn!',
        createdAt: '2026-09-02T10:00:00Z',
        sender: {
          id: 'user-other',
          fullName: 'Đối tác',
          email: 'partner@example.com',
          employeeCode: 'PART01',
        },
        status: 'sent',
      },
    ];

    queryClient.setQueryData(['conversation-messages', conversationId], existingMessages);

    // Simulate onMutate behavior
    const clientMessageId = 'client-uuid-12345';
    const tempId = `temp-${clientMessageId}`;
    const optimisticMessage: Message = {
      id: tempId,
      clientMessageId,
      organizationId: 'org-1',
      conversationId,
      senderId: 'user-me',
      content: 'Tin nhắn gửi nhanh 0ms',
      createdAt: new Date().toISOString(),
      sender: {
        id: 'user-me',
        fullName: 'Nguyễn Văn Tôi',
        email: 'me@skylux.vn',
        employeeCode: 'EMP001',
      },
      status: 'sending',
    };

    queryClient.setQueryData<Message[]>(
      ['conversation-messages', conversationId],
      (old = []) => [...old, optimisticMessage],
    );

    const cachedMessages = queryClient.getQueryData<Message[]>([
      'conversation-messages',
      conversationId,
    ]);

    expect(cachedMessages).toHaveLength(2);
    expect(cachedMessages![1].id).toBe(tempId);
    expect(cachedMessages![1].status).toBe('sending');
    expect(cachedMessages![1].clientMessageId).toBe(clientMessageId);
    expect(cachedMessages![1].content).toBe('Tin nhắn gửi nhanh 0ms');
  });

  it('should transition optimistic message to failed and store in failedMessages on error', async () => {
    const clientMessageId = 'client-uuid-fail-test';
    const tempId = `temp-${clientMessageId}`;

    const optimisticMessage: Message = {
      id: tempId,
      clientMessageId,
      organizationId: 'org-1',
      conversationId,
      senderId: 'user-me',
      content: 'Tin nhắn sẽ bị lỗi mạng',
      createdAt: new Date().toISOString(),
      sender: {
        id: 'user-me',
        fullName: 'Nguyễn Văn Tôi',
        email: 'me@skylux.vn',
        employeeCode: 'EMP001',
      },
      status: 'sending',
    };

    queryClient.setQueryData<Message[]>(
      ['conversation-messages', conversationId],
      [optimisticMessage],
    );

    // Simulate onError
    useChatUIStore.getState().addFailedMessage({
      clientMessageId,
      conversationId,
      content: 'Tin nhắn sẽ bị lỗi mạng',
      failedAt: Date.now(),
    });

    queryClient.setQueryData<Message[]>(
      ['conversation-messages', conversationId],
      (old = []) =>
        old.map((msg) =>
          msg.id === tempId || msg.clientMessageId === clientMessageId
            ? { ...msg, status: 'failed' }
            : msg,
        ),
    );

    const cachedMessages = queryClient.getQueryData<Message[]>([
      'conversation-messages',
      conversationId,
    ]);

    expect(cachedMessages![0].status).toBe('failed');

    const failedInStore = useChatUIStore
      .getState()
      .getFailedMessagesForConversation(conversationId);
    expect(failedInStore).toHaveLength(1);
    expect(failedInStore[0].clientMessageId).toBe(clientMessageId);
  });

  it('should reconcile temporary message with real server message and remove from failed store on success', async () => {
    const clientMessageId = 'client-uuid-reconcile';
    const tempId = `temp-${clientMessageId}`;

    // Previous state with temp message
    queryClient.setQueryData<Message[]>(
      ['conversation-messages', conversationId],
      [
        {
          id: tempId,
          clientMessageId,
          organizationId: 'org-1',
          conversationId,
          senderId: 'user-me',
          content: 'Tin nhắn gửi thành công',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-me',
            fullName: 'Nguyễn Văn Tôi',
            email: 'me@skylux.vn',
            employeeCode: 'EMP001',
          },
          status: 'sending',
        },
      ],
    );

    // Server responds with permanent DB record
    const serverMessage: Message = {
      id: 'msg-real-db-uuid',
      organizationId: 'org-1',
      conversationId,
      senderId: 'user-me',
      content: 'Tin nhắn gửi thành công',
      createdAt: '2026-09-02T10:05:00Z',
      sender: {
        id: 'user-me',
        fullName: 'Nguyễn Văn Tôi',
        email: 'me@skylux.vn',
        employeeCode: 'EMP001',
      },
    };

    // Simulate onSuccess
    useChatUIStore.getState().removeFailedMessage(clientMessageId);

    queryClient.setQueryData<Message[]>(
      ['conversation-messages', conversationId],
      (old = []) => {
        const withoutTemp = old.filter(
          (msg) => msg.id !== tempId && msg.clientMessageId !== clientMessageId,
        );
        return [...withoutTemp, { ...serverMessage, status: 'sent' }];
      },
    );

    const reconciled = queryClient.getQueryData<Message[]>([
      'conversation-messages',
      conversationId,
    ]);

    expect(reconciled).toHaveLength(1);
    expect(reconciled![0].id).toBe('msg-real-db-uuid');
    expect(reconciled![0].status).toBe('sent');
    expect(
      useChatUIStore.getState().getFailedMessagesForConversation(conversationId),
    ).toHaveLength(0);
  });
});
