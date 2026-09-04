'use client';

import React from 'react';
import {
  App,
  Checkbox,
  Drawer,
  Select,
  Skeleton,
  Typography,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/query-keys';
import { useTaskDetail } from '@/hooks/use-tasks';
import { TaskChecklistItem, TaskPriority, UpdateTaskInput } from '@/types/task';
import {
  formatDateTime,
  getDossierLabel,
  priorityMeta,
  statusMeta,
} from '../helpers';

const { Title, Text } = Typography;

export interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

export default function TaskDetailDrawer({
  taskId,
  onClose,
}: TaskDetailDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useTaskDetail(taskId);

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksService.updateTask(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã cập nhật công việc');
    },
    onError: (error: Error) =>
      message.error(error.message || 'Không thể cập nhật công việc'),
  });

  const updateChecklist = (item: TaskChecklistItem, checked: boolean) => {
    if (!task) return;
    const checklistItems = (task.checklistItems || []).map((current: TaskChecklistItem) =>
      current.id === item.id ? { ...current, isCompleted: checked } : current,
    );
    updateTask.mutate({ id: task.id, data: { checklistItems } });
  };

  const priorityConfig = task ? priorityMeta[(task.priority || 'MEDIUM') as TaskPriority] : undefined;

  return (
    <Drawer
      title="Chi tiết công việc"
      open={!!taskId}
      onClose={onClose}
      styles={{ wrapper: { width: 440, maxWidth: '100vw' } }}
      className="skylux-task-drawer"
    >
      {isLoading || !task ? (
        <div className="space-y-4">
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Công việc
            </Text>
            <Title level={4} className="mt-2 mb-1! text-xl! text-slate-900!">
              {task.title}
            </Title>
            <Text className="text-sm text-slate-500">
              {task.description || 'Chưa có mô tả chi tiết'}
            </Text>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <Text className="block text-xs text-slate-500">Hồ sơ</Text>
              <Text strong className="mt-1 block text-slate-700">
                {getDossierLabel(task)}
              </Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">
                Người phụ trách
              </Text>
              <Text strong className="mt-1 block text-slate-700">
                {task.assignee?.fullName || 'Chưa phân công'}
              </Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">Hạn xử lý</Text>
              <Text strong className="mt-1 block text-slate-700">
                {formatDateTime(task.dueAt)}
              </Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">Ưu tiên</Text>
              <Text
                strong
                className={`mt-1 block ${priorityConfig?.color || ''}`}
              >
                {priorityConfig?.label || task.priority}
              </Text>
            </div>
          </div>

          <div>
            <Text className="mb-2 block text-sm font-semibold text-slate-800">
              Trạng thái
            </Text>
            <Select
              className="w-full"
              value={task.status}
              loading={updateTask.isPending}
              onChange={(status) =>
                updateTask.mutate({ id: task.id, data: { status } })
              }
              options={Object.entries(statusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <Text className="text-sm font-semibold text-slate-800">
                Danh sách việc phụ
              </Text>
              <Text className="text-xs text-slate-500">
                {task.progressPercent || 0}% hoàn thành
              </Text>
            </div>

            {task.checklistItems?.length ? (
              <div className="space-y-2">
                {task.checklistItems.map((item: TaskChecklistItem) => (
                  <Checkbox
                    key={item.id || item.title}
                    checked={item.isCompleted}
                    disabled={updateTask.isPending}
                    onChange={(event) =>
                      updateChecklist(item, event.target.checked)
                    }
                  >
                    {item.title}
                  </Checkbox>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                Công việc này chưa có danh sách việc phụ.
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
