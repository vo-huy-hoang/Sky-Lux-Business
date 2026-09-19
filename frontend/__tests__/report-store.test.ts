import { useReportStore } from '@/lib/stores/report-store';

describe('useReportStore (Zustand)', () => {
  beforeEach(() => {
    useReportStore.getState().resetFilters();
  });

  it('initializes with default values', () => {
    const state = useReportStore.getState();
    expect(state.reportType).toBe('revenue');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(20);
    expect(state.searchInput).toBe('');
    expect(state.periodStart).toMatch(/^\d{4}-01-01$/);
    expect(state.periodEnd).toMatch(/^\d{4}-12-31$/);
  });

  it('setReportType updates report type and resets page to 1', () => {
    useReportStore.getState().setPage(5);
    expect(useReportStore.getState().page).toBe(5);

    useReportStore.getState().setReportType('sales-performance');
    expect(useReportStore.getState().reportType).toBe('sales-performance');
    expect(useReportStore.getState().page).toBe(1);
  });

  it('setDateRange updates periodStart, periodEnd and resets page to 1', () => {
    useReportStore.getState().setPage(3);
    useReportStore.getState().setDateRange('2026-01-01', '2026-03-31');

    const state = useReportStore.getState();
    expect(state.periodStart).toBe('2026-01-01');
    expect(state.periodEnd).toBe('2026-03-31');
    expect(state.page).toBe(1);
  });

  it('setSearchInput updates searchInput and resets page to 1', () => {
    useReportStore.getState().setPage(4);
    useReportStore.getState().setSearchInput('VinFast');

    expect(useReportStore.getState().searchInput).toBe('VinFast');
    expect(useReportStore.getState().page).toBe(1);
  });

  it('setSalesUserId updates salesUserId and normalizes ALL to undefined', () => {
    useReportStore.getState().setPage(3);
    useReportStore.getState().setSalesUserId('user-uuid-123');

    expect(useReportStore.getState().salesUserId).toBe('user-uuid-123');
    expect(useReportStore.getState().page).toBe(1);

    useReportStore.getState().setSalesUserId('ALL');
    expect(useReportStore.getState().salesUserId).toBeUndefined();
  });

  it('applySavedFilters applies saved filter attributes and resets page to 1', () => {
    useReportStore.getState().setPage(4);
    useReportStore.getState().applySavedFilters({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      userId: 'user-456',
      search: 'Hà Nội',
    });

    const state = useReportStore.getState();
    expect(state.periodStart).toBe('2026-06-01');
    expect(state.periodEnd).toBe('2026-06-30');
    expect(state.salesUserId).toBe('user-456');
    expect(state.searchInput).toBe('Hà Nội');
    expect(state.page).toBe(1);
  });

  it('resetFilters restores initial state', () => {
    useReportStore.getState().setReportType('customer');
    useReportStore.getState().setSearchInput('Test');
    useReportStore.getState().setSalesUserId('user-123');
    useReportStore.getState().setPage(8);

    useReportStore.getState().resetFilters();

    const state = useReportStore.getState();
    expect(state.reportType).toBe('revenue');
    expect(state.searchInput).toBe('');
    expect(state.salesUserId).toBeUndefined();
    expect(state.page).toBe(1);
    expect(state.periodStart).toMatch(/^\d{4}-01-01$/);
    expect(state.periodEnd).toMatch(/^\d{4}-12-31$/);
  });
});


