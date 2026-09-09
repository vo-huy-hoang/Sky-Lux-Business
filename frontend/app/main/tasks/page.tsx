'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Button, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useDebounce } from '@/hooks/use-debounce';
import { useTasksList } from '@/hooks/use-tasks';
import { TaskPriority, TaskStatus } from '@/types/task';

import {
  TimeRange,
  isSameDay,
  isInLastSevenDays,
} from './helpers';
import TaskSummaryCards from './components/TaskSummaryCards';
import TaskFilterBar from './components/TaskFilterBar';
import TaskBoard from './components/TaskBoard';
import TaskSidePanel from './components/TaskSidePanel';
import TaskDetailDrawer from './components/TaskDetailDrawer';
import TaskCreateModal from './components/TaskCreateModal';

const { Title } = Typography;

export default function TasksPage() {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');

  const [timeRange, setTimeRange] = useState<TimeRange>('TODAY');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [priority, setPriority] = useState<TaskPriority | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('TODO');

  // Fetch tasks via Deep Hook (API-TASKS-001)
  const {
    tasks: allTasks,
    isLoading,
    isError,
    refetch,
  } = useTasksList({ page: 1, limit: 100 });

  // Fetch dossiers for association in create modal
  const { data: dossiersData } = useQuery({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }),
    queryFn: ({ signal }) =>
      dossiersService.getDossiers({ page: 1, limit: 100 }, { signal }),
  });

  // Filter tasks based on debounced search, priority and time range
  const visibleTasks = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLocaleLowerCase('vi-VN');
    return allTasks.filter((task) => {
      if (priority && task.priority !== priority) return false;
      if (normalizedSearch) {
        const haystack = `${task.title} ${task.description || ''} ${
          task.dossier?.code || ''
        } ${task.dossier?.customer?.displayName || ''}`.toLocaleLowerCase('vi-VN');
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (timeRange === 'TODAY') return isSameDay(task.dueAt);
      if (timeRange === 'WEEK') return isInLastSevenDays(task.dueAt);
      return true;
    });
  }, [allTasks, priority, debouncedSearch, timeRange]);

  // Derived metrics
  const metrics = useMemo(() => {
    const current = new Date();
    return {
      today: allTasks.filter((task) => isSameDay(task.dueAt)).length,
      overdue: allTasks.filter(
        (task) =>
          task.dueAt &&
          new Date(task.dueAt) < current &&
          task.status !== 'COMPLETED' &&
          task.status !== 'CANCELLED',
      ).length,
      waiting: allTasks.filter((task) => task.status === 'WAITING').length,
      completed: allTasks.filter(
        (task) =>
          task.status === 'COMPLETED' && isInLastSevenDays(task.completedAt),
      ).length,
    };
  }, [allTasks]);

  // Reminder and dossier task subsets for side panel
  const reminderTasks = useMemo(
    () =>
      allTasks
        .filter(
          (task) =>
            task.dueAt &&
            task.status !== 'COMPLETED' &&
            task.status !== 'CANCELLED',
        )
        .sort(
          (a, b) =>
            new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime(),
        )
        .slice(0, 5),
    [allTasks],
  );

  const dossierTasks = useMemo(
    () => allTasks.filter((task) => task.dossierId).slice(0, 5),
    [allTasks],
  );

  const openCreate = (status: TaskStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Không thể tải danh sách công việc"
        description="Vui lòng kiểm tra kết nối API rồi thử lại."
        action={<Button onClick={() => refetch()}>Tải lại</Button>}
      />
    );
  }

  return (
    <div
      className={`skylux-tasks-page space-y-5 pb-3 ${
        isOperator ? 'op-page' : ''
      }`}
    >
      <div className={isOperator ? 'op-page-heading' : undefined}>
        <Title level={1} className="skylux-page-title">
          {isOperator ? 'Công việc điều hành' : 'Công việc của tôi'}
        </Title>
        <div className="skylux-subtitle mt-1">
          {isOperator
            ? 'Theo dõi và quản lý công việc xử lý hồ sơ'
            : 'Theo dõi và quản lý công việc được giao cho bạn'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4">
          <TaskSummaryCards metrics={metrics} isLoading={isLoading} />

          <TaskFilterBar
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            search={search}
            onSearchChange={setSearch}
            priority={priority}
            onPriorityChange={setPriority}
            onReload={() => refetch()}
          />

          <TaskBoard
            visibleTasks={visibleTasks}
            isOperator={isOperator}
            isLoading={isLoading}
            onOpenTask={setSelectedTaskId}
            onCreateTask={openCreate}
          />
        </div>

        <TaskSidePanel
          reminderTasks={reminderTasks}
          dossierTasks={dossierTasks}
          isLoading={isLoading}
          onOpenTask={setSelectedTaskId}
        />
      </div>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      <TaskCreateModal
        open={createOpen}
        createStatus={createStatus}
        onClose={() => setCreateOpen(false)}
        dossiers={dossiersData?.data || []}
      />
    </div>
  );
}
