import { useUIStore } from '../lib/stores/ui-store';

describe('useUIStore (Zustand Global UI Store)', () => {
  beforeEach(() => {
    // Reset state before each test
    useUIStore.setState({
      sidebarCollapsed: false,
      notificationsDrawerOpen: false,
      themeMode: 'light',
      activeModalId: null,
    });
  });

  it('should initialize with default UI state', () => {
    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.notificationsDrawerOpen).toBe(false);
    expect(state.themeMode).toBe('light');
    expect(state.activeModalId).toBeNull();
  });

  it('should toggle sidebar collapsed state', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('should set sidebar collapsed directly', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('should toggle notifications drawer state', () => {
    useUIStore.getState().setNotificationsDrawerOpen(true);
    expect(useUIStore.getState().notificationsDrawerOpen).toBe(true);

    useUIStore.getState().setNotificationsDrawerOpen(false);
    expect(useUIStore.getState().notificationsDrawerOpen).toBe(false);
  });

  it('should set theme mode', () => {
    useUIStore.getState().setThemeMode('dark');
    expect(useUIStore.getState().themeMode).toBe('dark');

    useUIStore.getState().setThemeMode('light');
    expect(useUIStore.getState().themeMode).toBe('light');
  });

  it('should manage active modal id', () => {
    useUIStore.getState().openModal('CREATE_TASK_MODAL');
    expect(useUIStore.getState().activeModalId).toBe('CREATE_TASK_MODAL');

    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModalId).toBeNull();
  });

  it('should manage connection status and reconnect attempts', () => {
    expect(useUIStore.getState().connectionStatus).toBe('connected');
    expect(useUIStore.getState().reconnectAttempt).toBe(0);

    useUIStore.getState().setConnectionStatus('reconnecting');
    useUIStore.getState().setReconnectAttempt(2);
    expect(useUIStore.getState().connectionStatus).toBe('reconnecting');
    expect(useUIStore.getState().reconnectAttempt).toBe(2);

    useUIStore.getState().setConnectionStatus('offline');
    expect(useUIStore.getState().connectionStatus).toBe('offline');

    useUIStore.getState().setConnectionStatus('connected');
    useUIStore.getState().setReconnectAttempt(0);
    expect(useUIStore.getState().connectionStatus).toBe('connected');
    expect(useUIStore.getState().reconnectAttempt).toBe(0);
  });

  it('should independently track notificationsStatus and chatStatus, computing combined connectionStatus', () => {
    // Initial state
    expect(useUIStore.getState().notificationsStatus).toBe('connected');
    expect(useUIStore.getState().chatStatus).toBe('idle');
    expect(useUIStore.getState().connectionStatus).toBe('connected');

    // Chat begins reconnecting while notifications is connected
    useUIStore.getState().setChatStatus('reconnecting');
    expect(useUIStore.getState().chatStatus).toBe('reconnecting');
    expect(useUIStore.getState().connectionStatus).toBe('reconnecting');

    // Chat fails reconnection
    useUIStore.getState().setChatStatus('reconnect_failed');
    expect(useUIStore.getState().connectionStatus).toBe('reconnect_failed');

    // User leaves chat screen (chat unmounts -> idle)
    useUIStore.getState().setChatStatus('idle');
    expect(useUIStore.getState().chatStatus).toBe('idle');
    expect(useUIStore.getState().connectionStatus).toBe('connected');

    // Notifications goes offline
    useUIStore.getState().setNotificationsStatus('offline');
    expect(useUIStore.getState().connectionStatus).toBe('offline');

    // Notifications reconnects
    useUIStore.getState().setNotificationsStatus('connected');
    expect(useUIStore.getState().connectionStatus).toBe('connected');
  });
});

