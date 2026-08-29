'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Empty, Row, Select, Skeleton, Table, Typography } from 'antd';
import { DownloadOutlined, QuestionCircleOutlined, RiseOutlined, StarOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { usersService } from '@/services/users.service';
import { UserItem } from '@/types/user';

const { Text } = Typography;

function Metric({ label, value, hint, icon, tone = 'green', loading }: { label: string; value: React.ReactNode; hint: string; icon: React.ReactNode; tone?: 'green' | 'gold' | 'purple'; loading?: boolean }) {
  const color = tone === 'gold' ? 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]' : tone === 'purple' ? 'bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]' : 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]';
  return <Card className="ceo-card ceo-metric-card h-full"><div className="flex items-center gap-4"><span className={`ceo-metric-icon ${color}`}>{icon}</span><div className="min-w-0"><Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text><div className="mt-1 text-[25px] font-bold leading-8">{loading ? <Skeleton.Input active size="small" /> : value}</div><div className="mt-1 truncate text-xs text-[var(--ceo-text-muted)]">{hint}</div></div></div></Card>;
}

export default function KpiPage() {
  const [period, setPeriod] = useState(dayjs());
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ceo-kpi-users'],
    queryFn: () => usersService.getUsers({ page: 1, pageSize: 100 }),
  });
  const sales = useMemo(() => {
    const users: UserItem[] = Array.isArray(data) ? data : data?.data || [];
    return users.filter((user) => user.roles?.some((role) => role.code === 'SALES'));
  }, [data]);
  const activeSales = sales.filter((user) => user.status === 'ACTIVE').length;

  return <div className="space-y-4">
    <div className="ceo-toolbar grid-cols-1 md:grid-cols-[280px_280px_1fr_auto]">
      <DatePicker picker="month" value={period} onChange={(value) => value && setPeriod(value)} format="MM/YYYY" allowClear={false} aria-label="Tháng KPI" />
      <Select value="ALL" options={[{ label: 'Tất cả phòng ban', value: 'ALL' }]} disabled aria-label="Phòng ban" />
      <div className="hidden md:block" />
      <Button icon={<DownloadOutlined />} onClick={() => refetch()}>Làm mới dữ liệu</Button>
    </div>

    <Row gutter={[12, 12]}>
      <Col xs={24} sm={12} lg={8} xl={5}><Metric label="Tổng nhân sự Sales" value={sales.length} hint="Từ API người dùng" icon={<TeamOutlined />} loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={5}><Metric label="Sales đang hoạt động" value={activeSales} hint="Tài khoản trạng thái hoạt động" icon={<RiseOutlined />} loading={isLoading} /></Col>
      <Col xs={24} sm={12} lg={8} xl={5}><Metric label="Đạt KPI" value="-" hint="Chưa có API KPI toàn đội" icon={<TrophyOutlined />} loading={false} /></Col>
      <Col xs={24} sm={12} lg={8} xl={5}><Metric label="Cần hỗ trợ" value="-" hint="Chưa có API KPI toàn đội" icon={<QuestionCircleOutlined />} tone="gold" loading={false} /></Col>
      <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Vượt KPI" value="-" hint="Chưa có API KPI toàn đội" icon={<StarOutlined />} tone="purple" loading={false} /></Col>
    </Row>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="ceo-card" title="Bảng xếp hạng hiệu suất Sales" extra={<Text className="text-xs text-[var(--ceo-text-muted)]">Tháng {period.format('MM/YYYY')}</Text>}>
        <Table rowKey="id" dataSource={[]} loading={false} className="ceo-table" scroll={{ x: 980 }} pagination={false} columns={[
          { title: '#', width: 50 }, { title: 'Nhân viên', width: 220 }, { title: 'KPI mục tiêu', width: 150, align: 'right' }, { title: 'Doanh thu thực tế', width: 160, align: 'right' }, { title: '% hoàn thành', width: 140 }, { title: 'Số hồ sơ', width: 100, align: 'right' }, { title: 'Tỷ lệ chốt', width: 110, align: 'right' }, { title: 'Trạng thái', width: 120 },
        ]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Backend hiện chỉ có API KPI cá nhân. Bảng KPI toàn đội đã sẵn sàng để nối API." /> }} />
      </Card>
      <div className="space-y-4">
        <Card className="ceo-card" title="Top 5 Sales tháng này"><div className="ceo-empty-panel min-h-[190px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API xếp hạng Sales" /></div></Card>
        <Card className="ceo-card" title="Gợi ý hành động"><div className="ceo-empty-panel min-h-[190px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API khuyến nghị KPI" /></div></Card>
      </div>
    </div>
  </div>;
}
