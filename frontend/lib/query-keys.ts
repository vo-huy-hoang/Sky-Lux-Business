/**
 * ==============================================================================
 * SKY-LUX CRM - TANSTACK QUERY KEY FACTORY (SINGLE SOURCE OF TRUTH)
 * ==============================================================================
 * Hierarchical query key factory conforming to TanStack Query v5 best practices.
 * Enables granular query invalidation and cross-screen cache sharing.
 */

export const queryKeys = {
  // 1. DOSSIERS & WORKFLOW
  dossiers: {
    all: ['dossiers'] as const,
    lists: () => [...queryKeys.dossiers.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.dossiers.lists(), filters || {}] as const,
    details: () => [...queryKeys.dossiers.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.dossiers.details(), id || ''] as const,
    comments: (dossierId?: string, params?: Record<string, any>) =>
      [...queryKeys.dossiers.detail(dossierId), 'comments', params || {}] as const,
  },

  // 2. USERS & RBAC
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.users.lists(), filters || {}] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.users.details(), id || ''] as const,
    roles: (search?: string) =>
      search !== undefined
        ? ([...queryKeys.users.all, 'roles', search] as const)
        : ([...queryKeys.users.all, 'roles'] as const),
    permissions: () => [...queryKeys.users.all, 'permissions'] as const,
    roleDetail: (id?: string) => [...queryKeys.users.roles(), id || ''] as const,
    me: (userId?: string) =>
      userId
        ? ([...queryKeys.users.all, 'me', userId] as const)
        : ([...queryKeys.users.all, 'me'] as const),
  },

  // 3. DASHBOARDS (OPERATOR, SALES, CEO)
  dashboards: {
    all: ['dashboards'] as const,
    operator: (params?: Record<string, any>) => [...queryKeys.dashboards.all, 'operator', params || {}] as const,
    sales: (params?: Record<string, any>) => [...queryKeys.dashboards.all, 'sales', params || {}] as const,
    ceo: (params?: Record<string, any>) => [...queryKeys.dashboards.all, 'ceo', params || {}] as const,
    operatorSalesSummary: (params?: Record<string, any>) =>
      [...queryKeys.dashboards.operator(params), 'sales-summary'] as const,
    operatorMonthlyTrend: () => [...queryKeys.dashboards.operator(), 'monthly-trend'] as const,
    ceoMonthlyTrend: (year?: number) =>
      [...queryKeys.dashboards.ceo(), 'monthly-trend', year || 'current'] as const,
  },


  // 4. ESTIMATES & COSTINGS
  estimates: {
    all: ['estimates'] as const,
    lists: () => [...queryKeys.estimates.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.estimates.lists(), filters || {}] as const,
    dossierList: (dossierId?: string) => [...queryKeys.estimates.all, 'dossier', dossierId || ''] as const,
    details: () => [...queryKeys.estimates.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.estimates.details(), id || ''] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.tasks.lists(), filters || {}] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.tasks.details(), id || ''] as const,
    checklist: (taskId?: string) => [...queryKeys.tasks.detail(taskId), 'checklist'] as const,
  },

  // 6. APPROVALS & WORKFLOW ACTIONS
  approvals: {
    all: ['approvals'] as const,
    submitted: (params?: Record<string, any>) => [...queryKeys.approvals.all, 'submitted', params || {}] as const,
    reviewing: (params?: Record<string, any>) => [...queryKeys.approvals.all, 'reviewing', params || {}] as const,
    history: (dossierId?: string, params?: Record<string, any>) =>
      [...queryKeys.approvals.all, 'history', dossierId || '', params || {}] as const,
    approvalsList: (dossierId?: string, params?: Record<string, any>) =>
      [...queryKeys.approvals.all, 'list', dossierId || '', params || {}] as const,
  },

  // 7. CUSTOMERS
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.customers.lists(), filters || {}] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.customers.details(), id || ''] as const,
    summary: () => [...queryKeys.customers.all, 'summary'] as const,
  },

  // 8. SUPPLIERS
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.suppliers.lists(), filters || {}] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.suppliers.details(), id || ''] as const,
  },

  // 9. KPIS & PERFORMANCE
  kpis: {
    all: ['kpis'] as const,
    summary: (params?: Record<string, any>) => [...queryKeys.kpis.all, 'summary', params || {}] as const,
    myResults: (params?: Record<string, any>) => [...queryKeys.kpis.all, 'my-results', params || {}] as const,
  },

  // 10. REVENUE & REPORTS
  reports: {
    all: ['reports'] as const,
    saved: (params?: Record<string, any>) => [...queryKeys.reports.all, 'saved', params || {}] as const,
    dashboard: (params?: Record<string, any>) => [...queryKeys.reports.all, 'dashboard', params || {}] as const,
    report: (reportType: string, params?: Record<string, any>) =>
      [...queryKeys.reports.all, reportType, params || {}] as const,
    revenue: (period?: string, params?: Record<string, any>) =>
      [...queryKeys.reports.all, 'revenue', period || 'month', params || {}] as const,
  },

  // 11. REALTIME CHAT & MESSAGES
  chat: {
    all: ['chat'] as const,
    conversations: () => [...queryKeys.chat.all, 'conversations'] as const,
    conversation: (id?: string) => [...queryKeys.chat.all, 'conversation', id || ''] as const,
    messages: (conversationId?: string) => [...queryKeys.chat.all, 'messages', conversationId || ''] as const,
    unreadCount: () => [...queryKeys.chat.all, 'unread-count'] as const,
    participants: (conversationId?: string) =>
      [...queryKeys.chat.all, 'participants', conversationId || ''] as const,
    dossierConversation: (dossierId?: string) =>
      [...queryKeys.chat.all, 'dossier', dossierId || ''] as const,
  },

  // 12. DOCUMENTS & ATTACHMENTS
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    dossierList: (dossierId?: string, params?: Record<string, any>) =>
      [...queryKeys.documents.lists(), 'dossier', dossierId || '', params || {}] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.documents.details(), id || ''] as const,
    versions: (id?: string, params?: Record<string, any>) =>
      [...queryKeys.documents.detail(id), 'versions', params || {}] as const,
    downloadUrl: (id?: string, params?: Record<string, any>) =>
      [...queryKeys.documents.detail(id), 'download', params || {}] as const,
  },

  // 13. ORGANIZATIONS
  organizations: {
    all: ['organizations'] as const,
    profile: () => [...queryKeys.organizations.all, 'profile'] as const,
    settings: () => [...queryKeys.organizations.all, 'settings'] as const,
  },

  // 14. MASTER DATA (CATALOGS)
  masterData: {
    all: ['master-data'] as const,
    businessLines: (params?: Record<string, any>) =>
      [...queryKeys.masterData.all, 'business-lines', params || {}] as const,
    marketTypes: (params?: Record<string, any>) =>
      [...queryKeys.masterData.all, 'market-types', params || {}] as const,
    serviceCategories: (params?: Record<string, any>) =>
      [...queryKeys.masterData.all, 'service-categories', params || {}] as const,
    passengerTypes: (params?: Record<string, any>) =>
      [...queryKeys.masterData.all, 'passenger-types', params || {}] as const,
    supplierTypes: (params?: Record<string, any>) =>
      [...queryKeys.masterData.all, 'supplier-types', params || {}] as const,
    units: (params?: Record<string, any>) => [...queryKeys.masterData.all, 'units', params || {}] as const,
  },

  // 15. HEALTH & OBSERVE
  health: {
    all: ['health'] as const,
    system: () => [...queryKeys.health.all, 'system'] as const,
  },

  // 16. EXCEL IMPORTS
  imports: {
    all: ['imports'] as const,
    sessions: (params?: Record<string, any>) => [...queryKeys.imports.all, 'sessions', params || {}] as const,
    errors: (sessionId?: string) => [...queryKeys.imports.all, 'errors', sessionId || ''] as const,
  },

  // 17. AUDIT LOGS
  auditLogs: {
    all: ['audit-logs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (params?: Record<string, any>) => [...queryKeys.auditLogs.lists(), params || {}] as const,
    details: () => [...queryKeys.auditLogs.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.auditLogs.details(), id || ''] as const,
  },

  // 18. NOTIFICATIONS & ALERTS
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (params?: Record<string, any>) =>
      [...queryKeys.notifications.lists(), params || {}] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    detail: (id?: string) => [...queryKeys.notifications.all, 'detail', id || ''] as const,
  },

  // 19. PAYMENTS & DEBT
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    dossierPayments: (dossierId?: string) =>
      [...queryKeys.payments.lists(), 'dossier', dossierId || ''] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id?: string) => [...queryKeys.payments.details(), id || ''] as const,
    financeSummary: (dossierId?: string) =>
      [...queryKeys.payments.all, 'finance-summary', dossierId || ''] as const,
  },
};
