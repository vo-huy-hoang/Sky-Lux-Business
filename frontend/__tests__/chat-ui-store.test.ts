import { useChatUIStore } from '../lib/stores/chat-ui-store';

describe('useChatUIStore (Zustand Chat UI Store)', () => {
  beforeEach(() => {
    // Reset state before each test
    useChatUIStore.setState({
      draftMessages: {},
      searchQuery: '',
      activeFilterTab: 'ALL',
      isCreateGroupModalOpen: false,
    });
  });

  it('should initialize with default state', () => {
    const state = useChatUIStore.getState();
    expect(state.draftMessages).toEqual({});
    expect(state.searchQuery).toBe('');
    expect(state.activeFilterTab).toBe('ALL');
    expect(state.isCreateGroupModalOpen).toBe(false);
  });

  it('should set and get draft message per conversation', () => {
    const convId1 = 'conv-123';
    const convId2 = 'conv-456';

    useChatUIStore.getState().setDraftMessage(convId1, 'Hello Client A');
    useChatUIStore.getState().setDraftMessage(convId2, 'Hello Client B');

    expect(useChatUIStore.getState().getDraftMessage(convId1)).toBe('Hello Client A');
    expect(useChatUIStore.getState().getDraftMessage(convId2)).toBe('Hello Client B');
    expect(useChatUIStore.getState().getDraftMessage('non-existent')).toBe('');
  });

  it('should clear draft message for specific conversation', () => {
    const convId = 'conv-123';
    useChatUIStore.getState().setDraftMessage(convId, 'Draft to be cleared');
    expect(useChatUIStore.getState().getDraftMessage(convId)).toBe('Draft to be cleared');

    useChatUIStore.getState().clearDraftMessage(convId);
    expect(useChatUIStore.getState().getDraftMessage(convId)).toBe('');
  });

  it('should update search query', () => {
    useChatUIStore.getState().setSearchQuery('Tour Phú Quốc');
    expect(useChatUIStore.getState().searchQuery).toBe('Tour Phú Quốc');
  });

  it('should set active filter tab', () => {
    useChatUIStore.getState().setActiveFilterTab('UNREAD');
    expect(useChatUIStore.getState().activeFilterTab).toBe('UNREAD');

    useChatUIStore.getState().setActiveFilterTab('DOSSIERS');
    expect(useChatUIStore.getState().activeFilterTab).toBe('DOSSIERS');
  });

  it('should toggle create group modal', () => {
    useChatUIStore.getState().setIsCreateGroupModalOpen(true);
    expect(useChatUIStore.getState().isCreateGroupModalOpen).toBe(true);

    useChatUIStore.getState().setIsCreateGroupModalOpen(false);
    expect(useChatUIStore.getState().isCreateGroupModalOpen).toBe(false);
  });

  it('should manage failed messages queue for optimistic retry', () => {
    expect(useChatUIStore.getState().failedMessages).toEqual({});

    const failedMsg1 = {
      clientMessageId: 'cm-1',
      conversationId: 'conv-100',
      content: 'Tin nhắn gửi lỗi 1',
      failedAt: Date.now(),
    };
    const failedMsg2 = {
      clientMessageId: 'cm-2',
      conversationId: 'conv-100',
      content: 'Tin nhắn gửi lỗi 2',
      failedAt: Date.now(),
    };
    const failedMsg3 = {
      clientMessageId: 'cm-3',
      conversationId: 'conv-200',
      content: 'Tin nhắn gửi lỗi khác',
      failedAt: Date.now(),
    };

    useChatUIStore.getState().addFailedMessage(failedMsg1);
    useChatUIStore.getState().addFailedMessage(failedMsg2);
    useChatUIStore.getState().addFailedMessage(failedMsg3);

    const conv100Failed = useChatUIStore.getState().getFailedMessagesForConversation('conv-100');
    expect(conv100Failed).toHaveLength(2);
    expect(conv100Failed.map((m) => m.clientMessageId)).toEqual(['cm-1', 'cm-2']);

    // Remove single message on successful retry
    useChatUIStore.getState().removeFailedMessage('cm-1');
    expect(useChatUIStore.getState().getFailedMessagesForConversation('conv-100')).toHaveLength(1);

    // Clear failed messages for conversation
    useChatUIStore.getState().clearFailedMessages('conv-100');
    expect(useChatUIStore.getState().getFailedMessagesForConversation('conv-100')).toHaveLength(0);
    expect(useChatUIStore.getState().getFailedMessagesForConversation('conv-200')).toHaveLength(1);
  });
});

