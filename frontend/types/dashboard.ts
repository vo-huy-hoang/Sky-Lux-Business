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
  revenueBreakdown: { marketTypeName: string; amount: number }[];
  businessLineBreakdown: { businessLineName: string; amount: number }[];
  supplierBreakdown: {
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    amount: number;
    grossAmount: number;
    dossierCount: number;
  }[];
  totalProfit: number;
  totalDossiersCount: number;
  pendingApprovalsCount: number;
}

export interface CeoDashboardData {
  totalRevenue: number;
  totalProfit: number;
  funnel: { status: string; count: number }[];
  vipCustomers: { customerName: string; spend: number }[];
  costBreakdown: { categoryName: string; amount: number }[];
  revenueBreakdown: { marketTypeName: string; amount: number }[];
  businessLineBreakdown: { businessLineName: string; amount: number }[];
  supplierBreakdown: {
    supplierId: string;
    supplierCode: string;
    supplierName: string;
    amount: number;
    grossAmount: number;
    dossierCount: number;
  }[];
  marketBreakdown: {
    marketName: string;
    dossiers: number;
    revenue: number;
    profit: number;
  }[];
  avgDossierClosingDays: number;
}

export interface OperatorSalesSummaryItem {
  salesUserId: string;
  salesUserName: string;
  salesUserEmail?: string;
  employeeCode?: string;
  totalDossiers: number;
  approvedDossiers: number;
  completedDossiers: number;
  completionRate: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface OperatorMonthlyTrendItem {
  monthKey: string;
  label: string;
  totalDossiers: number;
  approvedDossiers: number;
  totalRevenue: number;
}

export interface CeoMonthlyTrendItem {
  monthKey: string;
  label: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  approvedDossiers: number;
}
