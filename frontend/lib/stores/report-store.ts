import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ReportType } from '@/types/report';

export interface ReportFilterState {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  salesUserId?: string;
  searchInput: string;
  page: number;
  pageSize: number;

  // Actions
  setReportType: (reportType: ReportType) => void;
  setDateRange: (periodStart: string, periodEnd: string) => void;
  setSalesUserId: (salesUserId?: string) => void;
  setSearchInput: (search: string) => void;
  setPage: (page: number) => void;
  applySavedFilters: (filters: Record<string, unknown>) => void;
  resetFilters: () => void;
}

export function getDefaultPeriod(): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const year = now.getFullYear();
  return {
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  };
}

const defaultPeriod = getDefaultPeriod();

export const useReportStore = create<ReportFilterState>()(
  persist(
    (set) => ({
      reportType: 'revenue',
      periodStart: defaultPeriod.periodStart,
      periodEnd: defaultPeriod.periodEnd,
      salesUserId: undefined,
      searchInput: '',
      page: 1,
      pageSize: 20,

      setReportType: (reportType) =>
        set({
          reportType,
          page: 1,
        }),

      setDateRange: (periodStart, periodEnd) =>
        set({
          periodStart,
          periodEnd,
          page: 1,
        }),

      setSalesUserId: (salesUserId) =>
        set({
          salesUserId: salesUserId === 'ALL' || !salesUserId ? undefined : salesUserId,
          page: 1,
        }),

      setSearchInput: (searchInput) =>
        set({
          searchInput,
          page: 1,
        }),

      setPage: (page) => set({ page }),

      applySavedFilters: (filters) => {
        const period = getDefaultPeriod();
        const start = typeof filters.periodStart === 'string' ? filters.periodStart : period.periodStart;
        const end = typeof filters.periodEnd === 'string' ? filters.periodEnd : period.periodEnd;
        const userId = typeof filters.userId === 'string' ? filters.userId : undefined;
        const search = typeof filters.search === 'string' ? filters.search : '';

        set({
          periodStart: start,
          periodEnd: end,
          salesUserId: userId,
          searchInput: search,
          page: 1,
        });
      },

      resetFilters: () => {
        const period = getDefaultPeriod();
        set({
          reportType: 'revenue',
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          salesUserId: undefined,
          searchInput: '',
          page: 1,
          pageSize: 20,
        });
      },
    }),
    {
      name: 'skylux-report-filters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        reportType: state.reportType,
        periodStart: state.periodStart,
        periodEnd: state.periodEnd,
        salesUserId: state.salesUserId,
      }),
    },
  ),
);

