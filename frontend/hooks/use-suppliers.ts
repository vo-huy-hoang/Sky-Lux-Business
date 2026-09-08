import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import { queryKeys } from '@/lib/query-keys';
import {
  SupplierItem,
  QuerySupplierParams,
  CreateSupplierInput,
  UpdateSupplierInput,
} from '@/types/supplier';
import { message } from 'antd';

/**
 * Deep Hook: Lấy danh sách nhà cung cấp phân trang và tìm kiếm
 */
export function useSuppliersList(params?: QuerySupplierParams) {
  const query = useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: ({ signal }) => suppliersService.getSuppliers(params, { signal }),
  });

  const raw = query.data;
  const legacy = raw as (typeof raw & {
    items?: SupplierItem[];
    total?: number;
  }) | undefined;
  const suppliers: SupplierItem[] = Array.isArray(raw)
    ? raw
    : raw?.data || legacy?.items || [];
  const total: number = Array.isArray(raw)
    ? raw.length
    : raw?.meta?.total ?? legacy?.total ?? suppliers.length;

  return {
    ...query,
    suppliers,
    total,
  };
}

/**
 * Deep Hook: Lấy chi tiết nhà cung cấp theo ID
 */
export function useSupplierDetail(id?: string | null) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id || ''),
    queryFn: ({ signal }) => suppliersService.getSupplier(id!, { signal }),
    enabled: Boolean(id),
  });
}

/**
 * Deep Hook: Các thao tác nhà cung cấp (Tạo, Sửa, Xóa)
 */
export function useSupplierMutations() {
  const queryClient = useQueryClient();

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateSupplierInput) => suppliersService.createSupplier(data),
    onSuccess: () => {
      message.success('Đã thêm nhà cung cấp mới thành công');
      invalidateSuppliers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi tạo nhà cung cấp');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInput }) =>
      suppliersService.updateSupplier(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật thông tin nhà cung cấp thành công');
      invalidateSuppliers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi cập nhật nhà cung cấp');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersService.deleteSupplier(id),
    onSuccess: () => {
      message.success('Đã xóa nhà cung cấp thành công');
      invalidateSuppliers();
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi xóa nhà cung cấp');
    },
  });

  return {
    createSupplier: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateSupplier: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteSupplier: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
