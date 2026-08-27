import { apiClient } from '@/lib/api-client';
import {
  SupplierItem,
  CreateSupplierInput,
  UpdateSupplierInput,
  QuerySupplierParams,
  PaginatedSuppliersResponse,
} from '@/types/supplier';

export const suppliersService = {
  /**
   * API-SUPPLIER-001: Lấy danh sách nhà cung cấp phân trang và tìm kiếm
   */
  getSuppliers: (params?: QuerySupplierParams) => {
    return apiClient.get<any, PaginatedSuppliersResponse>('/suppliers', {
      params,
    });
  },

  /**
   * API-SUPPLIER-002: Lấy chi tiết nhà cung cấp theo ID
   */
  getSupplier: (id: string) => {
    return apiClient.get<any, SupplierItem>(`/suppliers/${id}`);
  },

  /**
   * API-SUPPLIER-003: Tạo nhà cung cấp mới
   */
  createSupplier: (data: CreateSupplierInput) => {
    return apiClient.post<any, SupplierItem>('/suppliers', data);
  },

  /**
   * API-SUPPLIER-004: Cập nhật thông tin nhà cung cấp
   */
  updateSupplier: (id: string, data: UpdateSupplierInput) => {
    return apiClient.patch<any, SupplierItem>(`/suppliers/${id}`, data);
  },

  /**
   * API-SUPPLIER-005: Xóa nhà cung cấp
   */
  deleteSupplier: (id: string) => {
    return apiClient.delete<any, void>(`/suppliers/${id}`);
  },
};
