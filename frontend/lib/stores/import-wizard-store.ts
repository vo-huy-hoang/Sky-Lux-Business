import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ImportWizardState {
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  activeFilterTab: 'ALL' | 'VALID' | 'ERROR';
  setActiveFilterTab: (tab: 'ALL' | 'VALID' | 'ERROR') => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  selectedTemplateType: string;
  setSelectedTemplateType: (type: string) => void;
  columnMappings: Record<string, string>;
  setColumnMappings: (mappings: Record<string, string>) => void;
  resetSession: () => void;
}

export const useImportWizardStore = create<ImportWizardState>()(
  persist(
    (set) => ({
      currentSessionId: null,
      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      activeFilterTab: 'ALL',
      setActiveFilterTab: (tab) => set({ activeFilterTab: tab, page: 1 }),
      page: 1,
      setPage: (page) => set({ page }),
      pageSize: 10,
      setPageSize: (size) => set({ pageSize: size, page: 1 }),
      selectedTemplateType: 'DOSSIER_ESTIMATE_STANDARD',
      setSelectedTemplateType: (type) => set({ selectedTemplateType: type }),
      columnMappings: {},
      setColumnMappings: (mappings) => set({ columnMappings: mappings }),
      resetSession: () =>
        set({
          currentSessionId: null,
          activeFilterTab: 'ALL',
          page: 1,
          pageSize: 10,
          columnMappings: {},
        }),
    }),
    {
      name: 'skylux-import-wizard-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
