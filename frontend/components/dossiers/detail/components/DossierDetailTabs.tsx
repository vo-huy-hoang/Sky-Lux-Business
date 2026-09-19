"use client";

import React, { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, Empty, Skeleton, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useDossierUIStore } from "../stores/useDossierUIStore";
import { DossierCostTable } from "./DossierCostTable";
import { CostSummaryTable } from "./CostSummaryTable";
import { DossierRevenueTable } from "./DossierRevenueTable";
import { useDossierFinancials } from "../hooks/useDossierFinancials";
import DossierChangeRequests from "./DossierChangeRequests";
import { useDossierChangeRequests } from "@/hooks/dossiers";
import { useAuthStore } from "@/lib/stores/auth-store";

const { Text } = Typography;

// Dynamic sub-tabs (SSR: false, on-demand chunk loading)
const DossierDocumentsTab = dynamic(
  () => import("@/components/documents/DossierDocumentsTab"),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 8 }} className="p-4" />,
  },
);

const DossierComments = dynamic(
  () => import("@/app/main/dossiers/components/DossierComments"),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 6 }} className="p-4" />,
  },
);

const DossierPaymentsTab = dynamic(
  () => import("./DossierPaymentsTab"),
  {
    ssr: false,
    loading: () => <Skeleton active paragraph={{ rows: 6 }} className="p-4" />,
  },
);

export interface DossierDetailTabsProps {
  estimate: any;
  estimateLoading?: boolean;
  dossierId: string;
  dossier?: any;
  isLocked?: boolean;
}

export function DossierDetailTabs({
  estimate,
  estimateLoading = false,
  dossierId,
  dossier,
  isLocked = false,
}: DossierDetailTabsProps) {
  const activeTab = useDossierUIStore((s) => s.activeTab);
  const setActiveTab = useDossierUIStore((s) => s.setActiveTab);
  const visitedTabs = useDossierUIStore((s) => s.visitedTabs) || { overview: true };
  const isSales = useAuthStore((state) => state.hasRole("SALES"));
  const changeRequestsQuery = useDossierChangeRequests(dossierId);
  const openChangeRequestCount = (changeRequestsQuery.data?.data || []).filter(
    (request) => request.status === "OPEN",
  ).length;

  useEffect(() => {
    if (isSales && dossier?.status === "NEED_CHANGES" && openChangeRequestCount > 0) {
      setActiveTab("change-requests");
    }
  }, [dossier?.status, isSales, openChangeRequestCount, setActiveTab]);

  // Ensure current activeTab is recorded in visitedTabs
  React.useEffect(() => {
    if (activeTab && !visitedTabs[activeTab]) {
      useDossierUIStore.getState().markTabVisited(activeTab);
    }
  }, [activeTab, visitedTabs]);

  const businessLine = dossier?.businessLine?.code?.startsWith("TOUR_")
    ? "TOUR"
    : dossier?.businessLine?.name;
  const marketType = dossier?.marketType?.name;

  const classificationTags =
    businessLine || marketType ? (
      <div className="flex items-center gap-2 pb-1 pr-1">
        {businessLine && (
          <Tag color="gold" className="m-0 font-medium">
            Mảng: {businessLine}
          </Tag>
        )}
        {marketType && (
          <Tag color="blue" className="m-0 font-medium">
            Loại hình: {marketType}
          </Tag>
        )}
      </div>
    ) : null;

  // TICKET-55.1: Seam Consolidation - Nhận toàn bộ tính toán costSummaryRows từ hook tập trung useDossierFinancials
  const { costSummaryRows } = useDossierFinancials(estimate);
  const currency = estimate?.currency || dossier?.currency || "VND";

  // Sub-tab content memoization to eliminate duplicate table mounting and reduce CPU usage
  const overviewContent = useMemo(() => {
    if (activeTab !== "overview") return null;
    if (estimateLoading) {
      return <Skeleton active paragraph={{ rows: 10 }} className="p-4" />;
    }
    if (!estimate) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hồ sơ chưa có dữ liệu dự toán"
        />
      );
    }
    return (
      <div className="space-y-6">
        <Card size="small" className="border border-slate-200 shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Text strong>Ngày khóa hồ sơ</Text>
              <div className="mt-1 text-xs text-slate-500">
                Dùng làm mốc thời gian khi lọc báo cáo.
              </div>
            </div>

            <Text>
              {dossier?.lockedAt
                ? dayjs(dossier.lockedAt).format("DD/MM/YYYY")
                : "Chưa khóa"}
            </Text>
          </div>
        </Card>
        <DossierRevenueTable
          revenueLines={estimate?.revenueLines}
          dossier={dossier}
          currency={currency}
        />
        <DossierCostTable costLines={estimate?.costLines} currency={currency} />
        <CostSummaryTable rows={costSummaryRows} currency={currency} />
      </div>
    );
  }, [activeTab, estimateLoading, estimate, dossier, costSummaryRows, currency]);

  const revenueContent = useMemo(() => {
    if (activeTab !== "revenue") return null;
    if (estimateLoading) {
      return <Skeleton active paragraph={{ rows: 10 }} className="p-4" />;
    }
    if (!estimate) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hồ sơ chưa có dữ liệu dự toán"
        />
      );
    }
    return (
      <DossierRevenueTable
        revenueLines={estimate?.revenueLines}
        dossier={dossier}
        currency={currency}
      />
    );
  }, [activeTab, estimateLoading, estimate, dossier, currency]);

  const costContent = useMemo(() => {
    if (activeTab !== "cost") return null;
    if (estimateLoading) {
      return <Skeleton active paragraph={{ rows: 10 }} className="p-4" />;
    }
    if (!estimate) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hồ sơ chưa có dữ liệu dự toán"
        />
      );
    }
    return (
      <div className="space-y-6">
        <DossierCostTable costLines={estimate?.costLines} currency={currency} />
        <CostSummaryTable rows={costSummaryRows} currency={currency} />
      </div>
    );
  }, [activeTab, estimateLoading, estimate, costSummaryRows, currency]);

  const isDocumentsVisited = Boolean(visitedTabs.documents || activeTab === "documents");
  const documentsContent = isDocumentsVisited ? (
    <DossierDocumentsTab
      dossierId={dossierId}
      isLocked={isLocked}
      isActive={activeTab === "documents"}
    />
  ) : null;

  const isDiscussionVisited = Boolean(visitedTabs.discussion || activeTab === "discussion");
  const discussionContent = isDiscussionVisited ? (
    <DossierComments
      dossierId={dossierId}
      isLocked={isLocked}
      isActive={activeTab === "discussion"}
    />
  ) : null;

  const isPaymentsVisited = Boolean(visitedTabs.payments || activeTab === "payments");
  const paymentsContent = isPaymentsVisited ? (
    <DossierPaymentsTab
      dossierId={dossierId}
      isLocked={isLocked}
      isActive={activeTab === "payments"}
      currency={currency}
    />
  ) : null;

  const tabItems = useMemo(
    () => [
      {
        key: "overview",
        label: "Thông tin chung",
        children: overviewContent,
      },
      {
        key: "revenue",
        label: "Doanh thu",
        children: revenueContent,
      },
      {
        key: "cost",
        label: "Chi phí",
        children: costContent,
      },
      {
        key: "documents",
        label: "Tài liệu",
        children: documentsContent,
      },
      {
        key: "discussion",
        label: "Trao đổi",
        children: discussionContent,
      },
      {
        key: "change-requests",
        label: (
          <span>
            Yêu cầu bổ sung
            {openChangeRequestCount > 0 && (
              <Tag color="orange" className="ml-2">
                {openChangeRequestCount}
              </Tag>
            )}
          </span>
        ),
        children: (
          <DossierChangeRequests
            dossierId={dossierId}
            isLocked={isLocked}
          />
        ),
      },
      {
        key: "payments",
        label: "Thanh toán",
        children: paymentsContent,
      },
    ],
    [
      overviewContent,
      revenueContent,
      costContent,
      documentsContent,
      discussionContent,
      paymentsContent,
    ],
  );

  return (
    <Card className="ceo-card">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={classificationTags}
        items={tabItems}
      />
    </Card>
  );
}

export default DossierDetailTabs;
