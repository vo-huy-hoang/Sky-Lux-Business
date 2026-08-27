'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { CustomerContact, CreateContactInput } from '@/types/customer';

interface ContactModalProps {
  visible: boolean;
  customerId: string;
  contact?: CustomerContact | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  visible,
  customerId,
  contact,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!contact?.id;

  useEffect(() => {
    if (visible) {
      if (contact) {
        form.setFieldsValue({
          name: contact.name,
          position: contact.position,
          phone: contact.phone,
          email: contact.email,
          isPrimary: contact.isPrimary ?? false,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ isPrimary: false });
      }
    }
  }, [visible, contact, form]);

  const createMutation = useMutation({
    mutationFn: (values: CreateContactInput) =>
      customersService.createContact(customerId, values),
    onSuccess: () => {
      message.success('Thêm người liên hệ thành công');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi tạo liên hệ',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CreateContactInput) =>
      customersService.updateContact(customerId, contact!.id!, values),
    onSuccess: () => {
      message.success('Cập nhật người liên hệ thành công');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess();
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật liên hệ',
      );
    },
  });

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEditing) {
        updateMutation.mutate(values);
      } else {
        createMutation.mutate(values);
      }
    } catch {
      // Form validation failed
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEditing ? 'Chỉnh sửa người liên hệ' : 'Thêm người liên hệ mới'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={isLoading}
      okText={isEditing ? 'Lưu thay đổi' : 'Thêm liên hệ'}
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="name"
          label="Họ và tên"
          rules={[{ required: true, message: 'Vui lòng nhập tên người liên hệ' }]}
        >
          <Input placeholder="Ví dụ: Nguyễn Văn A" />
        </Form.Item>

        <Form.Item name="position" label="Chức danh / Vị trí">
          <Input placeholder="Ví dụ: Giám đốc kinh doanh, Kế toán trưởng..." />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Số điện thoại"
          rules={[
            {
              pattern: /^[0-9+()\-.\s]{8,20}$/,
              message: 'Số điện thoại không hợp lệ',
            },
          ]}
        >
          <Input placeholder="Ví dụ: 0912345678" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ type: 'email', message: 'Địa chỉ email không đúng định dạng' }]}
        >
          <Input placeholder="Ví dụ: contact@partner.vn" />
        </Form.Item>

        <Form.Item
          name="isPrimary"
          label="Đặt làm người liên hệ chính"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
