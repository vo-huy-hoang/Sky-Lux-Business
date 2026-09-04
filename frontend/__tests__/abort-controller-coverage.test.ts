import { apiClient, isCanceledError } from '../lib/api-client';
import { estimatesService } from '../services/estimates.service';
import { healthService } from '../services/health.service';
import { organizationsService } from '../services/organizations.service';
import { customersService } from '../services/customers.service';
import { suppliersService } from '../services/suppliers.service';
import { tasksService } from '../services/tasks.service';
import { usersService } from '../services/users.service';
import { rbacService } from '../services/rbac.service';
import { masterDataService } from '../services/master-data.service';
import { authService } from '../services/auth.service';
import { dashboardsService } from '../services/dashboards.service';
import { dossiersService } from '../services/dossiers.service';
import { kpiService } from '../services/kpi.service';
import { importsService } from '../services/imports.service';

jest.mock('../lib/api-client', () => {
  const actual = jest.requireActual('../lib/api-client');
  return {
    ...actual,
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
  };
});

describe('Phase 29: Universal AbortController Synchronization Across All Services & Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Layer Signal Propagation', () => {
    it('estimatesService should pass signal to apiClient.get for getDossierEstimates and getEstimate', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [], meta: {} });

      await estimatesService.getDossierEstimates('dossier-123', { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/estimates', expect.objectContaining({
        signal: controller.signal,
      }));

      await estimatesService.getEstimate('est-456', { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/estimates/est-456', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('healthService should pass signal to apiClient.get for getSystemHealth', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({ status: 'ok' });

      await healthService.getSystemHealth({ signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/health', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('organizationsService should pass signal for getProfile and getSettings', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({});

      await organizationsService.getProfile({ signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/organization', expect.objectContaining({
        signal: controller.signal,
      }));

      await organizationsService.getSettings({ signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/organization/settings', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('customersService and suppliersService should pass signal', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      await customersService.getCustomers({ page: 1 }, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/customers', expect.objectContaining({
        signal: controller.signal,
      }));

      await suppliersService.getSuppliers({ page: 1 }, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/suppliers', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('tasksService, usersService, and rbacService should pass signal', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue([]);

      await tasksService.getTasks({}, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/tasks', expect.objectContaining({
        signal: controller.signal,
      }));

      await usersService.getUsers({}, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/users', expect.objectContaining({
        signal: controller.signal,
      }));

      await rbacService.getPermissions({}, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/permissions', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('masterDataService should pass signal to fetchMasterData queries', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });

      await masterDataService.getBusinessLines({}, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/master-data/business-lines', expect.objectContaining({
        signal: controller.signal,
      }));

      await masterDataService.getMarketTypes({}, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/master-data/market-types', expect.objectContaining({
        signal: controller.signal,
      }));
    });

    it('authService, dashboardsService, dossiersService, kpiService, and importsService should pass signal', async () => {
      const controller = new AbortController();
      (apiClient.get as jest.Mock).mockResolvedValue({});

      await authService.getMe({ signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me', expect.objectContaining({
        signal: controller.signal,
      }));

      await dashboardsService.getCeoDashboard({ periodType: 'MONTHLY' }, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/ceo', expect.objectContaining({
        signal: controller.signal,
      }));

      await dossiersService.getDossiers({ page: 1 }, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/dossiers', expect.objectContaining({
        signal: controller.signal,
      }));

      await kpiService.getMyKpi({ periodType: 'MONTHLY' }, { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/kpis/me', expect.objectContaining({
        signal: controller.signal,
      }));

      await importsService.getSession('sess-1', { signal: controller.signal });
      expect(apiClient.get).toHaveBeenCalledWith('/imports/sess-1', expect.objectContaining({
        signal: controller.signal,
      }));
    });
  });

  describe('Cancellation Handling & isCanceledError Helper', () => {
    it('should correctly identify AbortError and CanceledError via isCanceledError', () => {
      const abortError = new Error('Request was aborted');
      abortError.name = 'AbortError';
      expect(isCanceledError(abortError)).toBe(true);

      const canceledError = new Error('canceled');
      canceledError.name = 'CanceledError';
      expect(isCanceledError(canceledError)).toBe(true);

      const standardError = new Error('Internal Server Error');
      expect(isCanceledError(standardError)).toBe(false);
    });
  });
});
