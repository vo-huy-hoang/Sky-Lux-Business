import { useFilterStore } from '../lib/stores/filter-store';

describe('useFilterStore (Zustand Cross-page Filter Store)', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('should initialize with default filter state', () => {
    const state = useFilterStore.getState();
    const currentYear = new Date().getFullYear();
    expect(state.selectedYear).toBe(currentYear);
    expect(state.selectedPeriodType).toBe('MONTHLY');
    expect(state.selectedDepartment).toBeNull();
  });

  it('should update selected year and month', () => {
    useFilterStore.getState().setSelectedYear(2025);
    expect(useFilterStore.getState().selectedYear).toBe(2025);

    useFilterStore.getState().setSelectedMonth(8);
    expect(useFilterStore.getState().selectedMonth).toBe(8);
  });

  it('should update period type', () => {
    useFilterStore.getState().setSelectedPeriodType('QUARTERLY');
    expect(useFilterStore.getState().selectedPeriodType).toBe('QUARTERLY');

    useFilterStore.getState().setSelectedPeriodType('YEARLY');
    expect(useFilterStore.getState().selectedPeriodType).toBe('YEARLY');
  });

  it('should update date string and sync year and month', () => {
    useFilterStore.getState().setDateString('2025-06-15');
    const state = useFilterStore.getState();
    expect(state.dateString).toBe('2025-06-15');
    expect(state.selectedYear).toBe(2025);
    expect(state.selectedMonth).toBe(6);
  });

  it('should reset filters to initial defaults', () => {
    useFilterStore.getState().setSelectedYear(2020);
    useFilterStore.getState().setSelectedDepartment('SALES_TEAM_1');
    useFilterStore.getState().resetFilters();

    const state = useFilterStore.getState();
    expect(state.selectedYear).toBe(new Date().getFullYear());
    expect(state.selectedDepartment).toBeNull();
  });
});
