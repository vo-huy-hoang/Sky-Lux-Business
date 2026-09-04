import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCustomersList, useCustomerDetail } from '../hooks/use-customers';
import { customersService } from '../services/customers.service';

jest.mock('../services/customers.service');

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

describe('Deep Hook: use-customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch customers list and forward signal', async () => {
    const mockCustomers = [
      { id: 'c1', displayName: 'Customer A', email: 'a@example.com' },
    ];
    (customersService.getCustomers as jest.Mock).mockResolvedValueOnce(mockCustomers);

    const { result } = renderHook(() => useCustomersList({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.customers).toHaveLength(1);
    expect(result.current.customers[0].displayName).toBe('Customer A');
    expect(customersService.getCustomers).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('should fetch customer detail when id is provided', async () => {
    const mockCustomer = { id: 'c1', displayName: 'Customer A', email: 'a@example.com' };
    (customersService.getCustomer as jest.Mock).mockResolvedValueOnce(mockCustomer);

    const { result } = renderHook(() => useCustomerDetail('c1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.displayName).toBe('Customer A');
    expect(customersService.getCustomer).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
