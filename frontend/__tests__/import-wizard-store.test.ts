import { useImportWizardStore } from '../lib/stores/import-wizard-store';

describe('useImportWizardStore (Zustand Excel Import Session Store)', () => {
  beforeEach(() => {
    useImportWizardStore.getState().resetSession();
  });

  it('should initialize with default empty session state', () => {
    const state = useImportWizardStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.activeFilterTab).toBe('ALL');
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.columnMappings).toEqual({});
  });

  it('should set and update current session ID', () => {
    const sessionId = 'session-uuid-123';
    useImportWizardStore.getState().setCurrentSessionId(sessionId);
    expect(useImportWizardStore.getState().currentSessionId).toBe(sessionId);
  });

  it('should switch active filter tab and reset page to 1', () => {
    useImportWizardStore.getState().setPage(3);
    expect(useImportWizardStore.getState().page).toBe(3);

    useImportWizardStore.getState().setActiveFilterTab('ERROR');
    expect(useImportWizardStore.getState().activeFilterTab).toBe('ERROR');
    expect(useImportWizardStore.getState().page).toBe(1);
  });

  it('should update column mappings and template type', () => {
    useImportWizardStore.getState().setSelectedTemplateType('CUSTOM_TOUR_TEMPLATE');
    expect(useImportWizardStore.getState().selectedTemplateType).toBe('CUSTOM_TOUR_TEMPLATE');

    const mappings = {
      'Tên khách': 'customerName',
      'Số điện thoại': 'customerPhone',
      'Đơn giá': 'unitPrice',
    };
    useImportWizardStore.getState().setColumnMappings(mappings);
    expect(useImportWizardStore.getState().columnMappings).toEqual(mappings);
  });

  it('should reset session properly', () => {
    useImportWizardStore.getState().setCurrentSessionId('session-to-reset');
    useImportWizardStore.getState().setActiveFilterTab('VALID');
    useImportWizardStore.getState().resetSession();

    const state = useImportWizardStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.activeFilterTab).toBe('ALL');
    expect(state.page).toBe(1);
  });
});
