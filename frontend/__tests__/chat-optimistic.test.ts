import { QueryClient } from '@tanstack/react-query';
import { useChatUIStore } from '../lib/stores/chat-ui-store';
import { useAuthStore } from '../lib/stores/auth-store';
import { Message, ChatEvent } from '../types/chat';
import { queryKeys } from '../lib/query-keys';
import { appendMessageToCache, removeMessageFromCache } from '../hooks/chat';

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

    queryClient.setQueryData(queryKeys.chat.messages(conversationId), existingMessages);

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
      queryKeys.chat.messages(conversationId),
      (old = []) => [...old, optimisticMessage],
    );

    const cachedMessages = queryClient.getQueryData<Message[]>(
      queryKeys.chat.messages(conversationId),
    );

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
      queryKeys.chat.messages(conversationId),
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
      queryKeys.chat.messages(conversationId),
      (old = []) =>
        old.map((msg) =>
          msg.id === tempId || msg.clientMessageId === clientMessageId
            ? { ...msg, status: 'failed' }
            : msg,
        ),
    );

    const cachedMessages = queryClient.getQueryData<Message[]>(
      queryKeys.chat.messages(conversationId),
    );

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
      queryKeys.chat.messages(conversationId),
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
      queryKeys.chat.messages(conversationId),
      (old = []) => {
        const withoutTemp = old.filter(
          (msg) => msg.id !== tempId && msg.clientMessageId !== clientMessageId,
        );
        return [...withoutTemp, { ...serverMessage, status: 'sent' }];
      },
    );

    const reconciled = queryClient.getQueryData<Message[]>(
      queryKeys.chat.messages(conversationId),
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled![0].id).toBe('msg-real-db-uuid');
    expect(reconciled![0].status).toBe('sent');
    expect(
      useChatUIStore.getState().getFailedMessagesForConversation(conversationId),
    ).toHaveLength(0);
  });

  it('Phase 26: should update canonical queryKeys.chat.messages when another user sends an SSE message', () => {
    // Initial conversation state in cache
    const initialMessages: Message[] = [
      {
        id: 'msg-1',
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-me',
        content: 'Chào bạn!',
        createdAt: '2026-09-02T10:00:00Z',
        sender: {
          id: 'user-me',
          fullName: 'Nguyễn Văn Tôi',
          email: 'me@skylux.vn',
          employeeCode: 'EMP001',
        },
        status: 'sent',
      },
    ];

    queryClient.setQueryData(queryKeys.chat.messages(conversationId), initialMessages);

    // Another user sends a message, arriving via SSE event
    const incomingEvent: ChatEvent = {
      type: 'message.created',
      payload: {
        id: 'msg-from-colleague-uuid',
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-colleague',
        content: 'Chào Tôi, mình vừa nhận hồ sơ tour mới nhé!',
        createdAt: '2026-09-02T10:01:00Z',
        sender: {
          id: 'user-colleague',
          fullName: 'Trần Đồng Nghiệp',
          email: 'colleague@skylux.vn',
          employeeCode: 'EMP002',
        },
        status: 'sent',
      },
    };

    // Simulate useChatRealtime onmessage handling with canonical queryKeys
    const newMessage = incomingEvent.payload as Message;
    if (newMessage.conversationId === conversationId) {
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        (old = []) => [...old, newMessage],
      );
    }

    // Verify cache has received colleague message seamlessly in real time
    const updatedMessages = queryClient.getQueryData<Message[]>(
      queryKeys.chat.messages(conversationId),
    );

    expect(updatedMessages).toHaveLength(2);
    expect(updatedMessages![1].id).toBe('msg-from-colleague-uuid');
    expect(updatedMessages![1].sender.fullName).toBe('Trần Đồng Nghiệp');
    expect(updatedMessages![1].content).toBe('Chào Tôi, mình vừa nhận hồ sơ tour mới nhé!');
  });

  describe('Phase 27: Smart In-Place Cache Reconciler & Zero-Flicker Deduplication', () => {
    it('should replace optimistic message in-place without flicker when SSE arrives BEFORE HTTP response', () => {
      const clientMessageId = 'client-uuid-race-condition';
      const tempId = `temp-${clientMessageId}`;

      // 1. Optimistic message added during onMutate
      const initialCache: Message[] = [
        {
          id: tempId,
          clientMessageId,
          organizationId: 'org-1',
          conversationId,
          senderId: 'user-me',
          content: 'Nội dung gửi nhanh qua mạng lag',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-me',
            fullName: 'Nguyễn Văn Tôi',
            email: 'me@skylux.vn',
            employeeCode: 'EMP001',
          },
          status: 'sending',
        },
      ];

      queryClient.setQueryData(queryKeys.chat.messages(conversationId), initialCache);

      // 2. SSE event message.created arrives BEFORE HTTP mutation resolves
      const sseMessage: Message = {
        id: 'msg-real-from-sse-uuid',
        clientMessageId,
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-me',
        content: 'Nội dung gửi nhanh qua mạng lag',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'user-me',
          fullName: 'Nguyễn Văn Tôi',
          email: 'me@skylux.vn',
          employeeCode: 'EMP001',
        },
        status: 'sent' as const,
      };

      // appendMessageToCache processes the incoming SSE message
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        appendMessageToCache(sseMessage),
      );

      const cacheAfterSSE = queryClient.getQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
      );

      // CRITICAL ASSERTION: Length MUST remain 1, NOT 2 (No duplication flicker!)
      expect(cacheAfterSSE).toHaveLength(1);
      expect(cacheAfterSSE![0].id).toBe('msg-real-from-sse-uuid');
      expect(cacheAfterSSE![0].clientMessageId).toBe(clientMessageId);
      expect(cacheAfterSSE![0].status).toBe('sent');

      // 3. HTTP mutation onSuccess completes subsequently
      const savedMessage = sseMessage;
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        (old = []) => {
          const withoutTemp = old.filter(
            (msg) => msg.id !== tempId && msg.clientMessageId !== clientMessageId,
          );
          if (withoutTemp.some((msg) => msg.id === savedMessage.id)) {
            return withoutTemp.map((msg) =>
              msg.id === savedMessage.id ? ({ ...savedMessage, status: 'sent' as const }) : msg,
            );
          }
          return [...withoutTemp, { ...savedMessage, status: 'sent' as const }];
        },
      );

      const finalCache = queryClient.getQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
      );

      expect(finalCache).toHaveLength(1);
      expect(finalCache![0].id).toBe('msg-real-from-sse-uuid');
    });

    it('should ignore duplicate SSE events with same message ID (Idempotency)', () => {
      const message: Message = {
        id: 'msg-idempotent-001',
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-me',
        content: 'Tin nhắn chống trùng lặp',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'user-me',
          fullName: 'Nguyễn Văn Tôi',
          email: 'me@skylux.vn',
          employeeCode: 'EMP001',
        },
        status: 'sent' as const,
      };

      // Append once
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        appendMessageToCache(message),
      );

      // Append second time (e.g. duplicate SSE delivery or reconnect burst)
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        appendMessageToCache(message),
      );

      const cache = queryClient.getQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
      );

      expect(cache).toHaveLength(1);
      expect(cache![0].id).toBe('msg-idempotent-001');
    });

    it('should remove message from cache by either id or clientMessageId', () => {
      const clientMessageId = 'client-delete-target';
      const tempId = `temp-${clientMessageId}`;

      const initialCache: Message[] = [
        {
          id: tempId,
          clientMessageId,
          organizationId: 'org-1',
          conversationId,
          senderId: 'user-me',
          content: 'Tin nhắn sắp bị hủy',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-me',
            fullName: 'Nguyễn Văn Tôi',
            email: 'me@skylux.vn',
            employeeCode: 'EMP001',
          },
          status: 'sending' as const,
        },
      ];

      queryClient.setQueryData(queryKeys.chat.messages(conversationId), initialCache);

      // Delete by clientMessageId
      queryClient.setQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
        removeMessageFromCache(clientMessageId),
      );

      const cacheAfterClientDelete = queryClient.getQueryData<Message[]>(
        queryKeys.chat.messages(conversationId),
      );
      expect(cacheAfterClientDelete).toHaveLength(0);
    });
  });
});
