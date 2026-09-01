'use client';

import React, { useState } from 'react';
import { Button, Card, DatePicker, Empty, Select, Table, Typography } from 'antd';
import { BarChartOutlined, CustomerServiceOutlined, EyeOutlined, FileExcelOutlined, FilePdfOutlined, TeamOutlined, WalletOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { dashboardsService } from '@/services/dashboards.service';
import { queryKeys } from '@/lib/query-keys';

const { RangePicker } = DatePicker;
const { Text } = Typography;

function money(value?: number) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
}

const reportTypes = [
  { key: 'REVENUE', label: 'Doanh thu tháng', description: 'Tổng doanh thu theo thời gian', icon: <BarChartOutlined /> },
  { key: 'PROFIT', label: 'Lợi nhuận theo hồ sơ', description: 'Lợi nhuận theo hồ sơ và trạng thái', icon: <WalletOutlined /> },
  { key: 'KPI', label: 'KPI Sales', description: 'Hiệu suất và KPI đội ngũ', icon: <TeamOutlined /> },
  { key: 'RECEIVABLE', label: 'Công nợ', description: 'Phải thu, phải trả và công nợ', icon: <WalletOutlined /> },
  { key: 'CUSTOMER', label: 'Khách hàng', description: 'Theo nguồn, khu vực và tần suất', icon: <CustomerServiceOutlined /> },
  { key: 'SUPPLIER', label: 'Nhà cung cấp', description: 'Theo hiệu suất và công nợ', icon: <CustomerServiceOutlined /> },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('REVENUE');
  const [dates, setDates] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const dashboard = useQuery({
    queryKey: queryKeys.reports.dashboard({ reportType, date: dates[0].format('YYYY-MM-DD') }),
    queryFn: () => dashboardsService.getCeoDashboard({ periodType: 'MONTHLY', date: dates[0].format('YYYY-MM-DD') }),
  });


  const preview = dashboard.data?.costBreakdown?.map((item, index) => ({
    key: `${item.categoryName}-${index}`,
    category: item.categoryName,
    cost: item.amount,
  })) || [];
  const totalCost = preview.reduce((sum, item) => sum + item.cost, 0);

  return <div className="space-y-4">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {reportTypes.map((type) => <button key={type.key} type="button" onClick={() => setReportType(type.key)} className={`cursor-pointer rounded-lg border bg-white p-4 text-left transition-colors ${reportType === type.key ? 'border-[var(--ceo-primary-700)] ring-2 ring-[rgb(11_107_79_/_0.08)]' : 'border-[var(--ceo-border)] hover:border-[var(--ceo-primary-700)]'}`}>
        <span className="ceo-metric-icon mb-3 bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]">{type.icon}</span><span className="block text-sm font-bold">{type.label}</span><span className="mt-1 block text-xs leading-5 text-[var(--ceo-text-muted)]">{type.description}</span>
      </button>)}
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-4">
        <Card className="ceo-card" title="Bộ lọc báo cáo">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2"><span className="block text-xs font-semibold">Loại báo cáo</span><Select className="w-full" value={reportType} onChange={setReportType} options={reportTypes.map((type) => ({ label: type.label, value: type.key }))} /></label>
            <label className="space-y-2"><span className="block text-xs font-semibold">Khoảng thời gian</span><RangePicker className="w-full" value={dates} onChange={(value) => value?.[0] && value?.[1] && setDates([value[0], value[1]])} format="DD/MM/YYYY" allowClear={false} /></label>
            <label className="space-y-2"><span className="block text-xs font-semibold">Định dạng xuất</span><Select className="w-full" value="XLSX" options={[{ label: 'Excel (.xlsx)', value: 'XLSX' }, { label: 'PDF (.pdf)', value: 'PDF' }]} /></label>
            <label className="space-y-2"><span className="block text-xs font-semibold">Sales</span><Select className="w-full" value="ALL" disabled options={[{ label: 'Tất cả', value: 'ALL' }]} /></label>
            <label className="space-y-2"><span className="block text-xs font-semibold">Mảng / Dịch vụ</span><Select className="w-full" value="ALL" disabled options={[{ label: 'Tất cả', value: 'ALL' }]} /></label>
            <label className="space-y-2"><span className="block text-xs font-semibold">Trạng thái hồ sơ</span><Select className="w-full" value="ALL" disabled options={[{ label: 'Tất cả', value: 'ALL' }]} /></label>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><Button icon={<EyeOutlined />} className="skylux-primary-button" onClick={() => dashboard.refetch()}>Xem trước</Button><Button icon={<FileExcelOutlined />} disabled title="Backend báo cáo chưa hoàn thiện">Xuất Excel</Button><Button icon={<FilePdfOutlined />} disabled title="Backend báo cáo chưa hoàn thiện">Xuất PDF</Button></div>
        </Card>

        <Card className="ceo-card" title={`Xem trước: ${reportTypes.find((type) => type.key === reportType)?.label}`} extra={<Text className="text-xs text-[var(--ceo-text-muted)]">{dates[0].format('DD/MM/YYYY')} - {dates[1].format('DD/MM/YYYY')}</Text>}>
          {reportType === 'REVENUE' || reportType === 'PROFIT' ? <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-md bg-[var(--ceo-primary-soft)] p-3"><Text type="secondary">Tổng doanh thu</Text><div className="mt-1 text-lg font-bold text-[var(--ceo-primary-900)]">{money(dashboard.data?.totalRevenue)}</div></div><div className="rounded-md bg-[var(--ceo-gold-soft)] p-3"><Text type="secondary">Tổng chi phí</Text><div className="mt-1 text-lg font-bold">{money(totalCost)}</div></div><div className="rounded-md bg-[var(--ceo-primary-soft)] p-3"><Text type="secondary">Tổng lợi nhuận</Text><div className="mt-1 text-lg font-bold text-[var(--ceo-primary-600)]">{money(dashboard.data?.totalProfit)}</div></div></div>
            <Table rowKey="key" dataSource={preview} loading={dashboard.isLoading} pagination={false} className="ceo-table" columns={[{ title: 'STT', width: 60, render: (_: unknown, __: unknown, index: number) => index + 1 }, { title: 'Mảng / Dịch vụ', dataIndex: 'category' }, { title: 'Chi phí (VND)', dataIndex: 'cost', align: 'right', render: money }, { title: 'Tỷ trọng', align: 'right', render: (_: unknown, item: typeof preview[number]) => `${totalCost ? ((item.cost / totalCost) * 100).toFixed(1) : '0.0'}%` }]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu báo cáo từ API" /> }} />
          </> : <div className="ceo-empty-panel"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loại báo cáo này chưa có API dữ liệu. Bố cục đã sẵn sàng để tích hợp." /></div>}
        </Card>
      </div>

      <aside className="space-y-4"><Card className="ceo-card" title="Báo cáo đã lưu gần đây"><div className="ceo-empty-panel min-h-[240px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Backend báo cáo hiện chưa trả danh sách đã lưu" /></div></Card><Card className="ceo-card" title="Lịch xuất báo cáo định kỳ"><div className="ceo-empty-panel min-h-[240px]"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API lịch xuất định kỳ" /></div><Button block className="mt-3 skylux-primary-button" disabled>Tạo lịch xuất mới</Button></Card></aside>
    </div>
  </div>;
}
