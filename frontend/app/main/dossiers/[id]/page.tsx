'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Breadcrumb, Button, Card, Col, Empty, Row, Skeleton, Space, Steps, Tabs, Tag, Timeline, Tooltip, Typography } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, FilePdfOutlined, FolderOpenOutlined, LockOutlined, MessageOutlined, RiseOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import EstimateExcelTables from '@/components/ceo/EstimateExcelTables';
import DossierDocumentsTab from '@/components/documents/DossierDocumentsTab';
import { DossierComments } from '../components/DossierComments';
import { EstimateStatus } from '@/types/estimate';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Text } = Typography;

function money(value?: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

function date(value?: string) {
  return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '-';
}

function dateTime(value?: string) {
  return value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-';
}

const estimateStatus: Record<string, { label: string; className: string; step: number }> = {
  DRAFT: { label: 'Draft', className: 'skylux-status-info', step: 0 },
  SUBMITTED: { label: 'Đã gửi điều hành', className: 'skylux-status-purple', step: 1 },
  IN_REVIEW: { label: 'Đang xem xét', className: 'skylux-status-warning', step: 2 },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple', step: 3 },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', step: 4 },
  REJECTED: { label: 'Từ chối', className: 'skylux-status-danger', step: 2 },
  SUPERSEDED: { label: 'Đã thay thế', className: 'skylux-status-info', step: 4 },
};

function SummaryCard({ label, value, sub, icon, tone = 'green' }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon: React.ReactNode; tone?: 'green' | 'gold' | 'blue' }) {
  const color = tone === 'gold' ? 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]' : tone === 'blue' ? 'bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]' : 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]';
  return <Card className="ceo-card h-full"><div className="flex items-start gap-3"><span className={`ceo-metric-icon h-10 w-10 ${color}`}>{icon}</span><div className="min-w-0"><Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text><div className="mt-1 truncate text-sm font-bold">{value}</div>{sub && <div className="mt-1 truncate text-xs text-[var(--ceo-text-muted)]">{sub}</div>}</div></div></Card>;
}

export default function DossierDetailPage() {
  const { hasRole } = useAuthStore();
  const isOperator = hasRole('OPERATOR');
  const params = useParams<{ id: string }>();
  const dossierId = params.id;
  const dossierQuery = useQuery({ queryKey: ['dossier', dossierId], queryFn: () => dossiersService.getDossier(dossierId), enabled: !!dossierId });
  const estimatesQuery = useQuery({ queryKey: ['dossier-estimates', dossierId], queryFn: () => estimatesService.getDossierEstimates(dossierId), enabled: !!dossierId });
  const currentEstimate = useMemo(() => {
    const estimateList = estimatesQuery.data?.items || [];
    return [...estimateList].sort((a, b) => b.versionNo - a.versionNo)[0];
  }, [estimatesQuery.data?.items]);
  const estimateQuery = useQuery({ queryKey: ['estimate', currentEstimate?.id], queryFn: () => estimatesService.getEstimate(currentEstimate!.id), enabled: !!currentEstimate?.id });

  const dossier = dossierQuery.data;
  const estimate = estimateQuery.data;
  const revenue = estimate?.revenueLines?.reduce((sum, line) => sum + Number(line.netAmount || 0), 0) || 0;
  const cost = estimate?.costLines?.reduce((sum, line) => sum + Number(line.netAmount || 0), 0) || 0;
  const profit = revenue - cost;
  const margin = revenue ? ((profit / revenue) * 100).toFixed(2) : '0.00';
  const meta = estimateStatus[estimate?.status || EstimateStatus.DRAFT] || estimateStatus.DRAFT;

  if (dossierQuery.isError) return <Alert type="error" showIcon title="Không thể tải chi tiết hồ sơ" description="Hồ sơ không tồn tại hoặc API chưa phản hồi." />;

  return <div className="space-y-4 pb-20">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Breadcrumb items={[{ title: <Link href={isOperator ? '/main/dossiers' : '/main/approvals'}>{isOperator ? 'Hồ sơ chờ xử lý' : 'Hồ sơ chờ duyệt'}</Link> }, { title: dossier?.code || 'Đang tải' }, { title: 'Chi tiết hồ sơ' }]} /><div className="mt-3 flex flex-wrap items-center gap-3"><h2 className="m-0 text-[25px] font-bold">Chi tiết hồ sơ - {dossier?.code || '...'}</h2>{dossier && <Tag>{dossier.code}</Tag>}</div></div>
      <Space><Button icon={<FilePdfOutlined />} disabled title="Chưa có API xuất PDF">Xuất PDF</Button></Space>
    </div>

    <Card className="ceo-card" title="Quy trình duyệt hồ sơ">
      {estimatesQuery.isLoading ? <Skeleton active /> : currentEstimate ? <Steps current={meta.step} responsive items={[
        { title: 'Draft', description: dateTime(estimate?.createdAt) },
        { title: 'Đã gửi điều hành', description: dateTime(estimate?.submittedAt) },
        { title: 'Đang xem xét', description: estimate?.status === EstimateStatus.IN_REVIEW ? 'Trạng thái hiện tại' : undefined },
        { title: 'Cần bổ sung', description: estimate?.status === EstimateStatus.NEED_CHANGES ? 'Trạng thái hiện tại' : undefined },
        { title: 'Đã duyệt', description: dateTime(estimate?.approvedAt) },
      ]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hồ sơ chưa có dự toán từ API" />}
    </Card>

    <Row gutter={[12, 12]}>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Khách hàng" value={dossier?.customer?.displayName || dossier?.name || '-'} sub={dossier?.customer?.code} icon={<TeamOutlined />} /></Col>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Tuyến / Chương trình" value={dossier?.route || dossier?.name || '-'} sub={dossier?.startDate && dossier?.endDate ? `${date(dossier.startDate)} - ${date(dossier.endDate)}` : undefined} icon={<FolderOpenOutlined />} /></Col>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Sales phụ trách" value={dossier?.salesUser?.fullName || '-'} sub={dossier?.salesUser?.email} icon={<TeamOutlined />} tone="gold" /></Col>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Điều hành phụ trách" value={dossier?.operatorUser?.fullName || '-'} sub={dossier?.operatorUser?.email} icon={<TeamOutlined />} /></Col>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Ngày đi" value={date(dossier?.startDate)} sub={dossier?.endDate ? `Đến ${date(dossier.endDate)}` : undefined} icon={<CalendarOutlined />} /></Col>
      <Col xs={24} md={12} xl={6}><SummaryCard label="Trạng thái dự toán" value={<Tag className={meta.className}>{meta.label}</Tag>} sub={currentEstimate ? `Phiên bản ${currentEstimate.versionNo}` : 'Chưa có dự toán'} icon={<WarningOutlined />} tone="gold" /></Col>
      <Col xs={24} md={12} xl={4}><SummaryCard label="Doanh thu" value={money(revenue, estimate?.currency)} sub="Chưa VAT theo dòng dự toán" icon={<DollarOutlined />} /></Col>
      <Col xs={24} md={12} xl={4}><SummaryCard label="Chi phí" value={money(cost, estimate?.currency)} sub="Chưa VAT theo dòng dự toán" icon={<DollarOutlined />} tone="gold" /></Col>
      <Col xs={24} md={12} xl={4}><SummaryCard label="Lợi nhuận" value={money(profit, estimate?.currency)} sub={`${margin}%`} icon={<RiseOutlined />} /></Col>
    </Row>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="ceo-card">
        {estimateQuery.isLoading ? <Skeleton active paragraph={{ rows: 12 }} /> : estimate ? <Tabs defaultActiveKey="overview" items={[
          { key: 'overview', label: 'Thông tin chung', children: <EstimateExcelTables revenueLines={estimate.revenueLines} costLines={estimate.costLines} currency={estimate.currency} /> },
          { key: 'revenue', label: 'Doanh thu', children: <EstimateExcelTables revenueLines={estimate.revenueLines} costLines={[]} currency={estimate.currency} /> },
          { key: 'cost', label: 'Chi phí', children: <EstimateExcelTables revenueLines={[]} costLines={estimate.costLines} currency={estimate.currency} /> },
          { key: 'documents', label: 'Tài liệu', children: <DossierDocumentsTab dossierId={dossierId} isLocked={dossier?.status === 'LOCKED'} /> },
          { key: 'discussion', label: 'Trao đổi', children: <DossierComments dossierId={dossierId} isLocked={dossier?.status === 'LOCKED'} /> },
        ]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hồ sơ chưa có dữ liệu dự toán" />}
      </Card>

      <aside className="space-y-4">
        <Card className="ceo-card" title="Lịch sử xử lý">
          <Timeline items={[
            ...(estimate?.approvedAt ? [{ color: 'green', children: <div><Text strong>Đã duyệt</Text><div className="text-xs text-[var(--ceo-text-muted)]">{dateTime(estimate.approvedAt)}</div></div> }] : []),
            ...(estimate?.submittedAt ? [{ color: 'gold', children: <div><Text strong>Đã gửi điều hành</Text><div className="text-xs text-[var(--ceo-text-muted)]">{dateTime(estimate.submittedAt)}</div></div> }] : []),
            ...(estimate?.createdAt ? [{ color: 'gray', children: <div><Text strong>Tạo dự toán</Text><div className="text-xs text-[var(--ceo-text-muted)]">{dateTime(estimate.createdAt)}</div></div> }] : []),
          ]} pending={false} />
          {!estimate && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch sử dự toán" />}
          <Text className="block text-xs text-[var(--ceo-text-muted)]">Workflow history chi tiết chưa có API đọc.</Text>
        </Card>
        <Card className="ceo-card" title={isOperator ? 'Ghi chú nội bộ Điều hành' : 'Ghi chú từ điều hành / CEO'}><div className="ceo-empty-panel min-h-[190px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Dùng tab Trao đổi để xem bình luận từ API" /></div></Card>
      </aside>
    </div>

    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--ceo-border)] bg-white/95 p-3 shadow-[0_-3px_14px_rgb(15_61_46_/_0.07)] backdrop-blur-sm lg:left-[238px]">
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-3 sm:grid-cols-3">
        <Tooltip title="API approvals hiện chưa hoàn thiện"><Button size="large" icon={<MessageOutlined />} className={isOperator ? 'op-warning-button' : undefined} disabled>Yêu cầu bổ sung</Button></Tooltip>
        <Tooltip title="API lưu ghi chú hiện chưa hoàn thiện"><Button size="large" icon={<LockOutlined />} disabled>{isOperator ? 'Lưu ghi chú' : 'Khóa hồ sơ'}</Button></Tooltip>
        <Tooltip title="API approvals hiện chưa hoàn thiện"><Button size="large" icon={<CheckCircleOutlined />} className="skylux-primary-button" disabled>Duyệt hồ sơ</Button></Tooltip>
      </div>
    </div>
  </div>;
}
