import { useDossierUIStore } from '@/components/dossiers/detail/stores/useDossierUIStore';

describe('useDossierUIStore (Zustand Dossier Detail UI Store)', () => {
  beforeEach(() => {
    useDossierUIStore.setState({
      modalAction: null,
      actionNote: '',
      activeTab: 'overview',
    });
  });

  it('should initialize with default state', () => {
    const state = useDossierUIStore.getState();
    expect(state.modalAction).toBeNull();
    expect(state.actionNote).toBe('');
    expect(state.activeTab).toBe('overview');
  });

  it('should set modal action and action note', () => {
    useDossierUIStore.getState().setModalAction('REQUEST_CHANGES');
    useDossierUIStore.getState().setActionNote('Cần bổ sung chi phí vé máy bay');

    const state = useDossierUIStore.getState();
    expect(state.modalAction).toBe('REQUEST_CHANGES');
    expect(state.actionNote).toBe('Cần bổ sung chi phí vé máy bay');
  });

  it('should reset modal state on resetModal()', () => {
    useDossierUIStore.getState().setModalAction('APPROVE');
    useDossierUIStore.getState().setActionNote('Duyệt giá tốt');

    useDossierUIStore.getState().resetModal();

    const state = useDossierUIStore.getState();
    expect(state.modalAction).toBeNull();
    expect(state.actionNote).toBe('');
  });

  it('should update activeTab and track visitedTabs automatically', () => {
    useDossierUIStore.getState().setActiveTab('cost');
    expect(useDossierUIStore.getState().activeTab).toBe('cost');
    expect(useDossierUIStore.getState().visitedTabs.cost).toBe(true);

    useDossierUIStore.getState().setActiveTab('discussion');
    expect(useDossierUIStore.getState().activeTab).toBe('discussion');
    expect(useDossierUIStore.getState().visitedTabs.discussion).toBe(true);
    expect(useDossierUIStore.getState().visitedTabs.cost).toBe(true);
  });

  it('should mark tab visited manually via markTabVisited', () => {
    useDossierUIStore.getState().markTabVisited('documents');
    expect(useDossierUIStore.getState().visitedTabs.documents).toBe(true);
    expect(useDossierUIStore.getState().activeTab).toBe('overview');
  });

  it('should reset all UI state via resetUIState()', () => {
    useDossierUIStore.getState().setModalAction('APPROVE');
    useDossierUIStore.getState().setActionNote('Duyệt ngay');
    useDossierUIStore.getState().setActiveTab('documents');

    useDossierUIStore.getState().resetUIState();

    const state = useDossierUIStore.getState();
    expect(state.modalAction).toBeNull();
    expect(state.actionNote).toBe('');
    expect(state.activeTab).toBe('overview');
    expect(state.visitedTabs).toEqual({ overview: true });
  });
});
