'use client';

import React, { useMemo } from 'react';
import { Avatar, Button, Card, Col, DatePicker, Empty, Progress, Row, Select, Skeleton, Table, Tag, Typography, Tabs } from 'antd';
import { CheckCircleOutlined, DownloadOutlined, QuestionCircleOutlined, RiseOutlined, StarOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useOperatorSalesSummary } from '@/hooks/dashboards';
import { useFilterStore } from '@/lib/stores/filter-store';
import { OperatorSalesSummaryItem } from '@/types/dashboard';
import { formatCurrency } from '@/lib/financial-calculations';
import KpiDashboard from './components/KpiDashboard';

const { Title, Text } = Typography;

function money(value?: number | null) {
  return formatCurrency(value);
}

function compact(value?: number | null) {
  return formatCurrency(value, { compact: true, showSymbol: false });
}

function Metric({ label, value, hint, icon, tone = 'green', loading }: { label: string; value: React.ReactNode; hint: string; icon: React.ReactNode; tone?: 'green' | 'gold' | 'purple' | 'blue'; loading?: boolean }) {
  const color = tone === 'gold' ? 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]' : tone === 'purple' ? 'bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]' : tone === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]';
  return (
    <Card className="ceo-card ceo-metric-card h-full">
      <div className="flex items-center gap-4">
        <span className={`ceo-metric-icon ${color}`}>{icon}</span>
        <div className="min-w-0">
          <Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text>
          <div className="mt-1 text-[24px] font-bold leading-8">{loading ? <Skeleton.Input active size="small" /> : value}</div>
          <div className="mt-1 truncate text-xs text-[var(--ceo-text-muted)]">{hint}</div>
        </div>
      </div>
    </Card>
  );
}

function SalesPerformance() {
  const dateString = useFilterStore((state) => state.dateString);
  const setDateString = useFilterStore((state) => state.setDateString);
  const period = dayjs(dateString);

  const { data: salesList = [], isLoading, refetch } = useOperatorSalesSummary();

  const totalSales = salesList.length;
  const topSales = useMemo(() => salesList.slice(0, 5), [salesList]);
  const highPerformers = useMemo(() => salesList.filter((s) => s.completionRate >= 80).length, [salesList]);
  const needSupport = useMemo(() => salesList.filter((s) => s.completionRate < 50 && s.totalDossiers > 0).length, [salesList]);
  const totalRevenue = useMemo(() => salesList.reduce((sum, s) => sum + s.totalRevenue, 0), [salesList]);

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 50,
      render: (_: unknown, __: unknown, index: number) => <span className="font-semibold text-slate-500">{index + 1}</span>,
    },
    {
      title: 'Nhân viên Sales',
      key: 'sales',
      width: 240,
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-[#0F3D2E] text-[#D4AF37]">{row.salesUserName.charAt(0)}</Avatar>
          <div>
            <Text strong className="block">{row.salesUserName}</Text>
            <Text className="text-xs text-[var(--ceo-text-muted)]">{row.employeeCode ? `Mã: ${row.employeeCode}` : row.salesUserEmail || 'N/A'}</Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Hồ sơ tiếp nhận',
      dataIndex: 'totalDossiers',
      key: 'totalDossiers',
      align: 'right' as const,
      width: 130,
      render: (val: number) => <strong className="tabular-nums">{val}</strong>,
    },
    {
      title: 'Hồ sơ đã duyệt',
      dataIndex: 'approvedDossiers',
      key: 'approvedDossiers',
      align: 'right' as const,
      width: 130,
      render: (val: number) => <span className="tabular-nums font-semibold text-emerald-700">{val}</span>,
    },
    {
      title: 'Doanh thu thực tế',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      width: 170,
      render: (val: number) => <strong className="tabular-nums text-[#0F3D2E]">{money(val)}</strong>,
    },
    {
      title: 'Lợi nhuận gộp',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      align: 'right' as const,
      width: 170,
      render: (val: number) => <strong className="tabular-nums text-amber-700">{money(val)}</strong>,
    },
    {
      title: '% Hoàn thành',
      key: 'completionRate',
      width: 160,
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <div className="flex items-center gap-2">
          <Progress percent={row.completionRate} size="small" showInfo={false} strokeColor="#0F3D2E" />
          <span className="w-10 tabular-nums text-xs font-semibold">{row.completionRate}%</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_: unknown, row: OperatorSalesSummaryItem) => (
        <Tag color={row.completionRate >= 80 ? 'success' : row.completionRate >= 50 ? 'processing' : 'warning'}>
          {row.completionRate >= 80 ? 'Xuất sắc' : row.completionRate >= 50 ? 'Đạt yêu cầu' : 'Cần hỗ trợ'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="ceo-toolbar grid-cols-1 md:grid-cols-[280px_280px_1fr_auto]">
        <DatePicker picker="month" value={period} onChange={(value) => value && setDateString(value.format('YYYY-MM-DD'))} format="MM/YYYY" allowClear={false} aria-label="Tháng KPI" />
        <Select value="ALL" options={[{ label: 'Tất cả phòng ban Sales', value: 'ALL' }]} disabled aria-label="Phòng ban" />

        <div className="hidden md:block" />
        <Button icon={<DownloadOutlined />} onClick={() => refetch()}>Làm mới dữ liệu</Button>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <Metric label="Tổng nhân sự Sales" value={totalSales} hint="Nhân sự kinh doanh" icon={<TeamOutlined />} loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <Metric label="Tổng Doanh thu Sales" value={compact(totalRevenue)} hint="Dự toán đã phê duyệt" icon={<RiseOutlined />} tone="gold" loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <Metric label="Đạt KPI (>=80%)" value={highPerformers} hint="Tỷ lệ duyệt hồ sơ cao" icon={<TrophyOutlined />} tone="green" loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={5}>
          <Metric label="Cần hỗ trợ (<50%)" value={needSupport} hint="Hồ sơ tồn đọng chưa duyệt" icon={<QuestionCircleOutlined />} tone="gold" loading={isLoading} />
        </Col>
        <Col xs={24} sm={12} lg={8} xl={4}>
          <Metric label="Top Performer" value={topSales[0]?.salesUserName || '-'} hint="Sales dẫn đầu doanh thu" icon={<StarOutlined />} tone="purple" loading={isLoading} />
        </Col>
      </Row>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          className="ceo-card"
          title="Bảng xếp hạng hiệu suất Sales"
          extra={<Text className="text-xs text-[var(--ceo-text-muted)]">Tháng {period.format('MM/YYYY')}</Text>}
        >
          <Table
            rowKey="salesUserId"
            dataSource={salesList}
            loading={isLoading}
            className="ceo-table"
            scroll={{ x: 980 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            columns={columns}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu hiệu suất Sales" /> }}
          />
        </Card>

        <div className="space-y-4">
          <Card className="ceo-card" title="Top 5 Sales dẫn đầu">
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : topSales.length ? (
              <div className="space-y-3">
                {topSales.map((sales, index) => (
                  <div key={sales.salesUserId} className="flex items-center justify-between rounded-lg border border-slate-100 p-2.5 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-400 text-amber-950' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {index + 1}
                      </span>
                      <div>
                        <strong className="block text-sm text-slate-800">{sales.salesUserName}</strong>
                        <span className="text-xs text-slate-400">{sales.totalDossiers} hồ sơ ({sales.approvedDossiers} đã duyệt)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <strong className="block text-sm text-[#0F3D2E]">{compact(sales.totalRevenue)}</strong>
                      <span className="text-xs text-emerald-600 font-semibold">{sales.completionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu Top Sales" />
            )}
          </Card>

          <Card className="ceo-card" title="Khuyến nghị & Hành động">
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2 rounded bg-emerald-50 p-2.5 text-emerald-800 border border-emerald-100">
                <CheckCircleOutlined className="mt-0.5" />
                <div>
                  <strong>Duy trì đà tăng trưởng:</strong> {highPerformers} nhân sự đạt tỷ lệ duyệt trên 80%. Đề xuất biểu dương trong kỳ họp tổng kết tháng.
                </div>
              </div>
              {needSupport > 0 && (
                <div className="flex items-start gap-2 rounded bg-amber-50 p-2.5 text-amber-800 border border-amber-100">
                  <QuestionCircleOutlined className="mt-0.5" />
                  <div>
                    <strong>Cần can thiệp hỗ trợ:</strong> Có {needSupport} nhân sự có tỷ lệ hoàn tất dưới 50%. Cần Operator hỗ trợ tháo gỡ vướng mắc báo giá nhà cung cấp.
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function KpiPage() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <Title level={3} style={{ marginBottom: 2, color: '#0F172A' }}>
            Bảng điều khiển KPI (KPI Dashboard)
          </Title>
          <Text type="secondary" className="text-sm">
            Theo dõi, phân tích tiến độ hoàn thành mục tiêu KPI của cá nhân và phòng ban.
          </Text>
        </div>
      </div>

      <Tabs 
        defaultActiveKey="1" 
        items={[
          {
            key: '1',
            label: 'Bảng điều khiển KPI',
            children: <KpiDashboard />
          },
          {
            key: '2',
            label: 'Xếp hạng hiệu suất Sales',
            children: <SalesPerformance />
          }
        ]} 
      />
    </div>
  );
}
