'use client';

import { useState } from 'react';
import { App } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importsService } from '@/services/imports.service';
import { ImportRow, ImportSession } from '@/types/import';
import { queryKeys } from '@/lib/query-keys';
import { useImportWizardStore } from '@/lib/stores/import-wizard-store';

export function useImportFlow() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const currentSessionId = useImportWizardStore((state) => state.currentSessionId);
  const setCurrentSessionId = useImportWizardStore((state) => state.setCurrentSessionId);
  const resetWizardSession = useImportWizardStore((state) => state.resetSession);
  const activeTab = useImportWizardStore((state) => state.activeFilterTab);
  const setActiveTab = useImportWizardStore((state) => state.setActiveFilterTab);
  const page = useImportWizardStore((state) => state.page);
  const setPage = useImportWizardStore((state) => state.setPage);
  const pageSize = useImportWizardStore((state) => state.pageSize);
  const setPageSize = useImportWizardStore((state) => state.setPageSize);

  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 1. Session Query with conditional 2000ms polling
  const {
    data: session,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useQuery<ImportSession>({
    queryKey: queryKeys.imports.sessions({ sessionId: currentSessionId || undefined }),
    queryFn: ({ signal }) => importsService.getSession(currentSessionId!, { signal }),
    enabled: !!currentSessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'PROCESSING' || data?.status === 'UPLOADED') return 2000;
      return false;
    },
  });

  // 2. Preview Rows Query
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
  } = useQuery({
    queryKey: queryKeys.imports.sessions({ currentSessionId, activeTab, page, pageSize }),
    queryFn: ({ signal }) =>
      importsService.getPreview(
        currentSessionId!,
        {
          page,
          limit: pageSize,
          status: activeTab === 'ALL' ? undefined : activeTab,
        },
        { signal },
      ),
    enabled: !!currentSessionId,
  });

  // 3. Errors Query
  const { data: errorsData } = useQuery({
    queryKey: queryKeys.imports.errors(currentSessionId || undefined),
    queryFn: ({ signal }) => importsService.getErrors(currentSessionId!, { page: 1, limit: 100 }, { signal }),
    enabled: !!currentSessionId && (session?.errorRows || 0) > 0,
  });

  // 4. Mutations
  const uploadMutation = useMutation({
    mutationFn: (file: File) => importsService.upload(file, 'ESTIMATE'),
    onSuccess: (data) => {
      message.success('Tải lên tệp Excel thành công, đang kiểm duyệt dữ liệu...');
      setCurrentSessionId(data.id);
      setPage(1);
      setActiveTab('ALL');
    },
    onError: (err: any) => {
      const serverMsg = err?.response?.data?.message;
      let errorMsg = serverMsg || err?.message || 'Tải lên tệp thất bại';
      if (typeof serverMsg === 'string' && serverMsg.includes('Missing required permissions')) {
        errorMsg = 'Phiên làm việc chưa cập nhật quyền mới. Vui lòng đăng xuất và đăng nhập lại!';
      }
      message.error(errorMsg);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => importsService.validateSession(currentSessionId!),
    onSuccess: () => {
      message.info('Đang chạy lại tiến trình kiểm duyệt...');
      refetchSession();
      refetchPreview();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể kích hoạt kiểm duyệt');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => importsService.confirm(currentSessionId!),
    onSuccess: async (res) => {
      const importedRowsCount = res.importedRowsCount ?? session?.validRows ?? 0;

      // Show the result immediately after the API confirms the transaction.
      // The session status is refetched below so the success result card is
      // rendered instead of leaving the user on the preview screen.
      message.success({
        content: `Import thành công! Đã lưu ${importedRowsCount} hồ sơ vào hệ thống.`,
        duration: 5,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.imports.all,
      });
      await refetchSession();
      await queryClient.invalidateQueries({ queryKey: queryKeys.dossiers.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Xác nhận nhập dữ liệu thất bại');
    },
  });

  const handleDownloadSample = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        [
          'Mã hồ sơ',
          'Tên hồ sơ',
          'Mã khách hàng',
          'Tên khách hàng',
          'Số điện thoại',
          'Email',
          'Ngày sinh nhật',
          'Tuyến đường',
          'Ngày bắt đầu',
          'Ngày kết thúc',
          'Mức độ ưu tiên',
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet(headers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mau_Import_Ho_So');
      XLSX.writeFile(wb, 'SkyLux_Mau_Import_Du_Toan.xlsx');
    } catch {
      message.error('Không thể tạo tệp tin mẫu Excel');
    }
  };

  const handleRowEdit = (record: ImportRow) => {
    setEditingRow(record);
    setIsEditModalOpen(true);
  };

  const resetSession = () => {
    const sessionIdToReset = currentSessionId;

    resetWizardSession();

    if (!sessionIdToReset) return;

    // Remove the current session's cached session, preview, and error data so
    // a later upload cannot briefly show data from the previous file.
    queryClient.removeQueries({
      predicate: (query) => {
        const [scope, resource, params] = query.queryKey;
        if (scope !== 'imports') return false;

        if (resource === 'errors') {
          return params === sessionIdToReset;
        }

        if (resource === 'sessions' && params && typeof params === 'object') {
          return Object.values(params as Record<string, unknown>).includes(sessionIdToReset);
        }

        return false;
      },
    });
  };

  const canConfirm =
    session?.status !== 'CONFIRMED' &&
    (session?.errorRows || 0) === 0 &&
    (session?.validRows || 0) > 0;

  return {
    currentSessionId,
    setCurrentSessionId,
    resetSession,
    activeTab,
    setActiveTab,
    page,
    setPage,
    pageSize,
    setPageSize,
    session,
    isLoadingSession,
    refetchSession,
    previewData,
    isLoadingPreview,
    refetchPreview,
    errorsData,
    uploadMutation,
    validateMutation,
    confirmMutation,
    editingRow,
    setEditingRow,
    isEditModalOpen,
    setIsEditModalOpen,
    handleDownloadSample,
    handleRowEdit,
    canConfirm,
  };
}
