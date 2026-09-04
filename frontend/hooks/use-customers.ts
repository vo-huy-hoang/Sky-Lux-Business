import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { queryKeys } from '@/lib/query-keys';
import {
  CustomerItem,
  QueryCustomerParams,
  CreateContactInput,
  PaginatedCustomersResponse,
} from '@/types/customer';
import { message } from 'antd';

/**
 * Deep Hook: Lấy danh sách khách hàng phân trang và tìm kiếm
 */
export function useCustomersList(params?: QueryCustomerParams) {
  const query = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: ({ signal }) => customersService.getCustomers(params, { signal }),
  });

  const raw = query.data;
  const customers: CustomerItem[] = Array.isArray(raw)
    ? raw
    : raw?.items || (raw as any)?.data || [];
  const total: number = Array.isArray(raw)
    ? raw.length
    : raw?.total || (raw as any)?.meta?.total || customers.length;

  return {
    ...query,
    customers,
    total,
  };
}

/**
 * Deep Hook: Lấy chi tiết khách hàng theo ID
 */
export function useCustomerDetail(id?: string | null) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id || ''),
    queryFn: ({ signal }) => customersService.getCustomer(id!, { signal }),
    enabled: Boolean(id),
  });
}

/**
 * Deep Hook: Các thao tác khách hàng (Tạo, Sửa, Xóa)
 */
export function useCustomerMutations() {
  const queryClient = useQueryClient();

  const invalidateCustomers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<CustomerItem>) => customersService.createCustomer(data),
    onSuccess: () => {
      message.success('Đã thêm khách hàng mới thành công');
      invalidateCustomers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi tạo khách hàng');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerItem> }) =>
      customersService.updateCustomer(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật thông tin khách hàng thành công');
      invalidateCustomers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi cập nhật khách hàng');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.deleteCustomer(id),
    onSuccess: () => {
      message.success('Đã xóa khách hàng thành công');
      invalidateCustomers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi xóa khách hàng');
    },
  });

  return {
    createCustomer: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateCustomer: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteCustomer: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
