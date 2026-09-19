'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ClockCircleOutlined,
  EyeOutlined,
  FileDoneOutlined,
  SearchOutlined,
  WarningOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { estimatesService } from '@/services/estimates.service';
import { EstimateItem, EstimateStatus } from '@/types/estimate';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/financial-calculations';


const { Text } = Typography;

function money(value?: number) {
  return formatCurrency(value);
}

function dateTime(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function waitingTime(value?: string) {
  if (!value) return 'Chưa có thời điểm gửi';
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours >= 24) return `Đã chờ ${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
  return `Đã chờ ${hours} giờ`;
}

export default function ApprovalsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const submittedQuery = useQuery({
    queryKey: queryKeys.approvals.submitted({ status: EstimateStatus.SUBMITTED }),
    queryFn: ({ signal }) =>
      estimatesService.getEstimates(
        { page: 1, limit: 100, status: EstimateStatus.SUBMITTED },
        { signal },
      ),
  });
  const reviewingQuery = useQuery({
    queryKey: queryKeys.approvals.reviewing({ status: EstimateStatus.IN_REVIEW }),
    queryFn: ({ signal }) =>
      estimatesService.getEstimates(
        { page: 1, limit: 100, status: EstimateStatus.IN_REVIEW },
        { signal },
      ),
  });

  const estimates = useMemo(() => {
    const all = [...(submittedQuery.data?.data || []), ...(reviewingQuery.data?.data || [])];
    return all
      .filter((item) => status === 'ALL' || item.status === status)
      .filter((item) => {
        const keyword = search.trim().toLocaleLowerCase('vi-VN');
        if (!keyword) return true;
        return [item.dossier?.code, item.dossier?.name, item.dossier?.route, item.note]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('vi-VN').includes(keyword));
      })
      .sort((a, b) => new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime());
  }, [reviewingQuery.data?.data, search, status, submittedQuery.data?.data]);

  const getFinancial = (estimate: EstimateItem) => {
    const revenue = Number(estimate.totalRevenue || 0);
    const cost = Number(estimate.totalCost || 0);
    const profit = Number(
      estimate.totalProfit !== undefined
        ? estimate.totalProfit
        : revenue - cost,
    );
    return { revenue, cost, profit };
  };

  const columns = [
    {
      title: 'Mã hồ sơ', width: 135,
      render: (_: unknown, item: EstimateItem) => (
        <Link href={`/main/dossiers/${item.dossierId}`} className="font-semibold text-[var(--ceo-primary-700)]">
          {item.dossier?.code || item.dossierId.slice(0, 8)}
        </Link>
      ),
    },
    { title: 'Hồ sơ / Chương trình', render: (_: unknown, item: EstimateItem) => (
      <div><div className="font-semibold">{item.dossier?.name || 'Hồ sơ chưa có tên'}</div><div className="mt-0.5 text-xs text-[var(--ceo-text-muted)]">{item.dossier?.route || '-'}</div></div>
    ) },
    { title: 'Phiên bản', dataIndex: 'versionNo', width: 88, align: 'center' as const, render: (value: number) => `V${value}` },
    { title: 'Ngày gửi duyệt', dataIndex: 'submittedAt', width: 158, render: (value?: string, item?: EstimateItem) => dateTime(value || item?.createdAt) },
    { title: 'Doanh thu dự toán', width: 158, align: 'right' as const, render: (_: unknown, item: EstimateItem) => money(getFinancial(item).revenue) },
    { title: 'Lợi nhuận', width: 150, align: 'right' as const, render: (_: unknown, item: EstimateItem) => {
      const value = getFinancial(item).profit;
      return <Text strong style={{ color: value >= 0 ? '#0A8A61' : '#DC3F46' }}>{money(value)}</Text>;
    } },
    { title: 'Tình trạng', dataIndex: 'status', width: 128, render: (value: EstimateStatus) => (
      <Tag className={value === EstimateStatus.IN_REVIEW ? 'skylux-status-warning' : 'skylux-status-purple'}>
        {value === EstimateStatus.IN_REVIEW ? 'Đang xem xét' : 'Chờ duyệt'}
      </Tag>
    ) },
    { title: 'Thao tác', width: 125, fixed: 'right' as const, render: (_: unknown, item: EstimateItem) => (
      <Link href={`/main/dossiers/${item.dossierId}`}><Button size="small" icon={<EyeOutlined />} className="skylux-outline-button">Xem hồ sơ</Button></Link>
    ) },
  ];

  const isLoading = submittedQuery.isLoading || reviewingQuery.isLoading;
  const submittedCount = submittedQuery.data?.meta?.total || 0;
  const reviewingCount = reviewingQuery.data?.meta?.total || 0;

  return (
    <div className="space-y-4">
      <div className="ceo-toolbar grid-cols-1 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} prefix={<SearchOutlined />} placeholder="Tìm mã hồ sơ, chương trình..." allowClear aria-label="Tìm hồ sơ chờ duyệt" />
        <Select value={status} onChange={setStatus} aria-label="Lọc trạng thái" options={[
          { label: 'Tất cả trạng thái', value: 'ALL' },
          { label: 'Chờ duyệt', value: EstimateStatus.SUBMITTED },
          { label: 'Đang xem xét', value: EstimateStatus.IN_REVIEW },
        ]} />
        <Button onClick={() => { submittedQuery.refetch(); reviewingQuery.refetch(); }}>Làm mới dữ liệu</Button>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} xl={6}><Card className="ceo-card ceo-metric-card"><div className="flex items-center gap-4"><span className="ceo-metric-icon bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]"><ClockCircleOutlined /></span><div><Text type="secondary">Chờ duyệt</Text><div className="text-2xl font-bold">{isLoading ? <Skeleton.Input active size="small" /> : submittedCount}</div><Text className="text-xs text-[var(--ceo-text-muted)]">Từ API dự toán</Text></div></div></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card className="ceo-card ceo-metric-card"><div className="flex items-center gap-4"><span className="ceo-metric-icon bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]"><FileDoneOutlined /></span><div><Text type="secondary">Đang xem xét</Text><div className="text-2xl font-bold">{isLoading ? <Skeleton.Input active size="small" /> : reviewingCount}</div><Text className="text-xs text-[var(--ceo-text-muted)]">Đã được tiếp nhận</Text></div></div></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card className="ceo-card ceo-metric-card"><div className="flex items-center gap-4"><span className="ceo-metric-icon bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]"><FileDoneOutlined /></span><div><Text type="secondary">Tổng hàng hiển thị</Text><div className="text-2xl font-bold">{isLoading ? <Skeleton.Input active size="small" /> : estimates.length}</div><Text className="text-xs text-[var(--ceo-text-muted)]">Theo bộ lọc hiện tại</Text></div></div></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card className="ceo-card ceo-metric-card"><div className="flex items-center gap-4"><span className="ceo-metric-icon bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]"><WarningOutlined /></span><div><Text type="secondary">Quá hạn SLA</Text><div className="text-2xl font-bold text-[var(--ceo-text-soft)]">-</div><Text className="text-xs text-[var(--ceo-text-muted)]">Chưa có API cấu hình SLA</Text></div></div></Card></Col>
      </Row>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="ceo-card" title="Danh sách hồ sơ chờ duyệt">
          <Table rowKey="id" dataSource={estimates} columns={columns} loading={isLoading} className="ceo-table" scroll={{ x: 1160 }} pagination={{ pageSize: 10, showSizeChanger: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hồ sơ chờ duyệt từ API" /> }} />
        </Card>
        <Card className="ceo-card" title="Xử lý ưu tiên">
          {isLoading ? <Skeleton active /> : estimates.length ? (
            <div className="space-y-2">
              {estimates.slice(0, 5).map((item) => (
                <Link key={item.id} href={`/main/dossiers/${item.dossierId}`} className="block rounded-md border border-[var(--ceo-divider)] p-3 transition-colors hover:border-[var(--ceo-primary-700)]">
                  <div className="flex items-start justify-between gap-3"><Text strong>{item.dossier?.code || item.dossierId.slice(0, 8)}</Text><ArrowLink /></div>
                  <div className="mt-1 truncate text-xs text-[var(--ceo-text-muted)]">{item.dossier?.name || item.dossier?.route || 'Hồ sơ dự toán'}</div>
                  <div className="mt-2 text-xs font-semibold text-[var(--ceo-warning)]">{waitingTime(item.submittedAt || item.createdAt)}</div>
                </Link>
              ))}
            </div>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ ưu tiên" />}
        </Card>
      </div>
    </div>
  );
}

function ArrowLink() {
  return <ArrowRightOutlined aria-hidden className="text-[var(--ceo-primary-700)]" />;
}
