import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useBusinessLines,
  useMarketTypes,
  useServiceCategories,
  usePassengerTypes,
  useSupplierTypes,
  useUnits,
  masterDataKeys,
} from '@/hooks/use-master-data';
import { masterDataService } from '@/services/master-data.service';

jest.mock('@/services/master-data.service', () => ({
  masterDataService: {
    getBusinessLines: jest.fn(),
    getMarketTypes: jest.fn(),
    getServiceCategories: jest.fn(),
    getPassengerTypes: jest.fn(),
    getSupplierTypes: jest.fn(),
    getUnits: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useMasterData hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockData = {
    data: [{ id: '1', code: 'TEST', name: 'Test', status: 'ACTIVE', createdAt: '', updatedAt: '' }],
    meta: { page: 1, pageSize: 20, total: 1 },
  };

  it('should generate correct query keys', () => {
    expect(masterDataKeys.all).toEqual(['master-data']);
    expect(masterDataKeys.businessLines({ page: 1 })).toEqual([
      'master-data',
      'business-lines',
      { page: 1 },
    ]);
  });

  it('useBusinessLines fetches business lines', async () => {
    (masterDataService.getBusinessLines as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useBusinessLines({ page: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(masterDataService.getBusinessLines).toHaveBeenCalledWith(
      { page: 1 },
      expect.anything(),
    );
  });

  it('useMarketTypes fetches market types', async () => {
    (masterDataService.getMarketTypes as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useMarketTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('useServiceCategories fetches service categories', async () => {
    (masterDataService.getServiceCategories as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useServiceCategories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('usePassengerTypes fetches passenger types', async () => {
    (masterDataService.getPassengerTypes as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePassengerTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('useSupplierTypes fetches supplier types', async () => {
    (masterDataService.getSupplierTypes as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useSupplierTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it('useUnits fetches units', async () => {
    (masterDataService.getUnits as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useUnits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
