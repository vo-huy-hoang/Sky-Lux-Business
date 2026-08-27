import { apiClient } from '@/lib/api-client';
import {
  QueryMasterDataParams,
  PaginatedMasterDataResponse,
} from '@/types/master-data';

const fetchMasterData = (endpoint: string, params?: QueryMasterDataParams) => {
  return apiClient.get<unknown, PaginatedMasterDataResponse>(`/master-data/${endpoint}`, {
    params,
  });
};

export const masterDataService = {
  /**
   * API-MASTER-001: Danh mục mảng kinh doanh
   */
  getBusinessLines: (params?: QueryMasterDataParams) => {
    return fetchMasterData('business-lines', params);
  },

  /**
   * API-MASTER-002: Danh mục loại thị trường
   */
  getMarketTypes: (params?: QueryMasterDataParams) => {
    return fetchMasterData('market-types', params);
  },

  /**
   * API-MASTER-003: Danh mục nhóm dịch vụ
   */
  getServiceCategories: (params?: QueryMasterDataParams) => {
    return fetchMasterData('service-categories', params);
  },

  /**
   * API-MASTER-004: Danh mục loại khách
   */
  getPassengerTypes: (params?: QueryMasterDataParams) => {
    return fetchMasterData('passenger-types', params);
  },

  /**
   * API-MASTER-005: Danh mục loại nhà cung cấp
   */
  getSupplierTypes: (params?: QueryMasterDataParams) => {
    return fetchMasterData('supplier-types', params);
  },

  /**
   * API-MASTER-006: Danh mục đơn vị tính
   */
  getUnits: (params?: QueryMasterDataParams) => {
    return fetchMasterData('units', params);
  },
};
