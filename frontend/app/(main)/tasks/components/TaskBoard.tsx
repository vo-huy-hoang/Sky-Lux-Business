'use client';

import React from 'react';
import { Button, Skeleton, Tag, Typography } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  EllipsisOutlined,
  FolderOpenOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { TaskItem, TaskStatus } from '@/types/task';
import {
  boardColumns,
  formatShortDate,
  getBoardStatus,
  getDossierLabel,
  priorityMeta,
  statusMeta,
} from '../helpers';

const { Text } = Typography;

function TaskCard({
  task,
  onOpen,
}: {
  task: TaskItem;
  onOpen: (id: string) => void;
}) {
  const priority = priorityMeta[task.priority] || priorityMeta.MEDIUM;
  const completed = task.status === 'COMPLETED';
  const status = statusMeta[task.status] || statusMeta.TODO;

  return (
    <article
      className="skylux-task-card cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen(task.id);
      }}
      aria-label={`Mở chi tiết công việc ${task.title}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 text-base ${
            completed ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-gold)]'
          }`}
        >
          {completed ? <CheckCircleOutlined /> : <FolderOpenOutlined />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Text
              strong
              className="line-clamp-2 text-[13px] leading-5 text-slate-800"
            >
              {task.title}
            </Text>
            <EllipsisOutlined className="mt-0.5 text-slate-400" />
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">
            {getDossierLabel(task)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarOutlined /> {formatShortDate(task.dueAt)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 font-medium ${priority.color}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />{' '}
          {priority.label}
        </span>
      </div>

      {completed ? (
        <Tag className="skylux-status-valid mt-3">Hoàn thành</Tag>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--color-primary-600)]"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(task.progressPercent || 0, 100),
                )}%`,
              }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {task.progressPercent || 0}%
          </span>
        </div>
      )}
    </article>
  );
}

function TaskColumn({
  title,
  status,
  tasks,
  onOpen,
  onCreate,
}: {
  title: string;
  status: TaskStatus;
  tasks: TaskItem[];
  onOpen: (id: string) => void;
  onCreate: (status: TaskStatus) => void;
}) {
  const meta = statusMeta[status];

  return (
    <section className="skylux-task-column">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
        <Text strong className="text-sm text-slate-800">
          {title} ({tasks.length})
        </Text>
      </div>

      <div className="space-y-2">
        {tasks.length ? (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-4 py-7 text-center text-xs text-slate-400">
            Chưa có công việc
          </div>
        )}
      </div>

      <Button
        type="text"
        icon={<PlusOutlined />}
        className="mt-3 w-full justify-start px-2 text-[var(--color-primary-600)]"
        onClick={() => onCreate(status)}
      >
        Thêm công việc
      </Button>
    </section>
  );
}

export interface TaskBoardProps {
  visibleTasks: TaskItem[];
  isOperator: boolean;
  isLoading: boolean;
  onOpenTask: (id: string) => void;
  onCreateTask: (status: TaskStatus) => void;
}

export default function TaskBoard({
  visibleTasks,
  isOperator,
  isLoading,
  onOpenTask,
  onCreateTask,
}: TaskBoardProps) {
  const activeBoardColumns = isOperator
    ? [
        ...boardColumns.slice(0, 2),
        { status: 'WAITING' as TaskStatus, title: 'Chờ phản hồi' },
        boardColumns[2],
      ]
    : boardColumns;

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        isOperator ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
      }`}
    >
      {isLoading
        ? activeBoardColumns.map((column) => (
            <div key={column.status} className="skylux-task-column">
              <Skeleton active paragraph={{ rows: 8 }} />
            </div>
          ))
        : activeBoardColumns.map((column) => (
            <TaskColumn
              key={column.status}
              {...column}
              tasks={visibleTasks.filter(
                (task) =>
                  (isOperator ? task.status : getBoardStatus(task.status)) ===
                  column.status,
              )}
              onOpen={onOpenTask}
              onCreate={onCreateTask}
            />
          ))}
    </div>
  );
}
