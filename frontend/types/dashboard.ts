export interface QueryDashboardParams {
  periodType?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  date?: string;
}

export interface SalesDashboardData {
  revenue: number;
  profit: number;
  dossiersBreakdown: { status: string; count: number }[];
  tasksBreakdown: { status: string; count: number }[];
}

export interface OperatorDashboardData {
  activeDossiersCount: number;
  priorityBreakdown: { priority: string; count: number }[];
  overdueTasksCount: number;
  tasksBreakdown: { status: string; count: number }[];
  totalSuppliers: number;
}

export interface CeoDashboardData {
  totalRevenue: number;
  totalProfit: number;
  funnel: { status: string; count: number }[];
  vipCustomers: { customerName: string; spend: number }[];
  costBreakdown: { categoryName: string; amount: number }[];
  avgDossierClosingDays: number;
}
