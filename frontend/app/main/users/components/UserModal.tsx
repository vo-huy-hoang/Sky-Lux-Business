'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
  Divider,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  IdcardOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { rbacService } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { UserStatus } from '@/types/user';

export default function UserModal() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { isUserModalOpen, editingUser, closeUserModal } = useRbacStore();
  const isEditing = !!editingUser;

  // 1. Fetch Roles for Selection
  const { data: rolesData } = useQuery({
    queryKey: ['roles', ''],
    queryFn: () => rbacService.getRoles({ search: '' }),
  });
  const roles = rolesData?.items || [];

  // Reset/Set Form Values on Open
  useEffect(() => {
    if (isUserModalOpen) {
      if (editingUser) {
        form.setFieldsValue({
          fullName: editingUser.fullName,
          email: editingUser.email,
          employeeCode: editingUser.employeeCode,
          phone: editingUser.phone,
          avatarUrl: editingUser.avatarUrl,
          departmentId: editingUser.departmentId,
          roleIds: editingUser.roles?.map((r) => r.id) || [],
          status: editingUser.status,
          password: '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'ACTIVE',
        });
      }
    }
  }, [isUserModalOpen, editingUser, form]);

  // Mutation: Create or Update User
  const saveUserMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload: any = {
        fullName: values.fullName?.trim(),
        email: values.email?.trim(),
        phone: values.phone?.trim() || undefined,
        avatarUrl: values.avatarUrl?.trim() || undefined,
        roleIds: values.roleIds,
        status: values.status as UserStatus,
      };

      if (values.employeeCode?.trim()) {
        payload.employeeCode = values.employeeCode.trim();
      }

      if (values.password?.trim()) {
        payload.password = values.password.trim();
      }

      if (isEditing && editingUser) {
        return usersService.updateUser(editingUser.id, payload);
      } else {
        return usersService.createUser(payload);
      }
    },
    onSuccess: () => {
      message.success(
        isEditing
          ? 'Cập nhật thông tin người dùng thành công'
          : 'Tạo người dùng mới thành công',
      );
      closeUserModal();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Có lỗi xảy ra khi lưu người dùng');
    },
  });

  const handleOk = () => {
    form.validateFields().then((values) => {
      saveUserMutation.mutate(values);
    });
  };

  return (
    <Modal
      title={
        <div className="text-base font-bold text-slate-800">
          {isEditing
            ? `Chỉnh sửa nhân viên: ${editingUser.fullName}`
            : 'Tạo người dùng / Nhân viên mới'}
        </div>
      }
      open={isUserModalOpen}
      onCancel={closeUserModal}
      onOk={handleOk}
      confirmLoading={saveUserMutation.isPending}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy"
      width={720}
      destroyOnClose
      okButtonProps={{ className: 'bg-[#0A2540] hover:bg-[#133E68] border-none' }}
    >
      <Form
        form={form}
        layout="vertical"
        className="pt-4"
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="fullName"
              label={<span className="font-medium text-slate-700">Họ và tên</span>}
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
            >
              <Input
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="VD: Nguyễn Văn A"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="email"
              label={<span className="font-medium text-slate-700">Email công việc</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-400" />}
                placeholder="VD: anbv@skylux.vn"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="employeeCode"
              label={<span className="font-medium text-slate-700">Mã nhân viên</span>}
            >
              <Input
                prefix={<IdcardOutlined className="text-slate-400" />}
                placeholder="Để trống để tự động sinh mã"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="phone"
              label={<span className="font-medium text-slate-700">Số điện thoại</span>}
            >
              <Input
                prefix={<PhoneOutlined className="text-slate-400" />}
                placeholder="VD: 0912 345 678"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="password"
              label={
                <span className="font-medium text-slate-700">
                  {isEditing ? 'Mật khẩu mới (Nếu muốn đổi)' : 'Mật khẩu khởi tạo'}
                </span>
              }
              rules={[
                {
                  min: 6,
                  message: 'Mật khẩu phải có ít nhất 6 ký tự',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder={
                  isEditing
                    ? 'Để trống nếu không muốn đổi mật khẩu'
                    : 'Mặc định: SkyLux@123 nếu để trống'
                }
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="status"
              label={<span className="font-medium text-slate-700">Trạng thái</span>}
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select
                options={[
                  { label: '🟢 Hoạt động (ACTIVE)', value: 'ACTIVE' },
                  { label: '⚪ Chưa kích hoạt (INACTIVE)', value: 'INACTIVE' },
                  { label: '🔴 Đang bị khóa (LOCKED)', value: 'LOCKED' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="avatarUrl"
              label={<span className="font-medium text-slate-700">Đường dẫn ảnh đại diện (URL)</span>}
            >
              <Input
                prefix={<PictureOutlined className="text-slate-400" />}
                placeholder="https://..."
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider className="my-3" />

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="roleIds"
              label={<span className="font-medium text-slate-700">Gán vai trò (Roles)</span>}
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="Chọn một hoặc nhiều vai trò..."
                options={roles.map((r) => ({
                  label: `${r.name} (${r.code})`,
                  value: r.id,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
