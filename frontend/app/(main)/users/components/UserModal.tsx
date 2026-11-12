'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
  Divider,
  Typography,
} from 'antd';
import {
  CopyOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  IdcardOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { queryKeys } from '@/lib/query-keys';
import { useUserRoles } from '@/hooks/use-users';
import { useAuthStore } from '@/lib/stores/auth-store';
import { organizationsService } from '@/services/organizations.service';
import { getStrongPasswordFormRules } from '@/lib/password-policy';
import type { CreateUserResponse } from '@/types/user';

const { Text } = Typography;


export default function UserModal() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    fullName: string;
    temporaryPassword: string;
  } | null>(null);

  const { isUserModalOpen, editingUser, closeUserModal } = useRbacStore(
    useShallow((s) => ({
      isUserModalOpen: s.isUserModalOpen,
      editingUser: s.editingUser,
      closeUserModal: s.closeUserModal,
    })),
  );
  const isEditing = !!editingUser;
  const isSuperAdmin = useAuthStore((s) => Boolean(s.user?.roles?.includes('SUPER_ADMIN')));


  // 1. Fetch Roles for Selection
  const { data: rolesData } = useUserRoles('');
  const roles = (rolesData || []).filter((role) =>
    isSuperAdmin || ['OPERATOR', 'SALES'].includes(role.code),
  );
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', 'all'],
    queryFn: ({ signal }) => organizationsService.listOrganizations({ signal }),
    enabled: isSuperAdmin && isUserModalOpen && !isEditing,
  });

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
          roleIds: [],
        });
      }
    }
  }, [isUserModalOpen, editingUser, form]);

  // 2. Create or Update User Mutation
  const saveUserMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        fullName: values.fullName,
        email: values.email,
        employeeCode: values.employeeCode,
        phone: values.phone,
        avatarUrl: values.avatarUrl,
        departmentId: values.departmentId,
        roleIds: values.roleIds,
        status: values.status,
        ...(values.password ? { password: values.password } : {}),
      };

      if (isEditing && editingUser) {
        if (isSuperAdmin) {
          return usersService.updateCeo(editingUser.id, {
            fullName: payload.fullName,
            email: payload.email,
            employeeCode: payload.employeeCode,
            phone: payload.phone,
            avatarUrl: payload.avatarUrl,
            status: payload.status,
            ...(values.password ? { password: values.password } : {}),
          });
        }
        return usersService.updateUser(editingUser.id, payload);
      } else if (isSuperAdmin) {
        return usersService.createCeo({
          fullName: payload.fullName,
          email: payload.email,
          employeeCode: payload.employeeCode,
          phone: payload.phone,
          avatarUrl: payload.avatarUrl,
          status: payload.status,
          ...(values.password ? { password: values.password } : {}),
          organizationId: values.organizationId,
        });
      } else {
        return usersService.createUser(payload);
      }
    },
    onSuccess: (response: CreateUserResponse) => {
      message.success(
        isEditing
          ? isSuperAdmin ? 'Cập nhật CEO doanh nghiệp thành công' : 'Cập nhật thông tin người dùng thành công'
          : isSuperAdmin ? 'Tạo CEO doanh nghiệp thành công' : 'Tạo người dùng mới thành công',
      );
      closeUserModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      if (!isEditing && response?.temporaryPassword) {
        setGeneratedCredentials({
          email: response.email,
          fullName: response.fullName,
          temporaryPassword: response.temporaryPassword,
        });
      }
    },
    onError: (err: any) => {
      message.error(err.message || 'Có lỗi xảy ra khi lưu người dùng');
    },
  });

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        saveUserMutation.mutate(values);
      })
      .catch(() => {
        // Validation errors are rendered by AntD Form.Item
      });
  };

  return (
    <>
    <Modal
      title={
        <div className="text-base font-bold text-slate-800">
          {isEditing
            ? `${isSuperAdmin ? 'Chỉnh sửa CEO doanh nghiệp' : 'Chỉnh sửa nhân viên'}: ${editingUser.fullName}`
            : isSuperAdmin ? 'Tạo CEO doanh nghiệp' : 'Tạo người dùng / Nhân viên mới'}
        </div>
      }
      open={isUserModalOpen}
      onCancel={closeUserModal}
      onOk={handleOk}
      confirmLoading={saveUserMutation.isPending}
      okText={isEditing ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy"
      width={720}
      forceRender
      destroyOnHidden
      okButtonProps={{ className: 'bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-950)] border-none' }}
    >
      <Form
        form={form}
        layout="vertical"
        className="pt-4"
        requiredMark="optional"
      >
        {isSuperAdmin && !isEditing && (
          <Form.Item
            name="organizationId"
            label={<span className="font-medium text-slate-700">Doanh nghiệp</span>}
            rules={[{ required: true, message: 'Vui lòng chọn doanh nghiệp' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn doanh nghiệp để tạo CEO_ADMIN"
              options={organizations.map((organization) => ({
                label: organization.name,
                value: organization.id,
              }))}
            />
          </Form.Item>
        )}
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
                  {isEditing ? 'Mật khẩu mới (Nếu muốn đặt lại)' : 'Mật khẩu khởi tạo'}
                </span>
              }
              rules={getStrongPasswordFormRules(false)}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder={
                  isEditing
                    ? 'Để trống nếu không muốn đặt lại mật khẩu'
                    : 'Để trống để hệ thống tự sinh mật khẩu tạm ngẫu nhiên'
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
                  { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                  { label: 'Chưa kích hoạt (INACTIVE)', value: 'INACTIVE' },
                  { label: 'Đang bị khóa (LOCKED)', value: 'LOCKED' },
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

        {!isSuperAdmin && <>
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
                  options={roles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.id }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </>}
      </Form>
    </Modal>

    <Modal
      title="Thông tin đăng nhập tạm thời"
      open={Boolean(generatedCredentials)}
      onOk={() => setGeneratedCredentials(null)}
      onCancel={() => setGeneratedCredentials(null)}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="Đã ghi nhận"
      destroyOnHidden
    >
      {generatedCredentials && (
        <div className="space-y-3 pt-2">
          <Alert
            type="info"
            showIcon
            title="Mật khẩu tạm thời chỉ hiển thị một lần"
            description="Hãy sao chép và gửi cho nhân viên qua kênh an toàn. Nhân viên sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập lần đầu."
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <Text type="secondary">Nhân viên:</Text>{' '}
              <Text strong>{generatedCredentials.fullName}</Text>
            </div>
            <div className="mt-1">
              <Text type="secondary">Email:</Text>{' '}
              <Text code>{generatedCredentials.email}</Text>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <Text type="secondary">Mật khẩu tạm thời:</Text>{' '}
                <Text
                  code
                  strong
                  data-testid="generated-temp-password"
                  className="text-base"
                >
                  {generatedCredentials.temporaryPassword}
                </Text>
              </div>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(
                      generatedCredentials.temporaryPassword,
                    );
                    message.success('Đã sao chép mật khẩu tạm thời');
                  } catch {
                    message.warning('Không thể tự động sao chép, vui lòng copy thủ công');
                  }
                }}
              >
                Sao chép
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}
