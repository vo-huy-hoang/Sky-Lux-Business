import { apiClient } from '@/lib/api-client';
import { reportsService } from '@/services/reports.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('ReportsService (Frontend)', () => {
  const params = {
    from: '2026-01-01',
    to: '2026-01-31',
    search: 'Hanoi',
    page: 2,
    pageSize: 25,
  };
  const response = {
    data: [],
    meta: {
      page: 2,
      pageSize: 25,
      total: 0,
      totalPages: 0,
      summary: { revenue: 0, cost: 0, profit: 0 },
      scope: 'SELF',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('API-REPORT-001: getRevenue calls GET /reports/revenue', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(response);

    await expect(reportsService.getRevenue(params)).resolves.toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith('/reports/revenue', {
      params,
      signal: undefined,
    });
  });

  it('API-REPORT-002: getSalesPerformance calls GET /reports/sales-performance', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(response);

    await expect(reportsService.getSalesPerformance(params)).resolves.toEqual(
      response,
    );
    expect(apiClient.get).toHaveBeenCalledWith('/reports/sales-performance', {
      params,
      signal: undefined,
    });
  });

  it('API-REPORT-003: getCustomer calls GET /reports/customer', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(response);

    await expect(reportsService.getCustomer(params)).resolves.toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith('/reports/customer', {
      params,
      signal: undefined,
    });
  });

  it('API-REPORT-004: getSupplier calls GET /reports/supplier', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(response);

    await expect(reportsService.getSupplier(params)).resolves.toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith('/reports/supplier', {
      params,
      signal: undefined,
    });
  });

  it('API-REPORT-005: exportReport calls POST /reports/export as a blob', async () => {
    const blob = new Blob(['report'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const payload = {
      reportType: 'revenue' as const,
      format: 'XLSX' as const,
      filters: params,
    };
    const controller = new AbortController();
    (apiClient.post as jest.Mock).mockResolvedValueOnce(blob);

    await expect(
      reportsService.exportReport(payload, { signal: controller.signal }),
    ).resolves.toBe(blob);
    expect(apiClient.post).toHaveBeenCalledWith('/reports/export', payload, {
      signal: controller.signal,
      responseType: 'blob',
    });
  });
});
