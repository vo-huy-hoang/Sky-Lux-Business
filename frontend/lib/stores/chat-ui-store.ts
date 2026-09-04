import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FailedChatMessage {
  clientMessageId: string;
  conversationId: string;
  content: string;
  failedAt: number;
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
  getFailedMessagesForConversation: (conversationId: string) => FailedChatMessage[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilterTab: 'ALL' | 'UNREAD' | 'GROUPS' | 'DOSSIERS';
  setActiveFilterTab: (tab: 'ALL' | 'UNREAD' | 'GROUPS' | 'DOSSIERS') => void;
  isCreateGroupModalOpen: boolean;
  setIsCreateGroupModalOpen: (open: boolean) => void;
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

