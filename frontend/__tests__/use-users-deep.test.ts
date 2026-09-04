import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUsersList, useUserDetail, useUserRoles } from '../hooks/use-users';
import { usersService } from '../services/users.service';
import { rbacService } from '../services/rbac.service';

jest.mock('../services/users.service');
jest.mock('../services/rbac.service');

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

describe('Deep Hook: use-users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch users list and pass abort signal', async () => {
    const mockUsers = [
      { id: 'u1', fullName: 'User One', email: 'u1@skylux.vn', roles: [] },
    ];
    (usersService.getUsers as jest.Mock).mockResolvedValueOnce(mockUsers);

    const { result } = renderHook(() => useUsersList({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0].fullName).toBe('User One');
    expect(usersService.getUsers).toHaveBeenCalledWith(
      { page: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('should fetch user detail when id is provided', async () => {
    const mockUser = { id: 'u1', fullName: 'User One', email: 'u1@skylux.vn' };
    (usersService.getUser as jest.Mock).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useUserDetail('u1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.fullName).toBe('User One');
    expect(usersService.getUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('should fetch roles list', async () => {
    const mockRoles = [{ id: 'r1', code: 'SALES', name: 'Sales' }];
    (rbacService.getRoles as jest.Mock).mockResolvedValueOnce(mockRoles);

    const { result } = renderHook(() => useUserRoles('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(rbacService.getRoles).toHaveBeenCalledWith(
      { search: 'test' },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
