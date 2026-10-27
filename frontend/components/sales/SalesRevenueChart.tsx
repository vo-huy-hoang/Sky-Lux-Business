'use client';

import React, { useMemo } from 'react';
import { Empty } from 'antd';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { OperatorSalesSummaryItem } from '@/types/dashboard';
import { formatCurrency } from '@/lib/financial-calculations';
import { themeTokens } from '@/lib/theme/tokens.config';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface SalesRevenueChartProps {
  items: OperatorSalesSummaryItem[];
}

export default function SalesRevenueChart({ items }: SalesRevenueChartProps) {
  const chartData = useMemo(() => ({
    labels: items.slice(0, 8).map((s) => s.salesUserName),
    datasets: [
      {
        label: 'Doanh thu (VNĐ)',
        data: items.slice(0, 8).map((s) => s.totalRevenue),
        backgroundColor: themeTokens.charts.salesRevenueBar,
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  }), [items]);

  const barRevenueOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => formatCurrency(context.parsed.x),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        min: 0,
        suggestedMax: 10_000_000,
        ticks: { callback: (v) => formatCurrency(Number(v), { compact: true, showSymbol: false }) },
        grid: { color: themeTokens.charts.gridLines },
        border: { display: false },
      },
      y: { grid: { display: false }, border: { display: false } },
    },
  };

  if (!items || items.length === 0) {
    return <Empty description="Chưa có dữ liệu Doanh thu Sales" />;
  }

  return <Bar data={chartData} options={barRevenueOptions} />;
}
