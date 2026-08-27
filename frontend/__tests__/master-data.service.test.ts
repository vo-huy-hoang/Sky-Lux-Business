import { apiClient } from '@/lib/api-client';
import { masterDataService } from '@/services/master-data.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('MasterDataService (Frontend)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResponse = {
    data: [
      {
        id: 'mock-id-1',
        code: 'CODE_1',
        name: 'Name 1',
        status: 'ACTIVE',
        createdAt: '2026-08-24T00:00:00.000Z',
        updatedAt: '2026-08-24T00:00:00.000Z',
      },
    ],
    meta: {
      page: 1,
      pageSize: 20,
      total: 1,
    },
  };

  it('API-MASTER-001: getBusinessLines calls /master-data/business-lines', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const params = { page: 1, pageSize: 20, status: 'ACTIVE', search: 'INBOUND' };
    const result = await masterDataService.getBusinessLines(params);

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/business-lines', {
      params,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-MASTER-002: getMarketTypes calls /master-data/market-types', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await masterDataService.getMarketTypes();

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/market-types', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-MASTER-003: getServiceCategories calls /master-data/service-categories', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await masterDataService.getServiceCategories();

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/service-categories', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-MASTER-004: getPassengerTypes calls /master-data/passenger-types', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await masterDataService.getPassengerTypes();

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/passenger-types', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-MASTER-005: getSupplierTypes calls /master-data/supplier-types', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await masterDataService.getSupplierTypes();

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/supplier-types', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it('API-MASTER-006: getUnits calls /master-data/units', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await masterDataService.getUnits();

    expect(apiClient.get).toHaveBeenCalledWith('/master-data/units', {
      params: undefined,
    });
    expect(result).toEqual(mockResponse);
  });
});
