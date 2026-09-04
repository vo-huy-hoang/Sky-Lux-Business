'use client';

import React from 'react';
import { Button, Empty, Progress, Skeleton, Tag, Typography } from 'antd';
import { TaskItem } from '@/types/task';
import { formatShortDate, getDossierLabel, statusMeta } from '../helpers';

const { Text } = Typography;

export interface TaskSidePanelProps {
  reminderTasks: TaskItem[];
  dossierTasks: TaskItem[];
  isLoading: boolean;
  onOpenTask: (id: string) => void;
}

export default function TaskSidePanel({
  reminderTasks,
  dossierTasks,
  isLoading,
  onOpenTask,
}: TaskSidePanelProps) {
  return (
    <aside className="skylux-task-side-panel hidden 2xl:block">
      <div className="flex items-center justify-between">
        <Text strong className="text-[15px] text-slate-800">
          Lịch nhắc việc
        </Text>
        <Button type="link" className="px-0 text-[var(--color-primary-600)]">
          Xem tất cả
        </Button>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : reminderTasks.length ? (
          reminderTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="skylux-task-reminder"
              onClick={() => onOpenTask(task.id)}
            >
              <span className="w-12 text-left text-xs font-semibold text-[var(--color-danger)]">
                {formatShortDate(task.dueAt)}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium text-slate-700">
                  {task.title}
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {getDossierLabel(task)}
                </span>
              </span>
            </button>
          ))
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có lịch nhắc"
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <Text strong className="text-[15px] text-slate-800">
          Việc liên quan đến hồ sơ
        </Text>
        <Button type="link" className="px-0 text-[var(--color-primary-600)]">
          Xem tất cả
        </Button>
      </div>
      <div className="mt-3 space-y-4">
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : dossierTasks.length ? (
          dossierTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="block w-full text-left"
              onClick={() => onOpenTask(task.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-700">
                  {task.dossier?.code || 'Hồ sơ liên quan'}
                </span>
                <Tag className={statusMeta[task.status]?.tagClass}>
                  {statusMeta[task.status]?.label || task.status}
                </Tag>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                {task.dossier?.route || task.title}
              </div>
              <Progress
                percent={task.progressPercent || 0}
                showInfo={false}
                size="small"
                strokeColor="#007A55"
                trailColor="#EEF2F1"
                className="mt-1"
              />
            </button>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">
            Chưa có công việc gắn hồ sơ
          </div>
        )}
      </div>
    </aside>
  );
}
