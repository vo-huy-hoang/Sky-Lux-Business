import { PaginatedResponse } from './api';

export type ReportType =
  | 'revenue'
  | 'sales-performance'
  | 'customer'
  | 'supplier';

export type ReportFormat = 'XLSX' | 'CSV' | 'PDF';

export interface ReportQueryParams {
  periodStart?: string;
  periodEnd?: string;
  departmentId?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ReportSummary {
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  profitMargin: number;
  customerPaid?: number;
  customerOutstanding?: number;
}

export interface ReportResponseMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: ReportSummary;
}

export interface RevenueReportRow {
  dossierId: string;
  dossierCode: string;
  dossierName: string;
  customerId?: string;
  customerName?: string;
  salesUserId?: string;
  salesUserName?: string;
  revenueRecognitionDate?: string;
  dossierStatus: string;
  currency: string;
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  profitMargin: number;
  customerPaid: number;
  customerOutstanding: number;
}

export interface SalesPerformanceReportRow {
  salesUserId: string;
  employeeCode?: string;
  salesUserName: string;
  salesUserEmail?: string;
  departmentId?: string;
  dossierCount: number;
  successfulDossierCount: number;
  closeRate: number;
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  profitMargin: number;
}

export interface CustomerReportRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  customerType: string;
  dossierCount: number;
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  profitMargin: number;
  customerPaid: number;
  customerOutstanding: number;
}

export interface SupplierReportRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  supplierStatus: string;
  supplierTypeId?: string;
  dossierCount: number;
  costGross: number;
  costNet: number;
}

export type ReportRow =
  | RevenueReportRow
  | SalesPerformanceReportRow
  | CustomerReportRow
  | SupplierReportRow;

export type PaginatedReportResponse<T extends ReportRow> = PaginatedResponse<T> & {
  meta: ReportResponseMeta;
};

export interface ExportReportPayload {
  reportType: ReportType;
  format: ReportFormat;
  filters?: ReportQueryParams;
}
