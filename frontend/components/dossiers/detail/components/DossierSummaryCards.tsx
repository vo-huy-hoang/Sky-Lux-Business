'use client';

import React from 'react';
import { Card, Col, Row, Tag, Typography } from 'antd';
import {
  CalendarOutlined,
  DollarOutlined,
  FolderOpenOutlined,
  RiseOutlined,
  TeamOutlined,
  WarningOutlined,
  WalletOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { date, money } from '../types';
import { useDossierFinanceSummary } from '@/hooks/use-payments';

const { Text } = Typography;

function SummaryCard({
  label,
  value,
  sub,
  icon,
  tone = 'green',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'green' | 'gold' | 'blue';
}) {
  const color =
    tone === 'gold'
      ? 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]'
      : tone === 'blue'
      ? 'bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]'
      : 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]';
  return (
    <Card className="ceo-card h-full">
      <div className="flex items-start gap-3">
        <span className={`ceo-metric-icon h-10 w-10 ${color}`}>{icon}</span>
        <div className="min-w-0">
          <Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text>
          <div className="mt-1 truncate text-sm font-bold">{value}</div>
          {sub && (
            <div className="mt-1 truncate text-xs text-[var(--ceo-text-muted)]">
              {sub}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export interface DossierSummaryCardsProps {
  dossier: any;
  estimate: any;
  currentEstimate: any;
  revenue: number;
  cost: number;
  profit: number;
  margin: string;
  meta: { label: string; className: string; step: number };
  isDrawer?: boolean;
}

export function DossierSummaryCards({
  dossier,
  estimate,
  currentEstimate,
  revenue,
  cost,
  profit,
  margin,
  meta,
  isDrawer = false,
}: DossierSummaryCardsProps) {
  const financeSummaryQuery = useDossierFinanceSummary(dossier?.id);
  const financeSummary = financeSummaryQuery.data?.data;

  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Khách hàng"
          value={dossier?.customer?.displayName || dossier?.name || '-'}
          sub={dossier?.customer?.code}
          icon={<TeamOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Tuyến / Chương trình"
          value={dossier?.route || dossier?.name || '-'}
          sub={
            dossier?.startDate && dossier?.endDate
              ? `${date(dossier.startDate)} - ${date(dossier.endDate)}`
              : undefined
          }
          icon={<FolderOpenOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Sales phụ trách"
          value={dossier?.salesUser?.fullName || '-'}
          sub={dossier?.salesUser?.email}
          icon={<TeamOutlined />}
          tone="gold"
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Điều hành phụ trách"
          value={dossier?.operatorUser?.fullName || '-'}
          sub={dossier?.operatorUser?.email}
          icon={<TeamOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Ngày đi"
          value={date(dossier?.startDate)}
          sub={dossier?.endDate ? `Đến ${date(dossier.endDate)}` : undefined}
          icon={<CalendarOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Trạng thái hồ sơ"
          value={<Tag className={meta.className}>{meta.label}</Tag>}
          sub={
            currentEstimate
              ? `Dự toán v${currentEstimate.versionNo}`
              : 'Chưa có dự toán'
          }
          icon={<WarningOutlined />}
          tone="gold"
        />
      </Col>
      <Col xs={24} md={8} xl={isDrawer ? 8 : 4}>
        <SummaryCard
          label="Doanh thu"
          value={money(revenue, estimate?.currency)}
          sub="Chưa VAT theo dòng dự toán"
          icon={<DollarOutlined />}
        />
      </Col>
      <Col xs={24} md={8} xl={isDrawer ? 8 : 4}>
        <SummaryCard
          label="Chi phí"
          value={money(cost, estimate?.currency)}
          sub="Chưa VAT theo dòng dự toán"
          icon={<DollarOutlined />}
          tone="gold"
        />
      </Col>
      <Col xs={24} md={8} xl={isDrawer ? 8 : 4}>
        <SummaryCard
          label="Lợi nhuận"
          value={money(profit, estimate?.currency)}
          sub={`${margin}%`}
          icon={<RiseOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Đã thu (Khách trả)"
          value={money(financeSummary?.totalPaid || 0, estimate?.currency)}
          sub="Tổng cộng từ các lần thanh toán"
          icon={<WalletOutlined />}
          tone="green"
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Công nợ còn lại"
          value={money(financeSummary?.remainingDebt || 0, estimate?.currency)}
          sub="Dựa trên tổng dự toán (cost)"
          icon={<PayCircleOutlined />}
          tone="gold"
        />
      </Col>
    </Row>
  );
}
