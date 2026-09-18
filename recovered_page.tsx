Created At: 2026-09-18T23:52:56+07:00
Completed At: 2026-09-18T23:52:56+07:00
File Path: `file:///Users/macbookair/Documents/Sky-Lux-CRM/frontend/app/main/revenue/page.tsx`
Total Lines: 149
Total Bytes: 11096
Showing lines 1 to 149
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: 'use client';
2: 
3: import React from 'react';
4: import { Button, Card, Col, DatePicker, Empty, Row, Select, Skeleton, Table, Typography } from 'antd';
5: 
6: import { DownloadOutlined, FileExcelOutlined, LineChartOutlined, PercentageOutlined, WalletOutlined } from '@ant-design/icons';
7: import { useQuery } from '@tanstack/react-query';
8: import dayjs from 'dayjs';
9: import {
10:   ArcElement, BarElement, CategoryScale, Chart as ChartJS, ChartOptions, Legend, LineElement, LinearScale, PointElement, Tooltip,
11: } from 'chart.js';
12: import { Bar, Doughnut, Line } from 'react-chartjs-2';
13: import { dashboardsService } from '@/services/dashboards.service';
14: import { useAuthStore } from '@/lib/stores/auth-store';
15: import { useFilterStore } from '@/lib/stores/filter-store';
16: import OperatorRevenue from '@/components/operator/OperatorRevenue';
17: import { queryKeys } from '@/lib/query-keys';
18: 
19: ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LineElement, LinearScale, PointElement, Tooltip);
20: const { Text } = Typography;
21: 
22: function money(value?: number | null) {
23:   return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
24: }
25: 
26: function compact(value?: number | null) {
27:   const number = value || 0;
28:   if (Math.abs(number) >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} tỷ`;
29:   if (Math.abs(number) >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} triệu`;
30:   return new Intl.NumberFormat('vi-VN').format(number);
31: }
32: 
33: function Metric({ label, value, icon, hint, loading }: { label: string; value: React.ReactNode; icon: React.ReactNode; hint: string; loading?: boolean }) {
34:   return <Card className="ceo-card ceo-metric-card h-full"><div className="flex items-start gap-3"><span className="ceo-metric-icon bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]">{icon}</span><div className="min-w-0"><Text className="text-xs text-[var(--ceo-text-muted)]">{label}</Text><div className="mt-1 truncate text-[21px] font-bold [font-variant-numeric:tabular-nums]">{loading ? <Skeleton.Input active size="small" /> : value}</div><div className="mt-2 truncate text-xs text-[var(--ceo-primary-600)]">{hint}</div></div></div></Card>;
35: }
36: 
37: function CeoRevenuePage() {
38:   const dateString = useFilterStore((state) => state.dateString);
39:   const setDateString = useFilterStore((state) => state.setDateString);
40:   const anchorDate = dayjs(dateString);
41:   const year = anchorDate.year();
42: 
43: 
44:   const currentMonth = useQuery({
45:     queryKey: queryKeys.dashboards.ceo({ periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') }),
46:     queryFn: ({ signal }) =>
47:       dashboardsService.getCeoDashboard(
48:         { periodType: 'MONTHLY', date: anchorDate.format('YYYY-MM-DD') },
49:         { signal },
50:       ),
51:   });
52:   const currentQuarter = useQuery({
53:     queryKey: queryKeys.dashboards.ceo({ periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') }),
54:     queryFn: ({ signal }) =>
55:       dashboardsService.getCeoDashboard(
56:         { periodType: 'QUARTERLY', date: anchorDate.format('YYYY-MM-DD') },
57:         { signal },
58:       ),
59:   });
60:   const currentYear = useQuery({
61:     queryKey: queryKeys.dashboards.ceo({ periodType: 'YEARLY', date: `${year}-01-01` }),
62:     queryFn: ({ signal }) =>
63:       dashboardsService.getCeoDashboard(
64:         { periodType: 'YEARLY', date: `${year}-01-01` },
65:         { signal },
66:       ),
67:   });
68:   const monthlyTrendQuery = useQuery({
69:     queryKey: queryKeys.dashboards.ceoMonthlyTrend(year),
70:     queryFn: ({ signal }) => dashboardsService.getCeoMonthlyTrend(year, { signal }),
71:   });
72: 
73:   const monthlyTrend = monthlyTrendQuery.data || [];
74:   const monthData = currentMonth.data;
75:   const quarterData = currentQuarter.data;
76:   const yearData = currentYear.data;
77:   const monthCost = (monthData?.totalRevenue || 0) - (monthData?.totalProfit || 0);
78:   const margin = monthData?.totalRevenue ? ((monthData.totalProfit / monthData.totalRevenue) * 100).toFixed(1) : '0.0';
79:   const isLoading = currentMonth.isLoading || currentQuarter.isLoading || currentYear.isLoading || monthlyTrendQuery.isLoading;
80: 
81:   const trendData = {
82:     labels: monthlyTrend.map((item) => item.label),
83:     datasets: [
84:       { label: 'Doanh thu', data: monthlyTrend.map((item) => item.totalRevenue), borderColor: '#0F3D2E', backgroundColor: '#0F3D2E', tension: 0.35, pointRadius: 3 },
85:       { label: 'Lợi nhuận', data: monthlyTrend.map((item) => item.totalProfit), borderColor: '#D4AF37', backgroundColor: '#D4AF37', tension: 0.35, pointRadius: 3 },
86:     ],
87:   };
88:   const baseOptions: ChartOptions<'line'> = { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { align: 'start', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.parsed.y)}` } } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#EEF1EF' }, ticks: { callback: (value) => compact(Number(value)) } } } };
89: 
90: 
91:   const vip = yearData?.vipCustomers || [];
92:   const vipData = { labels: vip.map((item) => item.customerName), datasets: [{ label: 'Doanh thu', data: vip.map((item) => item.spend), backgroundColor: '#0F3D2E', borderRadius: 3, barThickness: 24 }] };
93:   const barOptions: ChartOptions<'bar'> = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => money(context.parsed.x) } } }, scales: { x: { beginAtZero: true, border: { display: false }, grid: { color: '#EEF1EF' }, ticks: { callback: (value) => compact(Number(value)) } }, y: { grid: { display: false }, border: { display: false } } } };
94: 
95:   const cost = yearData?.costBreakdown || [];
96:   const costData = { labels: cost.map((item) => item.categoryName), datasets: [{ data: cost.map((item) => item.amount), backgroundColor: ['#0F3D2E', '#36785F', '#D4AF37', '#5B80C6', '#7C59C8', '#14A9B5'], borderColor: '#fff', borderWidth: 3 }] };
97:   const donutOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false, cutout: '64%', plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (context) => `${context.label}: ${money(context.parsed)}` } } } };
98: 
99:   const summaryRows = [
100:     { key: 'month', period: `Tháng ${anchorDate.format('MM/YYYY')}`, revenue: monthData?.totalRevenue || 0, profit: monthData?.totalProfit || 0 },
101:     { key: 'quarter', period: `Quý ${Math.floor(anchorDate.month() / 3) + 1}/${year}`, revenue: quarterData?.totalRevenue || 0, profit: quarterData?.totalProfit || 0 },
102:     { key: 'year', period: `Năm ${year}`, revenue: yearData?.totalRevenue || 0, profit: yearData?.totalProfit || 0 },
103:   ];
104: 
105:   return <div className="space-y-4">
106:     <div className="ceo-toolbar grid-cols-1 md:grid-cols-[220px_220px_1fr_auto_auto]">
107:       <DatePicker picker="month" value={anchorDate} onChange={(value) => value && setDateString(value.format('YYYY-MM-DD'))} format="MM/YYYY" allowClear={false} aria-label="Kỳ báo cáo" />
108:       <Select value="ALL" options={[{ label: 'Tất cả mảng', value: 'ALL' }]} disabled aria-label="Mảng kinh doanh" />
109: 
110:       <div className="hidden md:block" />
111:       <Button icon={<DownloadOutlined />} disabled title="Chưa có API xuất PDF">Xuất PDF</Button>
112:       <Button icon={<FileExcelOutlined />} className="skylux-primary-button" disabled title="Chưa có API xuất Excel">Xuất Excel</Button>
113:     </div>
114: 
115:     <Row gutter={[12, 12]}>
116:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Doanh thu tháng" value={money(monthData?.totalRevenue)} icon={<LineChartOutlined />} hint="Dự toán đã duyệt" loading={isLoading} /></Col>
117:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Doanh thu quý" value={money(quarterData?.totalRevenue)} icon={<LineChartOutlined />} hint="Tổng quý hiện tại" loading={isLoading} /></Col>
118:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Chi phí tháng" value={money(monthCost)} icon={<WalletOutlined />} hint="Doanh thu trừ lợi nhuận" loading={isLoading} /></Col>
119:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Lợi nhuận tháng" value={money(monthData?.totalProfit)} icon={<LineChartOutlined />} hint="Dữ liệu được phê duyệt" loading={isLoading} /></Col>
120:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Tỷ suất lợi nhuận" value={`${margin}%`} icon={<PercentageOutlined />} hint="Theo doanh thu tháng" loading={isLoading} /></Col>
121:       <Col xs={24} sm={12} lg={8} xl={4}><Metric label="Công nợ phải thu" value="-" icon={<WalletOutlined />} hint="Chưa có API công nợ" loading={false} /></Col>
122:     </Row>
123: 
124:     <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.35fr_.9fr_.9fr]">
125:       <Card className="ceo-card" title="Doanh thu & lợi nhuận theo tháng"><div className="h-[300px]">{monthlyTrendQuery.isLoading ? <Skeleton active /> : <Line data={trendData} options={baseOptions} />}</div></Card>
126:       <Card className="ceo-card" title="Top khách hàng theo doanh thu"><div className="h-[300px]">{vip.length ? <Bar data={vipData} options={barOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu khách hàng" />}</div></Card>
127: 
128:       <Card className="ceo-card" title="Cơ cấu chi phí theo mảng"><div className="h-[300px]">{cost.length ? <Doughnut data={costData} options={donutOptions} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu chi phí" />}</div></Card>
129:     </div>
130: 
131:     <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
132:       <Card className="ceo-card" title="Tổng hợp theo kỳ báo cáo"><Table rowKey="key" dataSource={summaryRows} loading={isLoading} pagination={false} className="ceo-table" columns={[
133:         { title: 'Kỳ báo cáo', dataIndex: 'period' },
134:         { title: 'Doanh thu', dataIndex: 'revenue', align: 'right', render: money },
135:         { title: 'Chi phí', align: 'right', render: (_: unknown, item: typeof summaryRows[number]) => money(item.revenue - item.profit) },
136:         { title: 'Lợi nhuận', dataIndex: 'profit', align: 'right', render: (value: number) => <Text strong style={{ color: value >= 0 ? '#0A8A61' : '#DC3F46' }}>{money(value)}</Text> },
137:         { title: 'Biên lợi nhuận', align: 'right', render: (_: unknown, item: typeof summaryRows[number]) => `${item.revenue ? ((item.profit / item.revenue) * 100).toFixed(1) : '0.0'}%` },
138:       ]} /></Card>
139:       <Card className="ceo-card" title="Báo cáo nhanh"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API danh sách báo cáo nhanh" /><Button block href="/main/reports" className="skylux-outline-button">Mở trung tâm báo cáo</Button></Card>
140:     </div>
141:   </div>;
142: }
143: 
144: export default function RevenuePage() {
145:   const hasRole = useAuthStore((state) => state.hasRole);
146:   return hasRole('OPERATOR') ? <OperatorRevenue /> : <CeoRevenuePage />;
147: }
148: 
149: 
The above content shows the entire, complete file contents of the requested file.
