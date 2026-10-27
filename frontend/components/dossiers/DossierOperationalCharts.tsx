'use client';

import React, { useMemo } from 'react';
import { Card, Col, Empty, Skeleton } from 'antd';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { DossierItem } from '@/types/dossier';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { themeTokens } from '@/lib/theme/tokens.config';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const statusConfig: Record<string, { label: string; className: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', className: 'skylux-status-info', color: themeTokens.semantic.info.main },
  SUBMITTED: { label: 'Đã gửi', className: 'skylux-status-purple', color: themeTokens.semantic.purple.main },
  IN_REVIEW: { label: 'Đang xử lý', className: 'skylux-status-warning', color: themeTokens.semantic.warning.main },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', color: themeTokens.brand.primary[700] },
  COMPLETED: { label: 'Thành công', className: 'skylux-status-valid', color: themeTokens.brand.primary[800] },
  CANCELLED: { label: 'Đã hủy', className: 'skylux-status-danger', color: themeTokens.semantic.danger.main },
};

function getStatus(status?: string) {
  return statusConfig[status || ''] || {
    label: status || 'Chưa rõ',
    className: 'skylux-status-info',
    color: themeTokens.neutral.textMuted,
  };
}

function buildDailyCounts(items: DossierItem[]) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    return date;
  });

  return days.map((day) => {
    const key = day.toISOString().split('T')[0];
    const count = items.filter((item) => {
      if (!item.createdAt) return false;
      return item.createdAt.split('T')[0] === key;
    }).length;

    return {
      label: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }).format(day),
      count,
    };
  });
}

interface DossierOperationalChartsProps {
  dossiers: DossierItem[];
  isLoadingDossiers: boolean;
}

export default function DossierOperationalCharts({
  dossiers,
  isLoadingDossiers,
}: DossierOperationalChartsProps) {
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
          label: (context: any) => `${context.parsed.y} hồ sơ`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: themeTokens.neutral.textMuted, font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: themeTokens.neutral.divider },
        border: { display: false },
        ticks: { color: themeTokens.neutral.textMuted, precision: 0, font: { size: 12 } },
      },
    },
  };

  const barData = {
    labels: dailyCounts.map((item) => item.label),
    datasets: [
      {
        data: dailyCounts.map((item) => item.count),
        backgroundColor: themeTokens.brand.primary[700],
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
        borderColor: themeTokens.neutral.surface,
        borderWidth: 4,
        hoverOffset: 4,
      },
    ],
  };

  return (
    <>
      <Col xs={24} xl={14}>
        <WidgetErrorBoundary title="Hồ sơ tạo theo ngày">
          <Card
            className="skylux-card h-full"
            title={<span className="font-bold text-slate-900">Hồ sơ tạo theo ngày</span>}
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
        </WidgetErrorBoundary>
      </Col>
      <Col xs={24} md={12} xl={5}>
        <WidgetErrorBoundary title="Hồ sơ theo trạng thái">
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
        </WidgetErrorBoundary>
      </Col>
    </>
  );
}
