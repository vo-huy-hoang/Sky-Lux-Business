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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function money(value?: number | null) {
  return `${new Intl.NumberFormat('vi-VN').format(value || 0)} đ`;
}

function compact(value?: number | null | string) {
  const number = Number(value);
  if (!number || isNaN(number) || Math.abs(number) < 0.0001) return '0';
  if (Math.abs(number) >= 1_000_000_000)
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000_000)} tỷ`;
  if (Math.abs(number) >= 1_000_000)
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000_000)} tr`;
  if (Math.abs(number) >= 1_000)
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(number / 1_000)} k`;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(number);
}

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
        backgroundColor: '#D4AF37',
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
          label: (context) => money(context.parsed.x),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        min: 0,
        suggestedMax: 10_000_000,
        ticks: { callback: (v) => compact(Number(v)) },
        grid: { color: '#EEF0EF' },
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
