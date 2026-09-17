import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FailedChatMessage {
  clientMessageId: string;
  conversationId: string;
  content: string;
  failedAt: number;
}

export interface TypingUser {
  userId: string;
  fullName: string;
  expiresAt: number;
}

export interface ChatUIState {
  draftMessages: Record<string, string>;
  getDraftMessage: (conversationId: string) => string;
  setDraftMessage: (conversationId: string, content: string) => void;
  clearDraftMessage: (conversationId: string) => void;
  failedMessages: Record<string, FailedChatMessage>;
  addFailedMessage: (msg: FailedChatMessage) => void;
  removeFailedMessage: (clientMessageId: string) => void;
  clearFailedMessages: (conversationId?: string) => void;
  cleanupStaleFailedMessages: (maxAgeMs?: number) => void;
  getFailedMessagesForConversation: (conversationId: string) => FailedChatMessage[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilterTab: 'ALL' | 'UNREAD' | 'GROUPS' | 'DOSSIERS';
  setActiveFilterTab: (tab: 'ALL' | 'UNREAD' | 'GROUPS' | 'DOSSIERS') => void;
  isCreateGroupModalOpen: boolean;
  setIsCreateGroupModalOpen: (open: boolean) => void;
  // TICKET-38.1: Fine-grained real-time typing indicators
  typingUsers: Record<string, TypingUser[]>;
  addTypingUser: (conversationId: string, user: TypingUser) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  cleanupExpiredTypingUsers: () => void;
  clearTypingUsers: (conversationId?: string) => void;
}

export const useChatUIStore = create<ChatUIState>()(
  persist(
    (set, get) => ({
      draftMessages: {},
      getDraftMessage: (conversationId: string) => {
        return get().draftMessages[conversationId] || '';
      },
      setDraftMessage: (conversationId: string, content: string) => {
        set((state) => ({
          draftMessages: {
            ...state.draftMessages,
            [conversationId]: content,
          },
        }));
      },
      clearDraftMessage: (conversationId: string) => {
        set((state) => {
          const next = { ...state.draftMessages };
          delete next[conversationId];
          return { draftMessages: next };
        });
      },
      failedMessages: {},
      addFailedMessage: (msg: FailedChatMessage) => {
        set((state) => ({
          failedMessages: {
            ...state.failedMessages,
            [msg.clientMessageId]: msg,
          },
        }));
      },
      removeFailedMessage: (clientMessageId: string) => {
        set((state) => {
          const next = { ...state.failedMessages };
          delete next[clientMessageId];
          return { failedMessages: next };
        });
      },
      clearFailedMessages: (conversationId?: string) => {
        set((state) => {
          if (!conversationId) return { failedMessages: {} };
          const next: Record<string, FailedChatMessage> = {};
          for (const [id, msg] of Object.entries(state.failedMessages)) {
            if (msg.conversationId !== conversationId) {
              next[id] = msg;
            }
          }
          return { failedMessages: next };
        });
      },
      cleanupStaleFailedMessages: (maxAgeMs = 24 * 60 * 60 * 1000) => {
        const now = Date.now();
        set((state) => {
          let hasChange = false;
          const next: Record<string, FailedChatMessage> = {};
          for (const [id, msg] of Object.entries(state.failedMessages)) {
            if (now - msg.failedAt <= maxAgeMs) {
              next[id] = msg;
            } else {
              hasChange = true;
            }
          }
          if (!hasChange) return state;
          return { failedMessages: next };
        });
      },
      getFailedMessagesForConversation: (conversationId: string) => {
        return Object.values(get().failedMessages).filter(
          (m) => m.conversationId === conversationId,
        );
      },
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      activeFilterTab: 'ALL',
      setActiveFilterTab: (tab) => set({ activeFilterTab: tab }),
      isCreateGroupModalOpen: false,
      setIsCreateGroupModalOpen: (open) => set({ isCreateGroupModalOpen: open }),
      typingUsers: {},
      addTypingUser: (conversationId: string, user: TypingUser) => {
        set((state) => {
          const currentList = state.typingUsers[conversationId] || [];
          const filtered = currentList.filter((u) => u.userId !== user.userId);
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: [...filtered, user],
            },
          };
        });
      },
      removeTypingUser: (conversationId: string, userId: string) => {
        set((state) => {
          const currentList = state.typingUsers[conversationId];
          if (!currentList) return state;
          return {
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: currentList.filter((u) => u.userId !== userId),
            },
          };
        });
      },
      cleanupExpiredTypingUsers: () => {
        const now = Date.now();
        set((state) => {
          let hasChange = false;
          const next: Record<string, TypingUser[]> = {};
          for (const [convId, list] of Object.entries(state.typingUsers)) {
            const active = list.filter((u) => u.expiresAt > now);
            if (active.length !== list.length) {
              hasChange = true;
            }
            if (active.length > 0) {
              next[convId] = active;
            }
          }
          if (!hasChange) return state;
          return { typingUsers: next };
        });
      },
      clearTypingUsers: (conversationId?: string) => {
        set((state) => {
          if (!conversationId) return { typingUsers: {} };
          const next = { ...state.typingUsers };
          delete next[conversationId];
          return { typingUsers: next };
        });
      },
    }),
    {
      name: 'skylux-chat-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        draftMessages: state.draftMessages,
        activeFilterTab: state.activeFilterTab,
        failedMessages: state.failedMessages,
      }),
    },
  ),
);

