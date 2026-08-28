'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  FileExcelOutlined,
  FolderOpenOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { customersService } from '@/services/customers.service';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem } from '@/types/dossier';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const { Title, Text } = Typography;

const statusConfig: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: '#2F80ED' },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: '#7C5CCB' },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: '#F59E0B' },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: '#007A55' },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid', color: '#00543D' },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: '#D93737' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getStatus(status?: string) {
  return statusConfig[status || ''] || {
    label: status || 'Chưa rõ',
    className: 'skylux-status-info',
    color: '#6B7280',
  };
}

function buildDailyCounts(items: DossierItem[]) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date;
  });

  return days.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const count = items.filter((item) => item.createdAt?.slice(0, 10) === key).length;
    return {
      label: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      count,
    };
  });
}

export default function DashboardPage() {
  const {
    data: dossiersData,
    isLoading: isLoadingDossiers,
    isError: isDossierError,
  } = useQuery({
    queryKey: ['dashboard-dossiers'],
    queryFn: () => dossiersService.getDossiers({ page: 1, limit: 100 }),
  });

  const {
    data: customersData,
    isLoading: isLoadingCustomers,
    isError: isCustomerError,
  } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: () => customersService.getCustomers({ page: 1, limit: 100 }),
  });

  const dossiers = useMemo(() => dossiersData?.items || [], [dossiersData?.items]);
  const totalDossiers = dossiersData?.total || 0;
  const totalCustomers = customersData?.total || 0;
  const processingCount = dossiers.filter((item) =>
    ['SUBMITTED', 'IN_REVIEW', 'DRAFT'].includes(item.status),
  ).length;
  const completedCount = dossiers.filter((item) =>
    ['APPROVED', 'COMPLETED'].includes(item.status),
  ).length;
  const completionPercent = totalDossiers
    ? Math.round((completedCount / Math.max(dossiers.length, 1)) * 100)
    : 0;

  const dailyCounts = useMemo(() => buildDailyCounts(dossiers), [dossiers]);
  const statusCounts = useMemo(() => {
    return dossiers.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
  }, [dossiers]);

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y} hồ sơ`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#6B7280', font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#F0F0F0' },
        border: { display: false },
        ticks: { color: '#6B7280', precision: 0, font: { size: 12 } },
      },
    },
  };

  const barData = {
    labels: dailyCounts.map((item) => item.label),
    datasets: [
      {
        data: dailyCounts.map((item) => item.count),
        backgroundColor: '#007A55',
        borderRadius: 999,
        borderSkipped: false,
        barThickness: 18,
      },
    ],
  };

  const doughnutLabels = Object.keys(statusCounts);
  const doughnutData = {
    labels: doughnutLabels.map((status) => getStatus(status).label),
    datasets: [
      {
        data: doughnutLabels.map((status) => statusCounts[status]),
        backgroundColor: doughnutLabels.map((status) => getStatus(status).color),
        borderColor: '#FFFFFF',
        borderWidth: 4,
        hoverOffset: 4,
      },
    ],
  };

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: unknown, record: DossierItem) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.customer?.displayName || record.name}</Text>
          <Text type="secondary" className="text-xs">
            {record.route || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Ngày đi',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: formatDate,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        const config = getStatus(status);
        return <Tag className={config.className}>{config.label}</Tag>;
      },
    },
    {
      title: 'Sales',
      key: 'sales',
      width: 160,
      render: (_: unknown, record: DossierItem) => record.salesUser?.fullName || '-',
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: formatDate,
    },
  ];

  if (isDossierError || isCustomerError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải dữ liệu dashboard"
        description="Vui lòng kiểm tra kết nối API rồi tải lại trang."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Title level={1} className="skylux-page-title">
          Bảng điều khiển Sales
        </Title>
        <div className="skylux-subtitle mt-1">Tổng quan hoạt động kinh doanh của bạn</div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <FolderOpenOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Tổng hồ sơ</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingDossiers ? <Skeleton.Input active size="small" /> : totalDossiers}
                </div>
                <div className="mt-3 text-xs font-medium text-[var(--color-primary-600)]">
                  <ArrowUpOutlined /> Từ API hồ sơ
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
                <FileDoneOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Hồ sơ đang xử lý</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingDossiers ? <Skeleton.Input active size="small" /> : processingCount}
                </div>
                <div className="mt-3 text-xs font-medium text-[var(--color-primary-600)]">
                  Trạng thái mở
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <TeamOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-500">Khách hàng đang chăm sóc</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingCustomers ? <Skeleton.Input active size="small" /> : totalCustomers}
                </div>
                <div className="mt-3 text-xs font-medium text-[var(--color-primary-600)]">
                  Từ API khách hàng
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="skylux-card skylux-kpi">
            <div className="flex items-center gap-5">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
                <CheckCircleOutlined />
              </span>
              <div className="min-w-0 flex-1">
                <Text className="text-sm text-slate-500">% hồ sơ hoàn tất</Text>
                <div className="mt-1 text-[30px] font-bold leading-none text-[var(--color-primary-900)]">
                  {isLoadingDossiers ? <Skeleton.Input active size="small" /> : `${completionPercent}%`}
                </div>
                <Progress
                  percent={completionPercent}
                  showInfo={false}
                  strokeColor="#D6A51F"
                  railColor="#E8E8E8"
                  className="mt-3"
                />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card
            className="skylux-card h-full"
            title={<span className="font-bold text-slate-900">Hồ sơ tạo trong 14 ngày</span>}
          >
            <div className="h-[288px]">
              {isLoadingDossiers ? (
                <Skeleton active paragraph={{ rows: 8 }} />
              ) : dossiers.length ? (
                <Bar data={barData} options={barOptions} />
              ) : (
                <Empty description="Chưa có dữ liệu hồ sơ để hiển thị biểu đồ" />
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <Card
            className="skylux-card h-full"
            title={<span className="font-bold text-slate-900">Hồ sơ theo trạng thái</span>}
          >
            <div className="relative h-[260px]">
              {isLoadingDossiers ? (
                <Skeleton active paragraph={{ rows: 6 }} />
              ) : doughnutLabels.length ? (
                <>
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '66%',
                      plugins: { legend: { display: false } },
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">Tổng số</div>
                      <div className="text-3xl font-bold text-slate-900">{dossiers.length}</div>
                    </div>
                  </div>
                </>
              ) : (
                <Empty description="Chưa có dữ liệu trạng thái" />
              )}
            </div>
            <div className="mt-4 space-y-2">
              {doughnutLabels.map((status) => {
                const config = getStatus(status);
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: config.color }}
                      />
                      {config.label}
                    </span>
                    <span className="font-semibold text-slate-800">{statusCounts[status]}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={5}>
          <Card
            className="skylux-card h-full"
            title={<span className="font-bold text-slate-900">Việc cần làm hôm nay</span>}
          >
            <Empty
              description="Chưa có API công việc cho dashboard"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="skylux-card"
        title={<span className="font-bold text-slate-900">Hồ sơ gần đây</span>}
        extra={
          <Link href="/main/dossiers">
            <Button type="link" className="font-semibold text-[var(--color-primary-700)]">
              Xem tất cả hồ sơ <ArrowRightOutlined />
            </Button>
          </Link>
        }
      >
        <Table
          dataSource={dossiers.slice(0, 8)}
          columns={columns}
          rowKey="id"
          loading={isLoadingDossiers}
          pagination={false}
          className="skylux-table"
          scroll={{ x: 860 }}
        />
      </Card>

      <div className="flex justify-end">
        <Link href="/main/imports">
          <Button icon={<FileExcelOutlined />} className="skylux-outline-button">
            Import dự toán Excel
          </Button>
        </Link>
      </div>
    </div>
  );
}
