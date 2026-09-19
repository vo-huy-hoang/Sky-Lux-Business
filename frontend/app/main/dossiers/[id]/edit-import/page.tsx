'use client';

import React, { useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Skeleton, Empty, App } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { suppliersService } from '@/services/suppliers.service';
import { EstimateStatus } from '@/types/estimate';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { queryKeys } from '@/lib/query-keys';
import {
  useEstimateEditorState,
  EstimateFileMetadataCard,
  EstimateOperationalCockpit,
  EstimateRevenueEditorTable,
  EstimateCostEditorTable,
  EstimateBottomActionBar,
  IssueItem,
} from '@/components/dossiers/edit-import';

export default function EditImportDossierPage() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dossierId = params?.id as string;

  const hasRole = useAuthStore((state) => state.hasRole);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isOperator = hasRole('OPERATOR');
  const isCeoAdmin = hasRole(['SUPER_ADMIN', 'CEO_ADMIN']);
  const canOperate = isOperator || isCeoAdmin;

  // 1. Fetch Dossier Info
  const { data: dossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: queryKeys.dossiers.detail(dossierId),
    queryFn: () => dossiersService.getDossier(dossierId),
    enabled: !!dossierId,
  });

  // 2. Fetch Estimates List
  const { data: estimatesData, isLoading: isLoadingEstimates } = useQuery({
    queryKey: queryKeys.estimates.dossierList(dossierId),
    queryFn: () => estimatesService.getDossierEstimates(dossierId),
    enabled: !!dossierId,
  });

  const latestEstimateItem = useMemo(() => {
    const list = estimatesData?.data || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0))[0];
  }, [estimatesData?.data]);

  // 3. Fetch Full Estimate Detail
  const { data: estimate, isLoading: isLoadingDetail } = useQuery({
    queryKey: queryKeys.estimates.detail(latestEstimateItem?.id),
    queryFn: () => estimatesService.getEstimate(latestEstimateItem!.id),
    enabled: !!latestEstimateItem?.id,
  });

  // 4. Fetch Suppliers for Cost dropdown
  const { data: suppliersData } = useQuery({
    queryKey: queryKeys.suppliers.list({ page: 1, limit: 100 }),
    queryFn: () => suppliersService.getSuppliers({ page: 1, limit: 100 }),
  });

  const supplierOptions = useMemo(() => {
    const list = (suppliersData?.data || []).map((s: any) => ({
      label: s.name,
      value: s.name,
      id: s.id,
    }));
    if (list.length === 0) {
      return [
        { label: 'Vietnam Airlines', value: 'Vietnam Airlines' },
        { label: 'Hotel Boss', value: 'Hotel Boss' },
        { label: 'Marina Bay Sands', value: 'Marina Bay Sands' },
        { label: 'TransViet', value: 'TransViet' },
        { label: 'VN Guide', value: 'VN Guide' },
      ];
    }
    return list;
  }, [suppliersData?.data]);

  // 5. Encapsulated Estimate State and Domain Hook
  const {
    revenueRows,
    costRows,
    issuesList,
    errorCount,
    warningCount,
    totalRevenueNoVat,
    costVatSections,
    costNoVatItems,
    totalCostVat,
    totalCostNoVatSum,
    grandTotalCost,
    effectiveOperatorNote,
    setOperatorNote,
    lastSavedTime,
    handleRevenueCellChange,
    handleAddRevenueRow,
    handleDeleteRevenueRow,
    handleCostCellChange,
    handleAddCostRow,
    handleDeleteCostRow,
    saveMutation,
  } = useEstimateEditorState({
    dossierId,
    dossier,
    estimate,
    latestEstimateItem,
    canOperate,
  });

  // 6. Smooth Jump-to-Row Handler
  const handleJumpToRow = useCallback(
    (issue: IssueItem) => {
      const elId = issue.isCost
        ? `cost-row-${issue.rowId}`
        : `revenue-row-${issue.rowId}`;
      const el = document.getElementById(elId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-emerald-100/70');
        setTimeout(() => {
          el.classList.remove('bg-emerald-100/70');
        }, 2000);
        message.info(`Đã cuộn đến ${issue.title}`);
      }
    },
    [message],
  );

  if (isLoadingDossier || isLoadingEstimates || isLoadingDetail) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl shadow-sm">
        <Empty description="Không tìm thấy thông tin hồ sơ tour" />
        <Button
          type="primary"
          className="mt-4 skylux-primary-button"
          onClick={() => router.push('/main/dossiers')}
        >
          Quay lại danh sách hồ sơ
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Page Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/main/dossiers/${dossier.id}`)}
            className="rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 font-medium"
          >
            Chi tiết hồ sơ
          </Button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0">
            Chỉnh sửa dữ liệu nhập - {dossier.code}
          </h1>
        </div>
      </div>

      {/* 2. Top Warning Notification Banner */}
      <div className="rounded-xl border border-amber-200 bg-[#FFFBEB] px-4 py-2.5 flex items-center gap-2.5 text-amber-800 text-xs shadow-xs">
        <InfoCircleOutlined className="text-amber-600 text-sm shrink-0" />
        <span className="font-medium">
          Dữ liệu được tạo từ file Excel, chỉ chỉnh sửa thông tin đã import
        </span>
      </div>

      {/* 3. File & Session Summary Metadata Card */}
      <EstimateFileMetadataCard
        dossier={dossier}
        totalRowCount={revenueRows.length + costRows.length}
        validRowCount={
          revenueRows.filter((r) => r.status === 'VALID').length +
          costRows.filter((c) => c.status === 'VALID').length
        }
        errorRowCount={
          revenueRows.filter((r) => r.status === 'ERROR').length +
          costRows.filter((c) => c.status === 'ERROR').length
        }
      />

      {/* 4. Top Operational Cockpit: Lỗi cần xử lý & Ghi chú của điều hành */}
      <EstimateOperationalCockpit
        issuesList={issuesList}
        errorCount={errorCount}
        warningCount={warningCount}
        operatorNote={effectiveOperatorNote}
        onOperatorNoteChange={setOperatorNote}
        operatorUserName={dossier.operatorUser?.fullName}
        updatedAt={dossier.updatedAt}
        onJumpToRow={handleJumpToRow}
      />

      {/* 5. Financial Estimation Tables */}
      <div className="space-y-5">
        <EstimateRevenueEditorTable
          rows={revenueRows}
          totalRevenueNoVat={totalRevenueNoVat}
          onCellChange={handleRevenueCellChange}
          onAddRow={handleAddRevenueRow}
          onDeleteRow={handleDeleteRevenueRow}
        />

        <EstimateCostEditorTable
          costRows={costRows}
          costVatSections={costVatSections}
          costNoVatItems={costNoVatItems}
          totalCostVat={totalCostVat}
          totalCostNoVatSum={totalCostNoVatSum}
          grandTotalCost={grandTotalCost}
          supplierOptions={supplierOptions}
          onCellChange={handleCostCellChange}
          onAddRow={handleAddCostRow}
          onDeleteRow={handleDeleteCostRow}
        />
      </div>

      {/* 6. Bottom Fixed Action Bar */}
      <EstimateBottomActionBar
        dossierStatus={dossier?.status}
        canOperate={canOperate}
        lastSavedTime={lastSavedTime}
        isSaving={saveMutation.isPending}
        sidebarCollapsed={sidebarCollapsed}
        onCancel={() => router.push(`/main/dossiers/${dossierId}`)}
        onSaveDraft={() => saveMutation.mutate({ navigateBack: false })}
        onSaveAndSubmit={() => {
          if (canOperate) {
            saveMutation.mutate({ navigateBack: true });
          } else {
            saveMutation.mutate({
              submitStatus: EstimateStatus.SUBMITTED,
              navigateBack: true,
            });
          }
        }}
      />
    </div>
  );
}
