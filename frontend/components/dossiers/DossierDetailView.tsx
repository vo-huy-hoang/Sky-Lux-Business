"use client";

import React from "react";
import { Alert } from "antd";
import { useDossierDetail } from "@/hooks/dossiers";
import { EstimateStatus } from "@/types/estimate";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkflowHistory } from "@/hooks/workflow";
import {
  DossierActionModal,
  DossierDetailTabs,
  DossierHeader,
  DossierStepsCard,
  DossierSummaryCards,
  DossierWorkflowActionBar,
  DossierWorkflowTimeline,
  OperatorNotesCard,
  estimateStatusMeta,
  useDossierWorkflowActions,
  useDossierActiveEstimate,
  useDossierFinancials,
  useDossierUIStore,
} from "./detail";

export interface DossierDetailViewProps {
  dossierId: string;
  isDrawer?: boolean;
  onClose?: () => void;
}

export default function DossierDetailView({
  dossierId,
  isDrawer = false,
  onClose,
}: DossierDetailViewProps) {
  // TICKET-53.1: Reset UI store state when switching dossiers or unmounting
  React.useEffect(() => {
    useDossierUIStore.getState().resetUIState();
    return () => {
      useDossierUIStore.getState().resetUIState();
    };
  }, [dossierId]);

  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole("OPERATOR");
  const isCeoAdmin = hasRole(["SUPER_ADMIN", "CEO_ADMIN"]);
  const isSales = hasRole("SALES");

  const dossierQuery = useDossierDetail(dossierId);
  const {
    currentEstimate,
    estimate,
    isLoadingEstimate,
    isEstimatesLoading,
    refetch: refetchEstimates,
  } = useDossierActiveEstimate(dossierId);

  const workflowHistoryQuery = useWorkflowHistory(dossierId);
  const workflowHistory = workflowHistoryQuery.data?.data || [];

  const dossier = dossierQuery.data;

  // Workflow Actions Hook (TanStack mutations & Zustand UI modal synchronization)
  const workflow = useDossierWorkflowActions({
    dossierId,
    onClose,
    refetchAll: () => {
      dossierQuery.refetch();
      refetchEstimates();
      workflowHistoryQuery.refetch();
    },
  });

  // Financial calculations (Memoized deep seam)
  const { revenue, cost, profit, margin } = useDossierFinancials(estimate);
  const meta =
    estimateStatusMeta[
      dossier?.status || estimate?.status || EstimateStatus.DRAFT
    ] || estimateStatusMeta.DRAFT;

  if (dossierQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải chi tiết hồ sơ"
        description="Hồ sơ không tồn tại hoặc API chưa phản hồi."
      />
    );
  }

  const dossierStatus = dossier?.status;
  const canOperate = isOperator || isCeoAdmin;

  return (
    <div className={`space-y-4 ${isDrawer ? "pb-24" : "pb-20"}`}>
      {/* 1. Header / Breadcrumb */}
      <DossierHeader
        dossier={dossier}
        isDrawer={isDrawer}
        isOperator={isOperator}
        isCeoAdmin={isCeoAdmin}
      />

      {/* 2. Quy trình duyệt hồ sơ (Steps) */}
      <DossierStepsCard
        isLoading={isEstimatesLoading}
        currentEstimate={currentEstimate}
        estimate={estimate}
        meta={meta}
        dossierStatus={dossierStatus}
      />

      {/* 3. Lưới 9 thẻ chỉ số tài chính & điều hành */}
      <DossierSummaryCards
        dossier={dossier}
        estimate={estimate}
        currentEstimate={currentEstimate}
        revenue={revenue}
        cost={cost}
        profit={profit}
        margin={margin}
        meta={meta}
        isDrawer={isDrawer}
      />

      {/* 4. Khung 5 Tabs chi tiết & Timeline lịch sử */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          isDrawer ? "" : "xl:grid-cols-[minmax(0,1fr)_320px]"
        }`}
      >
        <DossierDetailTabs
          estimate={estimate}
          estimateLoading={isLoadingEstimate}
          dossierId={dossierId}
          dossier={dossier}
          isLocked={dossier?.status === "LOCKED"}
        />

        <aside className="space-y-4">
          <OperatorNotesCard estimate={estimate} dossier={dossier} />
          <DossierWorkflowTimeline
            workflowHistory={workflowHistory}
            estimate={estimate}
            dossier={dossier}
          />
        </aside>
      </div>

      {/* 5. Thanh nút bấm thao tác cố định theo vai trò */}
      <DossierWorkflowActionBar
        dossierId={dossierId}
        dossierStatus={dossierStatus}
        isDrawer={isDrawer}
        canOperate={canOperate}

        isSales={isSales}
        isCeoAdmin={isCeoAdmin}
        isActionLoading={workflow.isActionLoading}
        onStartReview={workflow.handleStartReview}
        onSubmit={workflow.handleSubmit}
        onResubmit={workflow.handleResubmit}
        onOpenModal={(action) => workflow.setModalAction(action)}
      />

      {/* 6. Modal xác nhận hành động duyệt / yêu cầu bổ sung */}
      <DossierActionModal
        isActionLoading={workflow.isActionLoading}
        onConfirm={workflow.handleExecuteModalAction}
      />
    </div>
  );
}
