'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getStrongPasswordFormRules } from '@/lib/password-policy';
import type { UserProfile } from '@/types/auth';

const { Title, Text } = Typography;

interface ForceChangePasswordGateProps {
  user: UserProfile;
}

export function ForceChangePasswordGate({ user }: ForceChangePasswordGateProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setSubmitting(true);
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      try {
        const refreshedSession = await authService.login({
          email: user.email,
          password: values.newPassword,
        });
        queryClient.clear();
        setAuth(refreshedSession);
        message.success('Đổi mật khẩu thành công!');
      } catch {
        queryClient.clear();
        logout();
        message.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới.');
        router.replace('/login');
      }
    } catch (error: any) {
      message.error(error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors while signing out locally
    } finally {
      queryClient.clear();
      logout();
      router.replace('/login');
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-bg)] p-6">
      <Card
        className="w-full max-w-md shadow-md"
        styles={{ body: { padding: 28 } }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600">
            <SafetyCertificateOutlined />
          </span>
          <div>
            <Title level={4} className="!mb-0.5 text-slate-900">
              Đổi mật khẩu lần đầu
            </Title>
            <Text className="text-xs text-slate-500">{user.email}</Text>
          </div>
        </div>

        <Alert
          type="warning"
          showIcon
          className="mb-5"
          title="Yêu cầu cập nhật mật khẩu bảo mật"
          description="Tài khoản của bạn đang sử dụng mật khẩu khởi tạo. Vui lòng đổi sang mật khẩu cá nhân đủ mạnh trước khi sử dụng hệ thống."
        />

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu tạm thời hiện tại"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu tạm thời hiện tại"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              ...getStrongPasswordFormRules(true, 'Vui lòng nhập mật khẩu mới'),
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('currentPassword') !== value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại'),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Mật khẩu xác nhận không khớp'),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
            />
          </Form.Item>

          <Text className="mb-4 block text-xs text-slate-500">
            Yêu cầu: tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.
          </Text>

          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={submitting}
              className="skylux-primary-button"
            >
              Đổi mật khẩu và tiếp tục
            </Button>
            <Button
              type="text"
              block
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              disabled={submitting}
            >
              Đăng xuất
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
