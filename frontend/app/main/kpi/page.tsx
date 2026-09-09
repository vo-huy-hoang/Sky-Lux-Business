'use client';

import React from 'react';
import { Typography } from 'antd';
import KpiDashboard from './components/KpiDashboard';

const { Title, Text } = Typography;

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

      <KpiDashboard />
    </div>
  );
}
