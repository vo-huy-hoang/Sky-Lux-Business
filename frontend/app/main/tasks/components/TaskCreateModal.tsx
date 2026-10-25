'use client';

import React, { useEffect } from 'react';
import { Alert, App, Form, Input, Modal, Select, Spin } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/query-keys';
import { CreateTaskInput, TaskPriority, TaskStatus } from '@/types/task';
import { usersService } from '@/services/users.service';
import type { UserItem } from '@/types/user';
import { useAuthStore } from '@/lib/stores/auth-store';
import { priorityMeta, statusMeta } from '../helpers';

export interface CreateTaskFormValues {
  title: string;
  description?: string;
  priority: TaskPriority;
  assignedTo?: string;
  dossierId?: string;
  dueAt?: string;
}

export interface TaskCreateModalProps {
  open: boolean;
  createStatus: TaskStatus;
  onClose: () => void;
  dossiers: Array<{
    id: string;
    code?: string;
    customer?: { displayName?: string };
    name?: string;
  }>;
}

export default function TaskCreateModal({
  open,
  createStatus,
  onClose,
  dossiers,
}: TaskCreateModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CreateTaskFormValues>();
  const hasRole = useAuthStore((state) => state.hasRole);
  const canAssignUsers = hasRole(['CEO_ADMIN', 'SUPER_ADMIN']);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: queryKeys.users.list({ page: 1, pageSize: 100, status: 'ACTIVE' }),
    queryFn: async () => {
      const params = { pageSize: 100, status: 'ACTIVE' as const };
      const firstPage = await usersService.getUsers({ ...params, page: 1 });
      if (firstPage.meta.totalPages <= 1) return firstPage;

      const remainingPages = await Promise.all(
        Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
          usersService.getUsers({ ...params, page: index + 2 }),
        ),
      );
      return {
        ...firstPage,
        data: [
          ...firstPage.data,
          ...remainingPages.flatMap((page) => page.data),
        ],
      };
    },
    enabled: open && canAssignUsers,
  });

  const assigneeOptions = (usersData?.data || [])
    .filter((user: UserItem) =>
      user.roles?.some((role) => ['SALES', 'OPERATOR'].includes(role.code)),
    )
    .map((user: UserItem) => {
      const roleLabels = user.roles
        ?.filter((role) => ['SALES', 'OPERATOR'].includes(role.code))
        .map((role) => (role.code === 'SALES' ? 'Sales' : 'Điều hành'));
      return {
        value: user.id,
        label: `${user.fullName} · ${roleLabels?.join(', ')}`,
      };
    });

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ priority: 'MEDIUM' });
    }
  }, [open, form]);

  const createTask = useMutation({
    mutationFn: async (values: CreateTaskFormValues) => {
      const payload: CreateTaskInput = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        priority: values.priority,
        assignedTo: values.assignedTo || undefined,
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
      onClose();
    },
    onError: (error: Error) =>
      message.error(error.message || 'Không thể tạo công việc'),
  });

  return (
    <Modal
      title="Thêm công việc"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => form.submit()}
      okText="Tạo công việc"
      cancelText="Hủy"
      forceRender
      destroyOnHidden
      confirmLoading={createTask.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ priority: 'MEDIUM' }}
        onFinish={(values) => createTask.mutate(values)}
        className="pt-3"
      >
        <Form.Item
          name="title"
          label="Tên công việc"
          rules={[{ required: true, message: 'Vui lòng nhập tên công việc' }]}
        >
          <Input autoFocus placeholder="Ví dụ: Theo dõi đặt dịch vụ" />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={3} placeholder="Nội dung cần xử lý" />
        </Form.Item>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Form.Item name="priority" label="Độ ưu tiên">
            <Select
              options={Object.entries(priorityMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
          </Form.Item>
          <Form.Item name="dueAt" label="Hạn xử lý">
            <Input type="datetime-local" />
          </Form.Item>
        </div>
        <Form.Item name="dossierId" label="Hồ sơ liên quan">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chọn hồ sơ"
            options={dossiers.map((dossier) => ({
              value: dossier.id,
              label: `${dossier.code || 'Hồ sơ'} - ${
                dossier.customer?.displayName || dossier.name
              }`,
            }))}
          />
        </Form.Item>
        {canAssignUsers && (
          <Form.Item name="assignedTo" label="Người phụ trách">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn account Sales hoặc Điều hành"
              notFoundContent={isLoadingUsers ? <Spin size="small" /> : undefined}
              options={assigneeOptions}
            />
          </Form.Item>
        )}
        {createStatus !== 'TODO' && (
          <Alert
            type="info"
            showIcon
            icon={<WarningOutlined />}
            title={`Công việc sẽ được tạo ở cột ${statusMeta[createStatus].label}.`}
          />
        )}
      </Form>
    </Modal>
  );
}
