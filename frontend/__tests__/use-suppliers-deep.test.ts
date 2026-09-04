import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSuppliersList, useSupplierDetail } from '../hooks/use-suppliers';
import { suppliersService } from '../services/suppliers.service';

jest.mock('../services/suppliers.service');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const QueryWrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
  QueryWrapper.displayName = 'QueryWrapper';
  return QueryWrapper;
};

describe('Deep Hook: use-suppliers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch suppliers list and forward signal', async () => {
    const mockSuppliers = [
      { id: 's1', name: 'Supplier A', email: 's@example.com' },
    ];
    (suppliersService.getSuppliers as jest.Mock).mockResolvedValueOnce(mockSuppliers);

    const { result } = renderHook(() => useSuppliersList({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.suppliers).toHaveLength(1);
    expect(result.current.suppliers[0].name).toBe('Supplier A');
    expect(suppliersService.getSuppliers).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('should fetch supplier detail when id is provided', async () => {
    const mockSupplier = { id: 's1', name: 'Supplier A', email: 's@example.com' };
    (suppliersService.getSupplier as jest.Mock).mockResolvedValueOnce(mockSupplier);

    const { result } = renderHook(() => useSupplierDetail('s1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.name).toBe('Supplier A');
    expect(suppliersService.getSupplier).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
