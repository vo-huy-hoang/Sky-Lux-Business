"use client";

import React, { useEffect, useMemo } from "react";
import { Card, Empty, Skeleton, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";
import DossierDocumentsTab from "@/components/documents/DossierDocumentsTab";
import { DossierComments } from "@/app/main/dossiers/components/DossierComments";
import DossierPaymentsTab from "./DossierPaymentsTab";
import { useDossierUIStore } from "../stores/useDossierUIStore";
import { DossierCostTable } from "./DossierCostTable";
import { CostSummaryTable, calculateCostSummaryRows } from "./CostSummaryTable";
import { DossierRevenueTable } from "./DossierRevenueTable";
import { sumWorkbookGrossAmounts } from "@/lib/financial-calculations";
import DossierChangeRequests from "./DossierChangeRequests";
import { useDossierChangeRequests } from "@/hooks/dossiers";
import { useAuthStore } from "@/lib/stores/auth-store";

const { Text } = Typography;

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

  const totalRevenueGross = useMemo(
    () => sumWorkbookGrossAmounts(estimate?.revenueLines || []),
    [estimate?.revenueLines],
  );

  const costSummaryRows = useMemo(() => {
    return calculateCostSummaryRows(
      estimate?.costLines || [],
      totalRevenueGross,
    );
  }, [estimate?.costLines, totalRevenueGross]);

  return (
    <Card className="ceo-card">
      {estimateLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : estimate ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={classificationTags}
          items={[
            {
              key: "overview",
              label: "Thông tin chung",
              children: (
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
                    revenueLines={estimate.revenueLines}
                    dossier={dossier}
                  />
                  <DossierCostTable costLines={estimate.costLines} />
                  <CostSummaryTable rows={costSummaryRows} />
                </div>
              ),
            },
            {
              key: "revenue",
              label: "Doanh thu",
              children: (
                <DossierRevenueTable
                  revenueLines={estimate.revenueLines}
                  dossier={dossier}
                />
              ),
            },
            {
              key: "cost",
              label: "Chi phí",
              children: (
                <div className="space-y-6">
                  <DossierCostTable costLines={estimate.costLines} />
                  <CostSummaryTable rows={costSummaryRows} />
                </div>
              ),
            },
            {
              key: "documents",
              label: "Tài liệu",
              children: (
                <DossierDocumentsTab
                  dossierId={dossierId}
                  isLocked={isLocked}
                />
              ),
            },
            {
              key: "discussion",
              label: "Trao đổi",
              children: (
                <DossierComments dossierId={dossierId} isLocked={isLocked} />
              ),
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
              children: (
                <DossierPaymentsTab dossierId={dossierId} isLocked={isLocked} />
              ),
            },
          ]}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hồ sơ chưa có dữ liệu dự toán"
        />
      )}
    </Card>
  );
}

export default DossierDetailTabs;
