import { useMutation, useQuery } from '@tanstack/react-query';
import { isCanceledError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { reportsService } from '@/services/reports.service';
import {
  ExportReportPayload,
  PaginatedReportResponse,
  ReportQueryParams,
  ReportRow,
  ReportType,
} from '@/types/report';

const REPORT_STALE_TIME = 60 * 1000;
const REPORT_GC_TIME = 5 * 60 * 1000;

export function reportRetry(failureCount: number, error: unknown): boolean {
  if (isCanceledError(error)) return false;
  const status = (error as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function useReport<T extends ReportRow>(
  reportType: ReportType,
  params: ReportQueryParams,
  options?: { enabled?: boolean },
) {
  return useQuery<PaginatedReportResponse<T>>({
    queryKey: queryKeys.reports.report(reportType, params),
    queryFn: ({ signal }) => {
      switch (reportType) {
        case 'revenue':
          return reportsService.getRevenue(params, { signal }) as Promise<PaginatedReportResponse<T>>;
        case 'sales-performance':
          return reportsService.getSalesPerformance(params, { signal }) as Promise<PaginatedReportResponse<T>>;
        case 'customer':
          return reportsService.getCustomer(params, { signal }) as Promise<PaginatedReportResponse<T>>;
        case 'supplier':
          return reportsService.getSupplier(params, { signal }) as Promise<PaginatedReportResponse<T>>;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: REPORT_STALE_TIME,
    gcTime: REPORT_GC_TIME,
    retry: reportRetry,
    refetchOnWindowFocus: false,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function useReportExport() {
  return useMutation({
    mutationFn: async ({ payload, filename }: { payload: ExportReportPayload; filename: string }) => {
      const blob = await reportsService.exportReport(payload);
      downloadBlob(blob, filename);
      return blob;
    },
  });
}
