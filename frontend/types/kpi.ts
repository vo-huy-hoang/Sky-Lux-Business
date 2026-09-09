export enum KpiMetric {
  REVENUE = 'REVENUE',
  PROFIT = 'PROFIT',
  DOSSIER_COUNT = 'DOSSIER_COUNT',
  CLOSE_RATE = 'CLOSE_RATE',
}

export enum KpiPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export interface KpiTarget {
  id: string;
  organizationId: string;
  userId: string;
  metricCode: KpiMetric;
  periodType: KpiPeriodType;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    departmentId?: string;
  };
}

export interface KpiResultData {
  target: KpiTarget;
  actualValue: number;
  achievementRate: number;
}

export interface KpiAssignee {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
}

export interface PaginatedKpisResponse {
  data: KpiResultData[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface KpisMeResponse {
  data: KpiResultData[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryKpisDto {
  periodType?: KpiPeriodType;
  periodStart?: string;
  periodEnd?: string;
  departmentId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateKpiTargetDto {
  metricCode: KpiMetric;
  periodType: KpiPeriodType;
  periodStart: string;
  periodEnd: string;
  userId: string;
  targetValue: number;
}

export interface UpdateKpiTargetDto {
  metricCode?: KpiMetric;
  periodType?: KpiPeriodType;
  periodStart?: string;
  periodEnd?: string;
  userId?: string;
  targetValue?: number;
}
