'use client';

import React from 'react';
import { Skeleton, Typography } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export interface TaskMetrics {
  today: number;
  overdue: number;
  waiting: number;
  completed: number;
}

export interface TaskSummaryCardsProps {
  metrics: TaskMetrics;
  isLoading: boolean;
}

export default function TaskSummaryCards({
  metrics,
  isLoading,
}: TaskSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="skylux-task-metric">
        <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
          <CalendarOutlined />
        </span>
        <div>
          <Text className="text-sm text-slate-500">Hôm nay</Text>
          <div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">
            {isLoading ? <Skeleton.Input active size="small" /> : metrics.today}
          </div>
          <Text className="mt-2 block text-xs text-[var(--color-primary-600)]">
            Công việc đến hạn
          </Text>
        </div>
      </div>

      <div className="skylux-task-metric">
        <span className="skylux-icon-bubble bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
          <ClockCircleOutlined />
        </span>
        <div>
          <Text className="text-sm text-slate-500">Quá hạn</Text>
          <div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">
            {isLoading ? <Skeleton.Input active size="small" /> : metrics.overdue}
          </div>
          <Text className="mt-2 block text-xs text-[var(--color-danger)]">
            Cần xử lý ngay
          </Text>
        </div>
      </div>

      <div className="skylux-task-metric">
        <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]">
          <HourglassOutlined />
        </span>
        <div>
          <Text className="text-sm text-slate-500">Chờ xử lý</Text>
          <div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">
            {isLoading ? <Skeleton.Input active size="small" /> : metrics.waiting}
          </div>
          <Text className="mt-2 block text-xs text-[#B87809]">
            Đang chờ phản hồi
          </Text>
        </div>
      </div>

      <div className="skylux-task-metric">
        <span className="skylux-icon-bubble bg-[var(--color-purple-soft)] text-[var(--color-purple)]">
          <CheckCircleOutlined />
        </span>
        <div>
          <Text className="text-sm text-slate-500">Hoàn thành tuần này</Text>
          <div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">
            {isLoading ? <Skeleton.Input active size="small" /> : metrics.completed}
          </div>
          <Text className="mt-2 block text-xs text-[var(--color-primary-600)]">
            Theo dữ liệu API
          </Text>
        </div>
      </div>
    </div>
  );
}
