import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kpisService } from '@/services/kpis.service';
import {
  QueryKpisDto,
  CreateKpiTargetDto,
  UpdateKpiTargetDto,
} from '@/types/kpi';

export const useKpis = () => {
  const queryClient = useQueryClient();

  const useKpiMe = (params?: QueryKpisDto, enabled = true) => {
    return useQuery({
      queryKey: ['kpis', 'me', params],
      queryFn: () => kpisService.getKpiMe(params),
      enabled,
    });
  };

  const useAllKpis = (params?: QueryKpisDto, enabled = true) => {
    return useQuery({
      queryKey: ['kpis', 'all', params],
      queryFn: () => kpisService.getAllKpis(params),
      enabled,
    });
  };

  const useSalesKpis = (params?: QueryKpisDto, enabled = true) => {
    return useQuery({
      queryKey: ['kpis', 'sales', params],
      queryFn: () => kpisService.getSalesKpis(params),
      enabled,
    });
  };

  const useAssignableUsers = (enabled = true) =>
    useQuery({
      queryKey: ['kpis', 'assignees'],
      queryFn: () => kpisService.getAssignableUsers(),
      enabled,
    });

  const useCreateKpiTarget = () => {
    return useMutation({
      mutationFn: (data: CreateKpiTargetDto) => kpisService.createKpiTarget(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
      },
    });
  };

  const useUpdateKpiTarget = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateKpiTargetDto }) =>
        kpisService.updateKpiTarget(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
      },
    });
  };

  return {
    useKpiMe,
    useAllKpis,
    useSalesKpis,
    useAssignableUsers,
    useCreateKpiTarget,
    useUpdateKpiTarget,
  };
};
