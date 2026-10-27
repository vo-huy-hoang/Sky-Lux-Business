'use client';

import React, { useMemo } from 'react';
import { Empty } from 'antd';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { OperatorSalesSummaryItem } from '@/types/dashboard';
import { themeTokens } from '@/lib/theme/tokens.config';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface SalesDossiersChartProps {
  items: OperatorSalesSummaryItem[];
}

export default function SalesDossiersChart({ items }: SalesDossiersChartProps) {
  const chartData = useMemo(() => ({
    labels: items.slice(0, 8).map((s) => s.salesUserName),
    datasets: [
      {
        label: 'Hồ sơ phụ trách',
        data: items.slice(0, 8).map((s) => s.totalDossiers),
        backgroundColor: themeTokens.charts.salesDossiersBar,
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }), [items]);

  if (!items || items.length === 0) {
    return <Empty description="Chưa có dữ liệu Sales" />;
  }

  return (
    <Bar
      data={chartData}
      options={{
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.x} hồ sơ`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            min: 0,
            suggestedMax: 5,
            ticks: { precision: 0 },
            grid: { color: themeTokens.charts.gridLines },
            border: { display: false },
          },
          y: { grid: { display: false }, border: { display: false } },
        },
      }}
    />
  );
}
