'use client';

import React, { useEffect } from 'react';
import { Alert, App, Form, Input, Modal, Select } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/query-keys';
import { CreateTaskInput, TaskPriority, TaskStatus } from '@/types/task';
import { priorityMeta, statusMeta } from '../helpers';

export interface CreateTaskFormValues {
  title: string;
  description?: string;
  priority: TaskPriority;
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
