'use client';

import React, { useState } from 'react';
import { Card, Tabs, Table, Button, Tag, Space, Progress, Typography, DatePicker } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { useKpis } from '@/hooks/use-kpis';
import { KpiMetric, KpiPeriodType, KpiResultData, KpiTarget } from '@/types/kpi';
import { useAuthStore } from '@/lib/stores/auth-store';
import KpiTargetModal from '@/app/main/kpi/components/KpiTargetModal';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export default function KpiDashboard() {
  const [activeTab, setActiveTab] = useState('me');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState<KpiTarget | null>(null);
  const [selectedPeriod] = useState<KpiPeriodType>(KpiPeriodType.MONTHLY);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(dayjs());
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission('kpi.manage');
  const canViewTeam = hasPermission('kpi.view.team') || hasPermission('kpi.view.all');

  const { useKpiMe, useAllKpis, useSalesKpis } = useKpis();

  // Parse filters
  const periodStart = selectedDate?.startOf('month').format('YYYY-MM-DD');
  const periodEnd = selectedDate?.endOf('month').format('YYYY-MM-DD');

  const { data: myKpisResp, isLoading: isLoadingMe, refetch: refetchMe } = useKpiMe({
    periodType: selectedPeriod,
    periodStart,
    periodEnd,
  }, activeTab === 'me');

  const { data: allKpisResp, isLoading: isLoadingAll, refetch: refetchAll } = useAllKpis({
    periodType: selectedPeriod,
    periodStart,
    periodEnd,
  }, activeTab === 'all');

  const { data: salesKpisResp, isLoading: isLoadingSales, refetch: refetchSales } = useSalesKpis({
    periodType: selectedPeriod,
    periodStart,
    periodEnd,
  }, activeTab === 'sales');

  const myKpis: KpiResultData[] = myKpisResp?.data || [];
  const allKpis: KpiResultData[] = allKpisResp?.data || [];
  const salesKpis: KpiResultData[] = salesKpisResp?.data || [];

  const handleRefresh = () => {
    if (activeTab === 'me') {
      refetchMe();
    } else if (activeTab === 'all') {
      refetchAll();
    } else {
      refetchSales();
    }
  };

  const renderMetricLabel = (metric: KpiMetric) => {
    switch (metric) {
      case KpiMetric.REVENUE: return 'Doanh thu';
      case KpiMetric.PROFIT: return 'Lợi nhuận';
      case KpiMetric.DOSSIER_COUNT: return 'Số lượng hồ sơ';
      case KpiMetric.CLOSE_RATE: return 'Tỉ lệ chốt';
      default: return metric;
    }
  };

  const renderValue = (metric: KpiMetric, value: number) => {
    if (metric === KpiMetric.REVENUE || metric === KpiMetric.PROFIT) {
      return `${value.toLocaleString('vi-VN')} đ`;
    }
    if (metric === KpiMetric.CLOSE_RATE) {
      return `${value}%`;
    }
    return value;
  };

  const columns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: KpiResultData) => (
        <span className="font-semibold text-slate-800">{record.target.user?.fullName || record.target.userId}</span>
      ),
    },
    {
      title: 'Loại KPI',
      dataIndex: ['target', 'metricCode'],
      key: 'metricCode',
      render: (metric: KpiMetric) => <Tag color="blue">{renderMetricLabel(metric)}</Tag>,
    },
    {
      title: 'Chỉ tiêu',
      key: 'targetValue',
      render: (_: any, record: KpiResultData) => (
        <span className="font-mono">{renderValue(record.target.metricCode, record.target.targetValue)}</span>
      ),
    },
    {
      title: 'Thực tế',
      key: 'actualValue',
      render: (_: any, record: KpiResultData) => (
        <span className="font-mono text-emerald-600 font-semibold">{renderValue(record.target.metricCode, record.actualValue)}</span>
      ),
    },
    {
      title: 'Tiến độ',
      key: 'achievementRate',
      render: (_: any, record: KpiResultData) => {
        let color = 'active';
        if (record.achievementRate >= 100) color = 'success';
        else if (record.achievementRate < 50) color = 'exception';

        return (
          <Progress 
            percent={record.achievementRate} 
            status={color as any} 
            size="small" 
            format={(percent) => `${percent}%`}
          />
        );
      },
    },
    ...(canManage ? [{
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: KpiResultData) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingTarget(record.target);
            setIsModalVisible(true);
          }}
        >
          Sửa
        </Button>
      ),
    }] : []),
  ];

  return (
    <Card className="shadow-xs border-slate-200" styles={{ body: { padding: '20px 24px' } }}>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <DatePicker 
            picker="month" 
            value={selectedDate} 
            onChange={(date) => setSelectedDate(date)} 
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>Làm mới</Button>
        </Space>
        
        {canManage && (activeTab === 'all' || activeTab === 'sales') && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setEditingTarget(null);
              setIsModalVisible(true);
            }}
            className="bg-[#0A2540] hover:bg-[#133E68] border-none"
          >
            Giao KPI mới
          </Button>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'me',
            label: (
              <span className="font-semibold flex items-center gap-2">
                <UserOutlined /> KPI Cá nhân
              </span>
            ),
            children: (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {isLoadingMe ? (
                  <Text>Đang tải dữ liệu...</Text>
                ) : myKpis.length === 0 ? (
                  <Text type="secondary">Chưa có mục tiêu KPI nào trong kỳ này.</Text>
                ) : (
                  myKpis.map((kpi) => (
                    <Card key={kpi.target.id} className="bg-slate-50 border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <Text className="text-slate-500 font-medium">{renderMetricLabel(kpi.target.metricCode)}</Text>
                        <Tag color="cyan">{kpi.target.periodType}</Tag>
                      </div>
                      <Title level={3} className="text-emerald-600 m-0">
                        {renderValue(kpi.target.metricCode, kpi.actualValue)}
                      </Title>
                      <div className="text-sm text-slate-400 mt-1 mb-4">
                        Chỉ tiêu: {renderValue(kpi.target.metricCode, kpi.target.targetValue)}
                      </div>
                      <Progress 
                        percent={kpi.achievementRate} 
                        status={kpi.achievementRate >= 100 ? 'success' : kpi.achievementRate < 50 ? 'exception' : 'active'}
                        strokeWidth={10}
                      />
                    </Card>
                  ))
                )}
              </div>
            ),
          },
          ...(canViewTeam ? [{
            key: 'all',
            label: (
              <span className="font-semibold flex items-center gap-2">
                <TeamOutlined /> Quản lý KPI Nhân viên
              </span>
            ),
            children: (
              <Table
                dataSource={allKpis}
                columns={columns}
                rowKey={(record) => record.target.id}
                loading={isLoadingAll}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                className="mt-4 border border-slate-100 rounded-lg overflow-hidden"
              />
            ),
          }] : []),
          {
            key: 'sales',
            label: (
              <span className="font-semibold flex items-center gap-2">
                <TeamOutlined /> KPI Sales
              </span>
            ),
            children: (
              <Table
                dataSource={salesKpis}
                columns={columns}
                rowKey={(record) => record.target.id}
                loading={isLoadingSales}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                className="mt-4 border border-slate-100 rounded-lg overflow-hidden"
              />
            ),
          },
        ]}
      />

      <KpiTargetModal
        open={isModalVisible}
        editingTarget={editingTarget}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTarget(null);
        }}
      />
    </Card>
  );
}
