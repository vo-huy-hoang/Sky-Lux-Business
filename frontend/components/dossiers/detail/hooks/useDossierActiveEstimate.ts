"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDossierEstimates, useEstimateDetail } from "@/hooks/estimates";
import { estimatesService } from "@/services/estimates.service";
import { queryKeys } from "@/lib/query-keys";
import { EstimateItem, PaginatedEstimatesResponse } from "@/types/estimate";

export interface UseDossierActiveEstimateOptions {
  enabled?: boolean;
}

export interface UseDossierActiveEstimateResult {
  currentEstimate: EstimateItem | undefined;
  estimate: EstimateItem | undefined;
  estimates: EstimateItem[];
  isLoading: boolean;
  isLoadingEstimate: boolean;
  isEstimatesLoading: boolean;
  estimatesQuery: ReturnType<typeof useDossierEstimates>;
  estimateQuery: ReturnType<typeof useEstimateDetail>;
  refetch: () => Promise<void>;
}

/**
 * TICKET-51.1: Hook tối ưu hóa truy vấn dự toán, xóa bỏ Network Waterfall
 * - Sử dụng cache từ queryKeys.estimates.dossierList nếu có để lập tức kích hoạt useEstimateDetail
 * - Tự động sắp xếp và trích xuất currentEstimate (version mới nhất)
 */
export function useDossierActiveEstimate(
  dossierId?: string | null,
  options?: UseDossierActiveEstimateOptions,
): UseDossierActiveEstimateResult {
  const queryClient = useQueryClient();
  const isEnabled = Boolean(dossierId) && (options?.enabled ?? true);

  // 1. Kiểm tra cache sẵn có để loại bỏ độ trễ waterfall giữa list và detail
  const cachedEstimates = useMemo(() => {
    if (!dossierId) return undefined;
    return queryClient.getQueryData<PaginatedEstimatesResponse>(
      queryKeys.estimates.dossierList(dossierId),
    );
  }, [dossierId, queryClient]);

  // 2. Kích hoạt truy vấn danh sách dự toán của hồ sơ
  const estimatesQuery = useDossierEstimates(dossierId || "", {
    enabled: isEnabled,
  });

  const estimates = estimatesQuery.data?.data || cachedEstimates?.data || [];

  // Trích xuất dự toán phiên bản mới nhất
  const currentEstimate = useMemo(() => {
    if (!estimates.length) return undefined;
    return [...estimates].sort((a, b) => b.versionNo - a.versionNo)[0];
  }, [estimates]);

  // 3. Kích hoạt truy vấn chi tiết dự toán hiện thời
  const estimateQuery = useEstimateDetail(currentEstimate?.id, {
    enabled: isEnabled && Boolean(currentEstimate?.id),
  });

  const estimate =
    estimateQuery.data ||
    (currentEstimate?.revenueLines?.length ? currentEstimate : undefined);

  const refetch = async () => {
    const res = await estimatesQuery.refetch();
    const freshEstimates = res.data?.data || [];
    const latest = [...freshEstimates].sort((a, b) => b.versionNo - a.versionNo)[0];
    if (latest?.id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.estimates.detail(latest.id) });
      await queryClient.fetchQuery({
        queryKey: queryKeys.estimates.detail(latest.id),
        queryFn: ({ signal }) => estimatesService.getEstimate(latest.id, { signal }),
      });
    }
  };

  return {
    currentEstimate,
    estimate,
    estimates,
    isLoading: estimatesQuery.isLoading || estimateQuery.isLoading,
    isLoadingEstimate: estimateQuery.isLoading,
    isEstimatesLoading: estimatesQuery.isLoading,
    estimatesQuery,
    estimateQuery,
    refetch,
  };
}

export default useDossierActiveEstimate;
