'use client';

import React from 'react';
import { Card, Empty, Skeleton, Tabs } from 'antd';
import EstimateExcelTables from '@/components/ceo/EstimateExcelTables';
import DossierDocumentsTab from '@/components/documents/DossierDocumentsTab';
import { DossierComments } from '@/app/main/dossiers/components/DossierComments';
import { useDossierUIStore } from '../stores/useDossierUIStore';

export interface DossierDetailTabsProps {
  estimate: any;
  estimateLoading?: boolean;
  dossierId: string;
  isLocked?: boolean;
}

export function DossierDetailTabs({
  estimate,
  estimateLoading = false,
  dossierId,
  isLocked = false,
}: DossierDetailTabsProps) {
  const activeTab = useDossierUIStore((s) => s.activeTab);
  const setActiveTab = useDossierUIStore((s) => s.setActiveTab);

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
                <EstimateExcelTables
                  revenueLines={estimate.revenueLines}
                  costLines={estimate.costLines}
                  currency={estimate.currency}
                />
              ),
            },
            {
              key: 'revenue',
              label: 'Doanh thu',
              children: (
                <EstimateExcelTables
                  revenueLines={estimate.revenueLines}
                  costLines={[]}
                  currency={estimate.currency}
                />
              ),
            },
            {
              key: 'cost',
              label: 'Chi phí',
              children: (
                <EstimateExcelTables
                  revenueLines={[]}
                  costLines={estimate.costLines}
                  currency={estimate.currency}
                />
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
