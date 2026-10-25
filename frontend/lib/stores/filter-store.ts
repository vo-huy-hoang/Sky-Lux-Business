import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FilterState {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number;
  setSelectedMonth: (month: number) => void;
  selectedPeriodType: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  setSelectedPeriodType: (type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => void;
  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
  dateString: string;
  setDateString: (dateStr: string) => void;
  resetFilters: () => void;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const defaultDateString = new Date().toISOString().split('T')[0];

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      selectedYear: currentYear,
      setSelectedYear: (year: number) => set({ selectedYear: year }),
      selectedMonth: currentMonth,
      setSelectedMonth: (month: number) => set({ selectedMonth: month }),
      selectedPeriodType: 'MONTHLY',
      setSelectedPeriodType: (type) => set({ selectedPeriodType: type }),
      selectedDepartment: null,
      setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),
      dateString: defaultDateString,
      setDateString: (dateStr: string) => {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          set({
            dateString: dateStr,
            selectedYear: d.getFullYear(),
            selectedMonth: d.getMonth() + 1,
          });
        } else {
          set({ dateString: dateStr });
        }
      },
      resetFilters: () =>
        set({
          selectedYear: new Date().getFullYear(),
          selectedMonth: new Date().getMonth() + 1,
          selectedPeriodType: 'MONTHLY',
          selectedDepartment: null,
          dateString: new Date().toISOString().split('T')[0],
        }),
    }),
    {
      name: 'skylux-filter-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
