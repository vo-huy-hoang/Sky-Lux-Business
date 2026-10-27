'use client';

import React from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

interface CeoMonthlyRevenueChartProps {
  data: {
    labels: string[];
    datasets: any[];
  };
  options: ChartOptions<'line'>;
}

export default function CeoMonthlyRevenueChart({
  data,
  options,
}: CeoMonthlyRevenueChartProps) {
  return <Line data={data} options={options} />;
}
