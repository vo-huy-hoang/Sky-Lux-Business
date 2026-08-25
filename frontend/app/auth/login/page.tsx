'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Card,
  Typography,
  message,
  Tag,
  Divider,
  Spin,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoginResponse } from '@/types/auth';

const { Title, Text } = Typography;

function LoginForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post<any, LoginResponse>(
        '/auth/login',
        {
          email: values.email,
          password: values.password,
        },
      );

      setAuth(response);
      message.success(`Chào mừng ${response.user.fullName} quay trở lại!`);

      const redirectPath = searchParams.get('redirect') || '/main/dashboard';
      router.push(redirectPath);
    } catch (err: any) {
      message.error(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    form.setFieldsValue({
      email: 'admin@skylux.vn',
      password: 'Admin@123456',
    });
  };

  return (
    <Card
      className="shadow-2xl border-slate-700/50 backdrop-blur-xl bg-white/95"
      styles={{ body: { padding: '36px 32px' } }}
    >
      <div className="mb-6">
        <Title level={4} style={{ marginBottom: 4, color: '#0F172A' }}>
          Đăng nhập tài khoản
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Nhập email công việc và mật khẩu để tiếp tục
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          name="email"
          label={<span className="text-slate-700 font-medium">Email</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-slate-400 mr-1" />}
            placeholder="name@skylux.vn"
            autoComplete="email"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={
            <div className="flex justify-between items-center w-full">
              <span className="text-slate-700 font-medium">Mật khẩu</span>
              <a
                className="text-xs text-blue-600 hover:text-blue-700"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  message.info('Vui lòng liên hệ Admin để đặt lại mật khẩu.');
                }}
              >
                Quên mật khẩu?
              </a>
            </div>
          }
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-slate-400 mr-1" />}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked" className="mb-4">
          <Checkbox className="text-slate-600 text-xs">
            Ghi nhớ đăng nhập trên thiết bị này
          </Checkbox>
        </Form.Item>

        <Form.Item className="mb-2">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            className="h-11 font-semibold text-base bg-[#0A2540] hover:bg-[#133E68] border-none shadow-md"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </Form.Item>
      </Form>

      <Divider style={{ margin: '20px 0', borderColor: '#E2E8F0' }}>
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          Tài khoản dùng thử
        </span>
      </Divider>

      {/* Quick Demo Login Pill */}
      <div
        onClick={handleFillDemoAdmin}
        className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/70 hover:bg-blue-100/70 cursor-pointer transition-all duration-200"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shadow-sm">
            <ThunderboltOutlined />
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-800">
              Tài khoản Quản trị SuperAdmin
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              admin@skylux.vn
            </div>
          </div>
        </div>
        <Tag color="blue" className="mr-0 text-[11px] font-medium">
          Bấm để điền
        </Tag>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#071728] via-[#0A2540] to-[#133E68] p-4 relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-[440px] z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#0A2540] shadow-xl shadow-amber-500/20 mb-3">
            <CompassOutlined style={{ fontSize: 28 }} />
          </div>
          <Title
            level={2}
            style={{
              color: '#FFFFFF',
              marginBottom: 4,
              letterSpacing: '-0.02em',
            }}
          >
            SKY-LUX CRM
          </Title>
          <Text style={{ color: '#94A3B8', fontSize: 14 }}>
            Hệ thống Quản trị Điều hành & Báo giá Tour Du lịch
          </Text>
        </div>

        {/* Form wrapped in Suspense for Next.js SSR */}
        <Suspense
          fallback={
            <div className="p-12 text-center bg-white rounded-2xl">
              <Spin size="large" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-slate-400 text-xs">
          <SafetyCertificateOutlined className="text-emerald-400" />
          <span>Hệ thống bảo mật chuẩn SSL & JWT RBAC</span>
        </div>
      </div>
    </div>
  );
}
