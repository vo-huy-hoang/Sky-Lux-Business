'use client';

import React from 'react';
import { Card, Empty, Skeleton, Steps } from 'antd';
import { dateTime } from '../types';
import { EstimateStatus } from '@/types/estimate';

export interface DossierStepsCardProps {
  isLoading?: boolean;
  currentEstimate?: any;
  estimate?: any;
  meta: { step: number; label: string; className: string };
  dossierStatus?: string;
}

export function DossierStepsCard({
  isLoading,
  currentEstimate,
  estimate,
  meta,
  dossierStatus,
}: DossierStepsCardProps) {
  return (
    <Card className="ceo-card" title="Quy trình duyệt hồ sơ">
      {isLoading ? (
        <Skeleton active />
      ) : currentEstimate ? (
        <Steps
          current={meta.step}
          responsive
          items={[
            {
              title: 'Draft',
              content: dateTime(estimate?.createdAt),
            },
            {
              title: 'Đã gửi điều hành',
              content: dateTime(estimate?.submittedAt),
            },
            {
              title: 'Đang xem xét',
              content:
                dossierStatus === 'IN_REVIEW' ||
                estimate?.status === EstimateStatus.IN_REVIEW
                  ? 'Trạng thái hiện tại'
                  : undefined,
            },
            {
              title: dossierStatus === 'EDITING' ? 'Đang sửa' : 'Cần bổ sung',
              content:
                dossierStatus === 'NEED_CHANGES' ||
                dossierStatus === 'EDITING' ||
                estimate?.status === EstimateStatus.NEED_CHANGES
                  ? 'Trạng thái hiện tại'
                  : undefined,
            },
            {
              title: 'Đã duyệt',
              content: dateTime(estimate?.approvedAt),
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
