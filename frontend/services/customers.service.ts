import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  CustomerItem,
  CustomerContact,
  CreateContactInput,
  UpdateContactInput,
  QueryCustomerParams,
  PaginatedCustomersResponse,
} from '@/types/customer';
import { DossierItem, QueryDossierParams } from '@/types/dossier';

export const customersService = {
  /**
   * API-CUSTOMER-001: Lấy danh sách khách hàng phân trang và tìm kiếm
   */
  getCustomers: (params?: QueryCustomerParams, options?: RequestOptions) => {
    return apiClient.get<any, PaginatedCustomersResponse>('/customers', {
      params,
      signal: options?.signal,
    });
  },

  /**
   * API-CUSTOMER-002: Lấy chi tiết khách hàng theo ID
   */
  getCustomer: (id: string, options?: RequestOptions) => {
    return apiClient.get<any, CustomerItem>(`/customers/${id}`, {
      signal: options?.signal,
    });
  },

  /**
   * API-CUSTOMER-003: Tạo khách hàng mới
   */
  createCustomer: (data: Partial<CustomerItem>) => {
    return apiClient.post<any, CustomerItem>('/customers', data);
  },

  /**
   * API-CUSTOMER-004: Cập nhật thông tin khách hàng
   */
  updateCustomer: (id: string, data: Partial<CustomerItem>) => {
    return apiClient.patch<any, CustomerItem>(`/customers/${id}`, data);
  },

  /**
   * API-CUSTOMER-005: Xóa khách hàng
   */
  deleteCustomer: (id: string) => {
    return apiClient.delete<any, void>(`/customers/${id}`);
  },

  /**
   * API-CONTACT-002: Tạo người liên hệ mới cho khách hàng
   */
  createContact: (customerId: string, data: CreateContactInput) => {
    return apiClient.post<any, CustomerContact>(
      `/customers/${customerId}/contacts`,
      data,
    );
  },

  /**
   * API-CONTACT-003: Cập nhật thông tin người liên hệ
   */
  updateContact: (
    customerId: string,
    contactId: string,
    data: UpdateContactInput,
  ) => {
    return apiClient.patch<any, CustomerContact>(
      `/customers/${customerId}/contacts/${contactId}`,
      data,
    );
  },

  /**
   * API-CONTACT-004: Xóa người liên hệ của khách hàng
   */
  deleteContact: (customerId: string, contactId: string) => {
    return apiClient.delete<
      any,
      { message: string; data?: { deleted: boolean } }
    >(`/customers/${customerId}/contacts/${contactId}`);
  },

  /**
   * API-CONTACT-005: Lấy danh sách hồ sơ tour (Dossiers) liên quan đến khách hàng
   */
  getCustomerDossiers: (
    customerId: string,
    params?: QueryDossierParams,
    options?: RequestOptions,
  ) => {
    return apiClient.get<
      any,
      { data: DossierItem[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
    >(`/customers/${customerId}/dossiers`, { params, signal: options?.signal });
  },
};
