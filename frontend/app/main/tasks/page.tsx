'use client';

import React, { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Skeleton,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  HourglassOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

import {
  CreateTaskInput,
  TaskChecklistItem,
  TaskExtensionRequestInput,
  TaskItem,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '@/types/task';

const { Title, Text } = Typography;

type TimeRange = 'TODAY' | 'WEEK' | 'ALL';

interface CreateTaskFormValues {
  title: string;
  description?: string;
  priority: TaskPriority;
  dossierId?: string;
  dueAt?: string;
}

const statusMeta: Record<TaskStatus, { label: string; dotClass: string; tagClass: string }> = {
  TODO: {
    label: 'Cần làm',
    dotClass: 'bg-[#78B06B]',
    tagClass: 'skylux-status-info',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    dotClass: 'bg-[#F2B11C]',
    tagClass: 'skylux-status-warning',
  },
  WAITING: {
    label: 'Chờ phản hồi',
    dotClass: 'bg-[#E0A420]',
    tagClass: 'skylux-status-warning',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    dotClass: 'bg-[#66A967]',
    tagClass: 'skylux-status-valid',
  },
  CANCELLED: {
    label: 'Đã hủy',
    dotClass: 'bg-[#D93737]',
    tagClass: 'skylux-status-danger',
  },
};

const priorityMeta: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: 'Thấp', color: 'text-[#32825F]' },
  MEDIUM: { label: 'Trung bình', color: 'text-[#B87809]' },
  HIGH: { label: 'Cao', color: 'text-[#D93737]' },
  URGENT: { label: 'Khẩn cấp', color: 'text-[#B91C1C]' },
};

const boardColumns: Array<{ status: TaskStatus; title: string }> = [
  { status: 'TODO', title: 'Cần làm' },
  { status: 'IN_PROGRESS', title: 'Đang xử lý' },
  { status: 'COMPLETED', title: 'Hoàn thành' },
];

function isSameDay(value: string | undefined, compared = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === compared.getFullYear() &&
    date.getMonth() === compared.getMonth() &&
    date.getDate() === compared.getDate()
  );
}

function isInLastSevenDays(value?: string) {
  if (!value) return false;
  const date = new Date(value).getTime();
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - 7);
  return date >= earliest.getTime() && date <= Date.now();
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa đặt hạn';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(value?: string) {
  if (!value) return 'Chưa đặt hạn';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getDossierLabel(task: TaskItem) {
  const code = task.dossier?.code;
  const customer = task.dossier?.customer?.displayName || task.dossier?.name;
  if (code && customer) return `Hồ sơ: ${code} - ${customer}`;
  if (code) return `Hồ sơ: ${code}`;
  if (task.dossierId) return 'Đã gắn hồ sơ liên quan';
  return 'Chưa gắn hồ sơ';
}

function getBoardStatus(status: TaskStatus) {
  if (status === 'WAITING') return 'IN_PROGRESS';
  if (status === 'CANCELLED') return 'TODO';
  return status;
}

function TaskCard({ task, onOpen }: { task: TaskItem; onOpen: (id: string) => void }) {
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
        <span className={`mt-0.5 text-base ${completed ? 'text-[var(--color-primary-600)]' : 'text-[#D6A51F]'}`}>
          {completed ? <CheckCircleOutlined /> : <FolderOpenOutlined />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Text strong className="line-clamp-2 text-[13px] leading-5 text-slate-800">
              {task.title}
            </Text>
            <EllipsisOutlined className="mt-0.5 text-slate-400" />
          </div>
          <div className="mt-1 truncate text-xs text-slate-500">{getDossierLabel(task)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarOutlined /> {formatShortDate(task.dueAt)}
        </span>
        <span className={`inline-flex items-center gap-1.5 font-medium ${priority.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} /> {priority.label}
        </span>
      </div>

      {completed ? (
        <Tag className="skylux-status-valid mt-3">Hoàn thành</Tag>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--color-primary-600)]"
              style={{ width: `${Math.max(0, Math.min(task.progressPercent || 0, 100))}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-500">{task.progressPercent || 0}%</span>
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
          tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} />)
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

function TaskDetailDrawer({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { data: task, isLoading } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId || undefined),
    queryFn: () => tasksService.getTask(taskId!),
    enabled: !!taskId,
  });
  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksService.updateTask(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã cập nhật công việc');
    },
    onError: (error: Error) => message.error(error.message || 'Không thể cập nhật công việc'),
  });

  const startTask = useMutation({
    mutationFn: (id: string) => tasksService.startTask(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã bắt đầu xử lý công việc');
    },
    onError: (error: Error) => message.error(error.message || 'Lỗi khi bắt đầu công việc'),
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => tasksService.completeTask(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã hoàn thành công việc');
    },
    onError: (error: Error) => message.error(error.message || 'Lỗi khi hoàn thành công việc'),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => tasksService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã xóa công việc');
      onClose();
    },
    onError: (error: Error) => message.error(error.message || 'Lỗi khi xóa công việc'),
  });

  const [extOpen, setExtOpen] = useState(false);
  const [extForm] = Form.useForm<TaskExtensionRequestInput>();
  const requestExtension = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskExtensionRequestInput }) => tasksService.requestExtension(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.tasks.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      message.success('Đã gửi yêu cầu gia hạn');
      setExtOpen(false);
      extForm.resetFields();
    },
    onError: (error: Error) => message.error(error.message || 'Lỗi khi gửi yêu cầu gia hạn'),
  });

  const confirmDelete = () => {
    modal.confirm({
      title: 'Xóa công việc',
      content: 'Bạn có chắc chắn muốn xóa công việc này không? Dữ liệu không thể phục hồi.',
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => deleteTask.mutate(task!.id),
    });
  };

  const updateChecklist = (item: TaskChecklistItem, checked: boolean) => {
    if (!task) return;
    const checklistItems = (task.checklistItems || []).map((current) =>
      current.id === item.id ? { ...current, isCompleted: checked } : current,
    );
    updateTask.mutate({ id: task.id, data: { checklistItems } });
  };

  return (
    <Drawer
      title="Chi tiết công việc"
      open={!!taskId}
      onClose={onClose}
      styles={{ wrapper: { width: 440, maxWidth: '100vw' } }}
      className="skylux-task-drawer"
      extra={
        task && (
          <div className="flex gap-2">
            {task.status === 'TODO' && (
              <Button size="small" type="primary" onClick={() => startTask.mutate(task.id)} loading={startTask.isPending}>Bắt đầu</Button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <Button size="small" type="primary" className="bg-[#66A967]" onClick={() => completeTask.mutate(task.id)} loading={completeTask.isPending}>Hoàn thành</Button>
            )}
            {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
              <Button size="small" onClick={() => setExtOpen(true)}>Gia hạn</Button>
            )}
            <Button size="small" danger onClick={confirmDelete} loading={deleteTask.isPending}>Xóa</Button>
          </div>
        )
      }
    >
      {isLoading || !task ? (
        <div className="space-y-4">
          <Skeleton active paragraph={{ rows: 3 }} />
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Công việc</Text>
            <Title level={4} className="mt-2 !mb-1 !text-xl !text-slate-900">
              {task.title}
            </Title>
            <Text className="text-sm text-slate-500">{task.description || 'Chưa có mô tả chi tiết'}</Text>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div>
              <Text className="block text-xs text-slate-500">Hồ sơ</Text>
              <Text strong className="mt-1 block text-slate-700">{getDossierLabel(task)}</Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">Người phụ trách</Text>
              <Text strong className="mt-1 block text-slate-700">{task.assignee?.fullName || 'Chưa phân công'}</Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">Hạn xử lý</Text>
              <Text strong className="mt-1 block text-slate-700">{formatDateTime(task.dueAt)}</Text>
            </div>
            <div>
              <Text className="block text-xs text-slate-500">Ưu tiên</Text>
              <Text strong className={`mt-1 block ${priorityMeta[task.priority]?.color || ''}`}>
                {priorityMeta[task.priority]?.label || task.priority}
              </Text>
            </div>
          </div>

          <div>
            <Text className="mb-2 block text-sm font-semibold text-slate-800">Trạng thái</Text>
            <Select
              className="w-full"
              value={task.status}
              loading={updateTask.isPending}
              onChange={(status) => updateTask.mutate({ id: task.id, data: { status } })}
              options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <Text className="text-sm font-semibold text-slate-800">Danh sách việc phụ</Text>
              <Text className="text-xs text-slate-500">{task.progressPercent || 0}% hoàn thành</Text>
            </div>
            {task.checklistItems?.length ? (
              <div className="space-y-2">
                {task.checklistItems.map((item) => (
                  <Checkbox
                    key={item.id || item.title}
                    checked={item.isCompleted}
                    disabled={updateTask.isPending}
                    onChange={(event) => updateChecklist(item, event.target.checked)}
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

      <Modal
        title="Gia hạn công việc"
        open={extOpen}
        onCancel={() => setExtOpen(false)}
        onOk={() => extForm.submit()}
        confirmLoading={requestExtension.isPending}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={extForm} layout="vertical" onFinish={(values) => requestExtension.mutate({ id: task!.id, data: { ...values, dueDate: new Date(values.dueDate).toISOString() } })}>
          <Form.Item name="dueDate" label="Hạn chót mới" rules={[{ required: true, message: 'Vui lòng chọn ngày giờ' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do gia hạn">
            <Input.TextArea rows={3} placeholder="Ví dụ: Đợi phản hồi từ khách hàng" />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}

export default function TasksPage() {
  const { message } = App.useApp();
  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');

  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TimeRange>('TODAY');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<TaskPriority | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>('TODO');
  const [form] = Form.useForm<CreateTaskFormValues>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.tasks.list({ page: 1, limit: 100 }),
    queryFn: () => tasksService.getTasks({ page: 1, limit: 100 }),
  });
  const { data: dossiersData } = useQuery({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 100 }),
    queryFn: () => dossiersService.getDossiers({ page: 1, limit: 100 }),
  });

  const createTask = useMutation({
    mutationFn: async (values: CreateTaskFormValues) => {
      const payload: CreateTaskInput = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        priority: values.priority,
        dossierId: values.dossierId || undefined,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
      };
      const created = await tasksService.createTask(payload);
      if (createStatus !== 'TODO') {
        return tasksService.updateTask(created.id, { status: createStatus });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboards.all });
      message.success('Đã tạo công việc');
      form.resetFields();
      setCreateOpen(false);
    },
    onError: (error: Error) => message.error(error.message || 'Không thể tạo công việc'),
  });

  const allTasks = useMemo(() => data?.items || [], [data?.items]);
  const visibleTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi-VN');
    return allTasks.filter((task) => {
      if (priority && task.priority !== priority) return false;
      if (normalizedSearch) {
        const haystack = `${task.title} ${task.description || ''} ${task.dossier?.code || ''} ${task.dossier?.customer?.displayName || ''}`.toLocaleLowerCase('vi-VN');
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (timeRange === 'TODAY') return isSameDay(task.dueAt);
      if (timeRange === 'WEEK') return isInLastSevenDays(task.dueAt);
      return true;
    });
  }, [allTasks, priority, search, timeRange]);

  const metrics = useMemo(() => {
    const current = new Date();
    return {
      today: allTasks.filter((task) => isSameDay(task.dueAt)).length,
      overdue: allTasks.filter(
        (task) => task.dueAt && new Date(task.dueAt) < current && task.status !== 'COMPLETED' && task.status !== 'CANCELLED',
      ).length,
      waiting: allTasks.filter((task) => task.status === 'WAITING').length,
      completed: allTasks.filter((task) => task.status === 'COMPLETED' && isInLastSevenDays(task.completedAt)).length,
    };
  }, [allTasks]);

  const reminderTasks = useMemo(
    () =>
      allTasks
        .filter((task) => task.dueAt && task.status !== 'COMPLETED' && task.status !== 'CANCELLED')
        .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
        .slice(0, 5),
    [allTasks],
  );
  const dossierTasks = useMemo(
    () => allTasks.filter((task) => task.dossierId).slice(0, 5),
    [allTasks],
  );
  const activeBoardColumns = isOperator
    ? [...boardColumns.slice(0, 2), { status: 'WAITING' as TaskStatus, title: 'Chờ phản hồi' }, boardColumns[2]]
    : boardColumns;

  const openCreate = (status: TaskStatus) => {
    setCreateStatus(status);
    form.setFieldsValue({ priority: 'MEDIUM' });
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
    <div className={`skylux-tasks-page space-y-5 pb-3 ${isOperator ? 'op-page' : ''}`}>
      <div className={isOperator ? 'op-page-heading' : undefined}>
        <Title level={1} className="skylux-page-title">{isOperator ? 'Công việc điều hành' : 'Công việc của tôi'}</Title>
        <div className="skylux-subtitle mt-1">{isOperator ? 'Theo dõi và quản lý công việc xử lý hồ sơ' : 'Theo dõi và quản lý công việc được giao cho bạn'}</div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="skylux-task-metric">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]"><CalendarOutlined /></span>
              <div><Text className="text-sm text-slate-500">Hôm nay</Text><div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">{isLoading ? <Skeleton.Input active size="small" /> : metrics.today}</div><Text className="mt-2 block text-xs text-[var(--color-primary-600)]">Công việc đến hạn</Text></div>
            </div>
            <div className="skylux-task-metric">
              <span className="skylux-icon-bubble bg-[var(--color-danger-soft)] text-[var(--color-danger)]"><ClockCircleOutlined /></span>
              <div><Text className="text-sm text-slate-500">Quá hạn</Text><div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">{isLoading ? <Skeleton.Input active size="small" /> : metrics.overdue}</div><Text className="mt-2 block text-xs text-[var(--color-danger)]">Cần xử lý ngay</Text></div>
            </div>
            <div className="skylux-task-metric">
              <span className="skylux-icon-bubble bg-[var(--color-gold-soft)] text-[var(--color-gold)]"><HourglassOutlined /></span>
              <div><Text className="text-sm text-slate-500">Chờ xử lý</Text><div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">{isLoading ? <Skeleton.Input active size="small" /> : metrics.waiting}</div><Text className="mt-2 block text-xs text-[#B87809]">Đang chờ phản hồi</Text></div>
            </div>
            <div className="skylux-task-metric">
              <span className="skylux-icon-bubble bg-[var(--color-purple-soft)] text-[var(--color-purple)]"><CheckCircleOutlined /></span>
              <div><Text className="text-sm text-slate-500">Hoàn thành tuần này</Text><div className="mt-1 text-[28px] font-bold leading-none text-[var(--color-primary-900)]">{isLoading ? <Skeleton.Input active size="small" /> : metrics.completed}</div><Text className="mt-2 block text-xs text-[var(--color-primary-600)]">Theo dữ liệu API</Text></div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit rounded-full bg-slate-100 p-1">
              {([['TODAY', 'Hôm nay'], ['WEEK', 'Tuần này'], ['ALL', 'Tất cả']] as const).map(([value, label]) => (
                <Button key={value} type="text" onClick={() => setTimeRange(value)} className={`rounded-full px-5 ${timeRange === value ? 'bg-white font-semibold text-[var(--color-primary-700)] shadow-sm' : 'text-slate-500'}`}>{label}</Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input value={search} onChange={(event) => setSearch(event.target.value)} prefix={<SearchOutlined />} placeholder="Tìm công việc..." allowClear className="h-9 sm:w-[210px]" />
              <Select value={priority} onChange={(value) => setPriority(value)} allowClear placeholder="Bộ lọc" suffixIcon={<FilterOutlined />} className="min-w-[150px]" options={Object.entries(priorityMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} aria-label="Tải lại công việc" />
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${isOperator ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
            {isLoading ? activeBoardColumns.map((column) => <div key={column.status} className="skylux-task-column"><Skeleton active paragraph={{ rows: 8 }} /></div>) : activeBoardColumns.map((column) => (
              <TaskColumn key={column.status} {...column} tasks={visibleTasks.filter((task) => (isOperator ? task.status : getBoardStatus(task.status)) === column.status)} onOpen={setSelectedTaskId} onCreate={openCreate} />
            ))}
          </div>
        </div>

        <aside className="skylux-task-side-panel hidden 2xl:block">
          <div className="flex items-center justify-between"><Text strong className="text-[15px] text-slate-800">Lịch nhắc việc</Text><Button type="link" className="px-0 text-[var(--color-primary-600)]">Xem tất cả</Button></div>
          <div className="mt-3 divide-y divide-slate-100">
            {isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : reminderTasks.length ? reminderTasks.map((task) => (
              <button key={task.id} type="button" className="skylux-task-reminder" onClick={() => setSelectedTaskId(task.id)}>
                <span className="w-12 text-left text-xs font-semibold text-[var(--color-danger)]">{formatShortDate(task.dueAt)}</span>
                <span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium text-slate-700">{task.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{getDossierLabel(task)}</span></span>
              </button>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch nhắc" />}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5"><Text strong className="text-[15px] text-slate-800">Việc liên quan đến hồ sơ</Text><Button type="link" className="px-0 text-[var(--color-primary-600)]">Xem tất cả</Button></div>
          <div className="mt-3 space-y-4">
            {isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : dossierTasks.length ? dossierTasks.map((task) => (
              <button key={task.id} type="button" className="block w-full text-left" onClick={() => setSelectedTaskId(task.id)}>
                <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-700">{task.dossier?.code || 'Hồ sơ liên quan'}</span><Tag className={statusMeta[task.status]?.tagClass}>{statusMeta[task.status]?.label || task.status}</Tag></div>
                <div className="mt-1 truncate text-xs text-slate-500">{task.dossier?.route || task.title}</div>
                <Progress percent={task.progressPercent || 0} showInfo={false} size="small" strokeColor="#007A55" trailColor="#EEF2F1" className="mt-1" />
              </button>
            )) : <div className="rounded-lg border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-400">Chưa có công việc gắn hồ sơ</div>}
          </div>
        </aside>
      </div>

      <TaskDetailDrawer taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />

      <Modal
        title="Thêm công việc"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo công việc"
        cancelText="Hủy"
        forceRender
        destroyOnHidden
        confirmLoading={createTask.isPending}
      >
        <Form form={form} layout="vertical" initialValues={{ priority: 'MEDIUM' }} onFinish={(values) => createTask.mutate(values)} className="pt-3">
          <Form.Item name="title" label="Tên công việc" rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}><Input autoFocus placeholder="Ví dụ: Theo dõi đặt dịch vụ" /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} placeholder="Nội dung cần xử lý" /></Form.Item>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item name="priority" label="Độ ưu tiên"><Select options={Object.entries(priorityMeta).map(([value, meta]) => ({ value, label: meta.label }))} /></Form.Item>
            <Form.Item name="dueAt" label="Hạn xử lý"><Input type="datetime-local" /></Form.Item>
          </div>
          <Form.Item name="dossierId" label="Hồ sơ liên quan"><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn hồ sơ" options={(dossiersData?.items || []).map((dossier) => ({ value: dossier.id, label: `${dossier.code || 'Hồ sơ'} - ${dossier.customer?.displayName || dossier.name}` }))} /></Form.Item>
          {createStatus !== 'TODO' && <Alert type="info" showIcon icon={<WarningOutlined />} title={`Công việc sẽ được tạo ở cột ${statusMeta[createStatus].label}.`} />}
        </Form>
      </Modal>
    </div>
  );
}
