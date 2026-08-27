export interface MasterDataItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  symbol?: string;
  status: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryMasterDataParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface MasterDataPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedMasterDataResponse {
  data: MasterDataItem[];
  meta: MasterDataPaginationMeta;
}

export type BusinessLineItem = MasterDataItem;
export type MarketTypeItem = MasterDataItem;
export type ServiceCategoryItem = MasterDataItem;
export type PassengerTypeItem = MasterDataItem;
export type SupplierTypeItem = MasterDataItem;
export type UnitItem = MasterDataItem;
