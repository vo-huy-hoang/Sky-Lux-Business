import { create } from 'zustand';
import { DossierWorkflowAction } from '../types';

export interface DossierUIState {
  modalAction: DossierWorkflowAction;
  actionNote: string;
  activeTab: string;
  visitedTabs: Record<string, boolean>;
  setModalAction: (action: DossierWorkflowAction) => void;
  setActionNote: (note: string) => void;
  resetModal: () => void;
  setActiveTab: (tab: string) => void;
  markTabVisited: (tab: string) => void;
  resetUIState: () => void;
}

export const useDossierUIStore = create<DossierUIState>()((set) => ({
  modalAction: null,
  actionNote: '',
  activeTab: 'overview',
  visitedTabs: { overview: true },
  setModalAction: (action) => set({ modalAction: action }),
  setActionNote: (note) => set({ actionNote: note }),
  resetModal: () => set({ modalAction: null, actionNote: '' }),
  setActiveTab: (tab) =>
    set((state) => ({
      activeTab: tab,
      visitedTabs: {
        ...(state.visitedTabs || { overview: true }),
        [tab]: true,
      },
    })),
  markTabVisited: (tab) =>
    set((state) => ({
      visitedTabs: {
        ...(state.visitedTabs || { overview: true }),
        [tab]: true,
      },
    })),
  resetUIState: () =>
    set({
      modalAction: null,
      actionNote: '',
      activeTab: 'overview',
      visitedTabs: { overview: true },
    }),
}));
