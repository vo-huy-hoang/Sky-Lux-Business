'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { queryKeys } from '@/lib/query-keys';

export default function RoleModal() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { isRoleModalOpen, editingRole, closeRoleModal } = useRbacStore(
    useShallow((s) => ({
      isRoleModalOpen: s.isRoleModalOpen,
      editingRole: s.editingRole,
      closeRoleModal: s.closeRoleModal,
    })),
  );

  useEffect(() => {
    if (isRoleModalOpen) {
      if (editingRole) {
        form.setFieldsValue({
          code: editingRole.code,
          name: editingRole.name,
          description: editingRole.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [isRoleModalOpen, editingRole, form]);

  const saveRoleMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editingRole) {
        return rbacService.updateRole(editingRole.id, values);
      } else {
        return rbacService.createRole(values);
      }
    },
    onSuccess: () => {
      message.success(
        editingRole
          ? 'Cập nhật vai trò thành công'
          : 'Tạo vai trò mới thành công',
      );
      closeRoleModal();
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.roles() });
    },

    onError: (err: any) => {
      message.error(err.message || 'Thao tác thất bại');
    },
  });

  return (
    <Modal
      title={
        editingRole ? `Chỉnh sửa vai trò: ${editingRole.name}` : 'Tạo vai trò mới'
      }
      open={isRoleModalOpen}
      onCancel={closeRoleModal}
      onOk={() => form.submit()}
      confirmLoading={saveRoleMutation.isPending}
      okText={editingRole ? 'Lưu thay đổi' : 'Tạo vai trò'}
      cancelText="Hủy"
      forceRender
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveRoleMutation.mutate(values)}
        className="pt-3"
      >
        {!editingRole && (
          <Form.Item
            name="code"
            label={<span className="font-medium">Mã vai trò (Code)</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập mã vai trò' },
              {
                pattern: /^[A-Z0-9_]+$/,
                message:
                  'Chỉ chữ hoa, số và gạch dưới (VD: SALES_LEAD)',
              },
            ]}
            extra="Mã định danh duy nhất trong tổ chức (không thể đổi sau khi tạo)"
          >
            <Input placeholder="VD: SALES_LEAD" />
          </Form.Item>
        )}

        <Form.Item
          name="name"
          label={<span className="font-medium">Tên hiển thị của vai trò</span>}
          rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
        >
          <Input placeholder="VD: Trưởng nhóm Kinh Doanh" />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span className="font-medium">Mô tả</span>}
        >
          <Input.TextArea
            rows={3}
            placeholder="Mô tả phạm vi trách nhiệm và quyền hạn..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
