import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  QueryMasterDataParams,
  PaginatedMasterDataResponse,
} from '@/types/master-data';

const fetchMasterData = (
  endpoint: string,
  params?: QueryMasterDataParams,
  options?: RequestOptions,
) => {
  return apiClient.get<unknown, PaginatedMasterDataResponse>(`/master-data/${endpoint}`, {
    params,
    signal: options?.signal,
  });
};

export const masterDataService = {
  /**
   * API-MASTER-001: Danh mục mảng kinh doanh
   */
  getBusinessLines: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('business-lines', params, options);
  },

  /**
   * API-MASTER-002: Danh mục loại thị trường
   */
  getMarketTypes: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('market-types', params, options);
  },

  /**
   * API-MASTER-003: Danh mục nhóm dịch vụ
   */
  getServiceCategories: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('service-categories', params, options);
  },

  /**
   * API-MASTER-004: Danh mục loại khách
   */
  getPassengerTypes: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('passenger-types', params, options);
  },

  /**
   * API-MASTER-005: Danh mục loại nhà cung cấp
   */
  getSupplierTypes: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('supplier-types', params, options);
  },

  /**
   * API-MASTER-006: Danh mục đơn vị tính
   */
  getUnits: (params?: QueryMasterDataParams, options?: RequestOptions) => {
    return fetchMasterData('units', params, options);
  },
};
