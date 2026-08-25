'use client';

import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Button,
  Table,
  Tag,
  Space,
} from 'antd';
import {
  FolderOpenOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  FileExcelOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/lib/stores/auth-store';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user } = useAuthStore();

  const sampleDossiers = [
    {
      key: '1',
      code: 'DOS-2026-001',
      name: 'Tour Khám Phá Bắc Âu 10N9Đ - Đoàn Doanh Nghiệp',
      customer: 'Tập đoàn ABC',
      sales: 'Nguyễn Văn A',
      status: 'APPROVED',
      grossRevenue: '1,450,000,000 ₫',
      startDate: '15/09/2026',
    },
    {
      key: '2',
      code: 'DOS-2026-002',
      name: 'Hội nghị MICE Đà Nẵng - Hội Thảo Y Dược',
      customer: 'Công ty Dược Phẩm XYZ',
      sales: 'Trần Thị B',
      status: 'IN_REVIEW',
      grossRevenue: '680,000,000 ₫',
      startDate: '20/10/2026',
    },
    {
      key: '3',
      code: 'DOS-2026-003',
      name: 'Tour Nhật Bản Mùa Thu - Cung Đường Vàng',
      customer: 'Khách lẻ VIP Group',
      sales: 'Lê Văn C',
      status: 'DRAFT',
      grossRevenue: '320,000,000 ₫',
      startDate: '05/11/2026',
    },
  ];

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <span className="font-semibold text-blue-600 cursor-pointer hover:underline">
          {code}
        </span>
      ),
    },
    {
      title: 'Tên hồ sơ / Tour',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Phụ trách',
      dataIndex: 'sales',
      key: 'sales',
    },
    {
      title: 'Doanh thu dự kiến',
      dataIndex: 'grossRevenue',
      key: 'grossRevenue',
      render: (rev: string) => <span className="font-semibold text-slate-800">{rev}</span>,
    },
    {
      title: 'Khởi hành',
      dataIndex: 'startDate',
      key: 'startDate',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = {
          APPROVED: 'green',
          IN_REVIEW: 'gold',
          DRAFT: 'default',
        };
        const labels: Record<string, string> = {
          APPROVED: 'Đã duyệt',
          IN_REVIEW: 'Đang xem xét',
          DRAFT: 'Bản nháp',
        };
        return <Tag color={colors[status] || 'blue'}>{labels[status] || status}</Tag>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <Title level={3} style={{ marginBottom: 2, color: '#0F172A' }}>
            Xin chào, {user?.fullName || 'Quản trị viên'} 👋
          </Title>
          <Text type="secondary" className="text-sm">
            Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Dưới đây là tổng quan tình hình kinh doanh.
          </Text>
        </div>

        <Space>
          <Link href="/main/imports">
            <Button icon={<FileExcelOutlined />}>Import Excel</Button>
          </Link>
          <Link href="/main/dossiers">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-[#0A2540] hover:bg-[#133E68] border-none"
            >
              Tạo hồ sơ tour mới
            </Button>
          </Link>
        </Space>
      </div>

      {/* KPI Metric Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200">
            <Statistic
              title={<span className="text-slate-500 font-medium">Doanh thu tháng này</span>}
              value="2.45 tỷ ₫"
              prefix={<DollarOutlined className="text-emerald-500 mr-2" />}
              valueStyle={{ color: '#0F172A', fontWeight: 700 }}
              suffix={
                <span className="text-xs text-emerald-600 font-normal flex items-center ml-2">
                  <ArrowUpOutlined /> +18.4%
                </span>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200">
            <Statistic
              title={<span className="text-slate-500 font-medium">Tổng hồ sơ tour đang chạy</span>}
              value={24}
              prefix={<FolderOpenOutlined className="text-blue-500 mr-2" />}
              valueStyle={{ color: '#0F172A', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200">
            <Statistic
              title={<span className="text-slate-500 font-medium">Dự toán chờ phê duyệt</span>}
              value={5}
              prefix={<ClockCircleOutlined className="text-amber-500 mr-2" />}
              valueStyle={{ color: '#FAAD14', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200">
            <Statistic
              title={<span className="text-slate-500 font-medium">Công việc hoàn thành</span>}
              value="92%"
              prefix={<CheckCircleOutlined className="text-indigo-500 mr-2" />}
              valueStyle={{ color: '#0F172A', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent Dossiers Table Card */}
      <Card
        title={
          <div className="flex justify-between items-center py-1">
            <span className="font-bold text-slate-800 text-base">
              Hồ sơ tour & Dự toán mới nhất
            </span>
            <Link href="/main/dossiers">
              <Button type="link" size="small" className="text-blue-600 font-medium">
                Xem tất cả &rarr;
              </Button>
            </Link>
          </div>
        }
        className="shadow-xs border-slate-200"
      >
        <Table
          dataSource={sampleDossiers}
          columns={columns}
          pagination={false}
          className="border border-slate-100 rounded-lg overflow-hidden"
        />
      </Card>
    </div>
  );
}
