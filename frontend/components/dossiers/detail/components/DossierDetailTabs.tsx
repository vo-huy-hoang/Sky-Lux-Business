'use client';

import React, { useMemo } from 'react';
import { Card, Empty, Skeleton, Tabs } from 'antd';
import DossierDocumentsTab from '@/components/documents/DossierDocumentsTab';
import { DossierComments } from '@/app/main/dossiers/components/DossierComments';
import DossierPaymentsTab from './DossierPaymentsTab';
import { useDossierUIStore } from '../stores/useDossierUIStore';
import { DossierCostTable } from './DossierCostTable';
import { CostSummaryTable, calculateCostSummaryRows } from './CostSummaryTable';
import { DossierRevenueTable } from './DossierRevenueTable';

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

  const totalRevenue = useMemo(() => {
    const lines = estimate?.revenueLines || [];
    return lines.reduce((sum: number, line: any) => {
      const gross = Number(line.grossAmount) || 0;
      const subtotal =
        (Number(line.quantity) || 0) *
        (Number(line.multiplier) || 1) *
        (Number(line.unitPrice) || 0);
      return sum + (gross > 0 ? gross : subtotal);
    }, 0);
  }, [estimate?.revenueLines]);

  const costSummaryRows = useMemo(() => {
    return calculateCostSummaryRows(estimate?.costLines || [], totalRevenue, 1.08);
  }, [estimate?.costLines, totalRevenue]);

  return (
    <Card className="ceo-card">
      {estimateLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : estimate ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: 'Thông tin chung',
              children: (
                <div className="space-y-6">
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
              key: 'revenue',
              label: 'Doanh thu',
              children: (
                <DossierRevenueTable
                  revenueLines={estimate.revenueLines}
                  dossier={dossier}
                />
              ),
            },
            {
              key: 'cost',
              label: 'Chi phí',
              children: (
                <div className="space-y-6">
                  <DossierCostTable costLines={estimate.costLines} />
                  <CostSummaryTable rows={costSummaryRows} />
                </div>
              ),
            },
            {
              key: 'documents',
              label: 'Tài liệu',
              children: (
                <DossierDocumentsTab
                  dossierId={dossierId}
                  isLocked={isLocked}
                />
              ),
            },
            {
              key: 'discussion',
              label: 'Trao đổi',
              children: (
                <DossierComments
                  dossierId={dossierId}
                  isLocked={isLocked}
                />
              ),
            },
            {
              key: 'payments',
              label: 'Thanh toán',
              children: (
                <DossierPaymentsTab
                  dossierId={dossierId}
                  isLocked={isLocked}
                />
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
