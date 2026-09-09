import { create } from 'zustand';
import { DossierWorkflowAction } from '../types';

export interface DossierUIState {
  modalAction: DossierWorkflowAction;
  actionNote: string;
  activeTab: string;
  setModalAction: (action: DossierWorkflowAction) => void;
  setActionNote: (note: string) => void;
  resetModal: () => void;
  setActiveTab: (tab: string) => void;
}

export const useDossierUIStore = create<DossierUIState>()((set) => ({
  modalAction: null,
  actionNote: '',
  activeTab: 'overview',
  setModalAction: (action) => set({ modalAction: action }),
  setActionNote: (note) => set({ actionNote: note }),
  resetModal: () => set({ modalAction: null, actionNote: '' }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
