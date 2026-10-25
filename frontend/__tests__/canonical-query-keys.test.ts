import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-keys';
import { Message, ConversationMember } from '../types/chat';

describe('Phase 26: Canonical Query Keys Synchronization & Ad-hoc Cache Elimination', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  describe('Chat Module Canonical Keys', () => {
    const conversationId = 'conv-test-123';

    it('should share identical query key between message query and realtime SSE listener', () => {
      const messagesKey = queryKeys.chat.messages(conversationId);
      expect(messagesKey).toEqual(['chat', 'messages', conversationId]);

      // Seed message list in cache
      queryClient.setQueryData<Message[]>(messagesKey, []);

      // Simulate incoming SSE message.created event updating cache via canonical key
      const newMessage: Message = {
        id: 'msg-sse-001',
        organizationId: 'org-1',
        conversationId,
        senderId: 'user-2',
        content: 'Xin chào thời gian thực!',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'user-2',
          fullName: 'Lê Văn Khách',
          email: 'customer@example.com',
          employeeCode: 'CUST01',
        },
        status: 'sent',
      };

      queryClient.setQueryData<Message[]>(messagesKey, (old = []) => [...old, newMessage]);

      // Component subscribed to queryKeys.chat.messages(conversationId) immediately observes data
      const activeData = queryClient.getQueryData<Message[]>(messagesKey);
      expect(activeData).toHaveLength(1);
      expect(activeData![0].id).toBe('msg-sse-001');
      expect(activeData![0].content).toBe('Xin chào thời gian thực!');
    });

    it('should correctly invalidate conversations list and unread count via canonical keys', () => {
      const convListKey = queryKeys.chat.conversations();
      const unreadKey = queryKeys.chat.unreadCount();

      expect(convListKey).toEqual(['chat', 'conversations']);
      expect(unreadKey).toEqual(['chat', 'unread-count']);

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      queryClient.invalidateQueries({ queryKey: convListKey });
      queryClient.invalidateQueries({ queryKey: unreadKey });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: convListKey });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: unreadKey });
    });

    it('should update conversation participants via canonical key', () => {
      const participantsKey = queryKeys.chat.participants(conversationId);
      expect(participantsKey).toEqual(['chat', 'participants', conversationId]);

      const newMember: ConversationMember = {
        id: 'cm-001',
        conversationId,
        userId: 'user-colleague',
        role: 'MEMBER',
        joinedAt: new Date().toISOString(),
        user: {
          id: 'user-colleague',
          fullName: 'Trần Đồng Nghiệp',
          email: 'colleague@skylux.vn',
          employeeCode: 'EMP002',
        },
      };

      queryClient.setQueryData<ConversationMember[]>(participantsKey, (old = []) => [...old, newMember]);

      const participants = queryClient.getQueryData<ConversationMember[]>(participantsKey);
      expect(participants).toHaveLength(1);
      expect(participants![0].userId).toBe('user-colleague');
    });

    it('should produce canonical dossier conversation key', () => {
      const dossierId = 'dossier-tour-456';
      const key = queryKeys.chat.dossierConversation(dossierId);
      expect(key).toEqual(['chat', 'dossier', dossierId]);
    });
  });

  describe('Cross-Module Ad-hoc Cache Elimination', () => {
    it('should provide canonical key for dossier detail', () => {
      const dossierId = 'dossier-789';
      const key = queryKeys.dossiers.detail(dossierId);
      expect(key).toEqual(['dossiers', 'detail', dossierId]);
    });

    it('should provide canonical keys for customer detail and list', () => {
      const customerId = 'cust-101';
      expect(queryKeys.customers.detail(customerId)).toEqual(['customers', 'detail', customerId]);
      expect(queryKeys.customers.all).toEqual(['customers']);
    });

    it('should provide canonical keys for supplier detail and all suppliers', () => {
      const supplierId = 'supp-202';
      expect(queryKeys.suppliers.detail(supplierId)).toEqual(['suppliers', 'detail', supplierId]);
      expect(queryKeys.suppliers.all).toEqual(['suppliers']);
    });

    it('should provide canonical key for current user auth/me', () => {
      expect(queryKeys.users.me()).toEqual(['users', 'me']);
    });
  });
});
