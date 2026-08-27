import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { masterDataService } from '@/services/master-data.service';
import {
  QueryMasterDataParams,
  PaginatedMasterDataResponse,
} from '@/types/master-data';

export const masterDataKeys = {
  all: ['master-data'] as const,
  businessLines: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'business-lines', params] as const,
  marketTypes: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'market-types', params] as const,
  serviceCategories: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'service-categories', params] as const,
  passengerTypes: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'passenger-types', params] as const,
  supplierTypes: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'supplier-types', params] as const,
  units: (params?: QueryMasterDataParams) =>
    [...masterDataKeys.all, 'units', params] as const,
};

type MasterDataQueryOptions = Omit<
  UseQueryOptions<PaginatedMasterDataResponse, Error>,
  'queryKey' | 'queryFn'
>;

export const useBusinessLines = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.businessLines(params),
    queryFn: () => masterDataService.getBusinessLines(params),
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
};

export const useMarketTypes = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.marketTypes(params),
    queryFn: () => masterDataService.getMarketTypes(params),
    staleTime: 1000 * 60 * 30,
    ...options,
  });
};

export const useServiceCategories = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.serviceCategories(params),
    queryFn: () => masterDataService.getServiceCategories(params),
    staleTime: 1000 * 60 * 30,
    ...options,
  });
};

export const usePassengerTypes = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.passengerTypes(params),
    queryFn: () => masterDataService.getPassengerTypes(params),
    staleTime: 1000 * 60 * 30,
    ...options,
  });
};

export const useSupplierTypes = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.supplierTypes(params),
    queryFn: () => masterDataService.getSupplierTypes(params),
    staleTime: 1000 * 60 * 30,
    ...options,
  });
};

export const useUnits = (
  params?: QueryMasterDataParams,
  options?: MasterDataQueryOptions,
) => {
  return useQuery({
    queryKey: masterDataKeys.units(params),
    queryFn: () => masterDataService.getUnits(params),
    staleTime: 1000 * 60 * 30,
    ...options,
  });
};
