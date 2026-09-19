'use client';

import React, { useState } from 'react';
import { App, Button, Card, Col, InputNumber, Row, Tag, Typography } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarOutlined,
  ClockCircleOutlined,
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
import { paymentsService } from '@/services/payments.service';
import { queryKeys } from '@/lib/query-keys';

const { Text } = Typography;

function SummaryCard({
  label,
  value,
  sub,
  icon,
  tone = 'green',
  action,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'green' | 'gold' | 'blue';
  action?: React.ReactNode;
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
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

function PaymentEntry({
  dossierId,
  isLocked,
  remainingDebt,
  isSummaryReady,
  isSummaryLoading,
  isSummaryError,
  onRetry,
}: {
  dossierId: string;
  isLocked: boolean;
  remainingDebt: number;
  isSummaryReady: boolean;
  isSummaryLoading: boolean;
  isSummaryError: boolean;
  onRetry: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      paymentsService.createPayment(dossierId, {
        amount: amount as number,
        method: 'BANK_TRANSFER',
        paymentDirection: 'CUSTOMER_RECEIPT',
      }),
    onSuccess: (response) => {
      const paidAmount = Number(response.data?.amount || amount || 0);
      queryClient.setQueryData(
        queryKeys.payments.financeSummary(dossierId),
        (current: any) => {
          if (!current?.data) return current;
          const totalPaid = Number(current.data.totalPaid || 0) + paidAmount;
          const totalReceivable = Number(
            current.data.totalReceivable ?? current.data.totalCost ?? 0,
          );
          return {
            ...current,
            data: {
              ...current.data,
              totalPaid,
              remainingDebt: Math.max(totalReceivable - totalPaid, 0),
            },
          };
        },
      );
      setAmount(null);
      message.success('Đã ghi nhận khoản khách thanh toán');
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.dossierPayments(dossierId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.financeSummary(dossierId),
      });
    },
    onError: (error: unknown) => {
      message.error(
        error instanceof Error
          ? error.message
          : 'Không thể ghi nhận thanh toán',
      );
    },
  });

  const submit = () => {
    if (!amount || amount <= 0) {
      message.warning('Vui lòng nhập số tiền khách đã thanh toán');
      return;
    }
    if (!isSummaryReady) {
      message.warning('Đang đồng bộ công nợ, vui lòng thử lại sau giây lát');
      return;
    }
    if (amount > remainingDebt) {
      message.warning('Số tiền nhập không được vượt quá công nợ còn lại');
      return;
    }
    createMutation.mutate();
  };

  if (isLocked) return null;

  return (
    <div className="flex items-center gap-1.5" aria-label="Nhập khoản thanh toán mới">
      <InputNumber
        min={1}
        max={remainingDebt}
        value={amount}
        onChange={(value) => setAmount(value)}
        placeholder="Khoản thu mới"
        size="small"
        className="w-[132px]"
        controls={false}
        disabled={!isSummaryReady || remainingDebt <= 0}
        formatter={(value) => (value ? Number(value).toLocaleString('vi-VN') : '')}
        parser={(value) => (value || '').replace(/\D/g, '') as unknown as number}
      />
      <Button
        size="small"
        type="primary"
        loading={createMutation.isPending}
        disabled={isSummaryError ? false : !isSummaryReady || remainingDebt <= 0}
        onClick={isSummaryError ? onRetry : submit}
      >
        {isSummaryLoading
          ? 'Đang tải...'
          : isSummaryError
            ? 'Thử lại'
          : remainingDebt > 0
            ? 'Ghi nhận'
            : 'Đã đủ công nợ'}
      </Button>
    </div>
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
  const isLocked = dossier?.status === 'LOCKED';
  const isFinanceSummaryReady = Boolean(financeSummary);
  const isFinanceSummaryLoading = financeSummaryQuery.isLoading;
  const isFinanceSummaryError = financeSummaryQuery.isError;
  const totalPaid = Number(financeSummary?.totalPaid ?? 0);
  const totalReceivable = Number(financeSummary?.totalReceivable ?? 0);
  const remainingDebt = Math.max(
    Number(financeSummary?.remainingDebt ?? totalReceivable - totalPaid),
    0,
  );

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
          label="Thời gian"
          value={dossier?.startDate ? `Từ ${date(dossier.startDate)}` : '-'}
          sub={dossier?.endDate ? `Đến ${date(dossier.endDate)}` : undefined}
          icon={<CalendarOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Số ngày"
          value={dossier?.tourDuration || 'Chưa có dữ liệu'}
          icon={<ClockCircleOutlined />}
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
          label="Lợi nhuận gộp"
          value={money(profit, estimate?.currency)}
          sub={`${margin}%`}
          icon={<RiseOutlined />}
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Đã thu (Khách trả)"
          value={
            isFinanceSummaryReady
              ? money(totalPaid, estimate?.currency)
              : isFinanceSummaryError
                ? 'Không tải được'
                : 'Đang tải...'
          }
          sub="Nhập khoản thu mới bên dưới"
          icon={<WalletOutlined />}
          tone="green"
          action={
            <PaymentEntry
              dossierId={dossier?.id}
              isLocked={isLocked}
              remainingDebt={remainingDebt}
              isSummaryReady={isFinanceSummaryReady}
              isSummaryLoading={isFinanceSummaryLoading}
              isSummaryError={isFinanceSummaryError}
              onRetry={() => financeSummaryQuery.refetch()}
            />
          }
        />
      </Col>
      <Col xs={24} md={12} xl={isDrawer ? 12 : 6}>
        <SummaryCard
          label="Công nợ còn lại"
          value={
            isFinanceSummaryReady
              ? money(remainingDebt, estimate?.currency)
              : isFinanceSummaryError
                ? 'Không tải được'
                : 'Đang tải...'
          }
          sub="Tổng phải thu trừ số đã thu"
          icon={<PayCircleOutlined />}
          tone="gold"
        />
      </Col>
    </Row>
  );
}
