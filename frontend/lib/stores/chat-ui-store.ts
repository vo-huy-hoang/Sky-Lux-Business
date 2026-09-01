import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ChatUIState {
  draftMessages: Record<string, string>;
  getDraftMessage: (conversationId: string) => string;
  setDraftMessage: (conversationId: string, content: string) => void;
  clearDraftMessage: (conversationId: string) => void;
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
      }),
    },
  ),
);
