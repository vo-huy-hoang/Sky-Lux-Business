'use client';

import React from 'react';
import { Button, Input, Select } from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { TaskPriority } from '@/types/task';
import { TimeRange, priorityMeta } from '../helpers';

export interface TaskFilterBarProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  search: string;
  onSearchChange: (search: string) => void;
  priority: TaskPriority | undefined;
  onPriorityChange: (priority: TaskPriority | undefined) => void;
  onReload: () => void;
}

export default function TaskFilterBar({
  timeRange,
  onTimeRangeChange,
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  onReload,
}: TaskFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="inline-flex w-fit rounded-full bg-slate-100 p-1">
        {(
          [
            ['TODAY', 'Hôm nay'],
            ['WEEK', 'Tuần này'],
            ['ALL', 'Tất cả'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="text"
            onClick={() => onTimeRangeChange(value)}
            className={`rounded-full px-5 ${
              timeRange === value
                ? 'bg-white font-semibold text-[var(--color-primary-700)] shadow-sm'
                : 'text-slate-500'
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Tìm công việc..."
          allowClear
          className="h-9 sm:w-[210px]"
        />
        <Select
          value={priority}
          onChange={(value) => onPriorityChange(value)}
          allowClear
          placeholder="Bộ lọc"
          suffixIcon={<FilterOutlined />}
          className="min-w-[150px]"
          options={Object.entries(priorityMeta).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={onReload}
          aria-label="Tải lại công việc"
        />
      </div>
    </div>
  );
}
