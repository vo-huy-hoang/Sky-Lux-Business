'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Form,
  Input,
  Button,
  Checkbox,
  Typography,
  App,
  Divider,
  Spin,
  Alert,
} from 'antd';
import {
  MailOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ArrowRightOutlined,
  LineChartOutlined,
  GlobalOutlined,
  SendOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoginResponse } from '@/types/auth';

const { Title, Text } = Typography;

function LoginLogo() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <Image
        src="/logo/logo.png"
        alt="SkyLux Travel"
        width={178}
        height={148}
        className="h-[148px] w-[178px] object-contain"
        onError={() => setFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full border border-[#D6A51F]/80 text-center text-[#F0C020]">
      <div>
        <div className="text-2xl font-bold leading-none">SKYLUX</div>
        <div className="mt-1 text-[11px] font-semibold">TRAVEL</div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const lockoutSeconds = useAuthStore((state) => state.lockoutSeconds);
  const setLockoutSeconds = useAuthStore((state) => state.setLockoutSeconds);
  const decrementLockoutSeconds = useAuthStore(
    (state) => state.decrementLockoutSeconds,
  );

  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      decrementLockoutSeconds();
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds, decrementLockoutSeconds]);

  const handleSubmit = async (values: any) => {
    if (lockoutSeconds > 0) return;
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
      if (err.status === 429 || err.isRateLimited) {
        const seconds = err.lockoutSeconds || 60;
        setLockoutSeconds(seconds);
        message.warning(
          err.message ||
            `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
        );
      } else {
        message.error(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div className="mb-9">
        <Title level={2} style={{ marginBottom: 10, color: '#003828' }}>
          Đăng nhập hệ thống
        </Title>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          Vui lòng nhập thông tin để tiếp tục
        </Text>
      </div>

      {lockoutSeconds > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined className="text-amber-600 animate-spin" />}
          message="Tài khoản tạm thời bị giới hạn đăng nhập"
          description={
            <span>
              Phát hiện nhiều lượt đăng nhập thất bại liên tiếp. Vui lòng thử lại sau{' '}
              <strong className="text-amber-900 font-bold">{lockoutSeconds} giây</strong>.
            </span>
          }
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50"
        />
      )}


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
          label={<span className="font-medium text-slate-900">Email</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
        >
          <Input
            prefix={<MailOutlined className="text-slate-400 mr-1" />}
            placeholder="Nhập email của bạn"
            autoComplete="email"
            className="h-14 rounded-lg"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className="font-medium text-slate-900">Mật khẩu</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-slate-400 mr-1" />}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className="h-14 rounded-lg"
            iconRender={(visible) =>
              visible ? <EyeTwoTone twoToneColor="#9CA3AF" /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>

        <Form.Item name="remember" valuePropName="checked" className="mb-5">
          <Checkbox className="text-sm text-slate-700">
            Ghi nhớ đăng nhập
          </Checkbox>
        </Form.Item>

        <Form.Item className="mb-6">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={lockoutSeconds > 0}
            block
            iconPlacement="end"
            icon={!loading && lockoutSeconds <= 0 ? <ArrowRightOutlined /> : undefined}
            className="skylux-primary-button h-14 text-base font-semibold"
          >
            {loading
              ? 'Đang xác thực...'
              : lockoutSeconds > 0
                ? `Tạm khóa đăng nhập (${lockoutSeconds}s)`
                : 'Đăng nhập'}
          </Button>

        </Form.Item>
      </Form>

      <Divider style={{ margin: '22px 0', borderColor: '#E8E8E8' }}>
        <span className="text-sm text-slate-400">hoặc</span>
      </Divider>

      <div className="flex items-center justify-between gap-4 text-sm font-medium">
        <a
          className="text-[#00543D] hover:text-[#007A55]"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            message.info('Vui lòng liên hệ Admin để đặt lại mật khẩu.');
          }}
        >
          Quên mật khẩu?
        </a>
        <a className="inline-flex items-center gap-2 text-[#00543D] hover:text-[#007A55]" href="#">
          Đăng ký tài khoản <ArrowRightOutlined />
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#F8F8F8] px-5 py-8">
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <div className="absolute -left-14 bottom-10 h-52 w-80 rounded-[50%] border border-[#003828]" />
        <div className="absolute right-12 top-8 h-20 w-20 rounded-full border border-dashed border-[#003828]" />
        <SendOutlined className="absolute bottom-24 left-[12%] rotate-[-18deg] text-6xl text-[#003828]" />
        <GlobalOutlined className="absolute bottom-12 right-[10%] text-8xl text-[#003828]" />
      </div>

      <div className="skylux-card relative grid min-h-[720px] w-full max-w-[1400px] overflow-hidden bg-white md:grid-cols-[48%_52%]">
        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#003828,#003020)] px-8 py-10 text-white md:px-14 md:py-14">
          <LoginLogo />

          <div className="mt-10 max-w-[430px]">
            <Text className="text-xl text-white/78">Chào mừng bạn đến với</Text>
            <Title level={1} style={{ color: '#FFFFFF', margin: '8px 0 6px', fontSize: 40 }}>
              SkyLux Travel
            </Title>
            <Text className="text-lg text-white/70">
              Phần mềm quản trị nội bộ dành cho Sales
            </Text>
            <div className="mt-6 h-[2px] w-16 bg-[#D6A51F]" />
            <p className="mt-7 text-[16px] leading-7 text-white/78">
              Nền tảng quản lý toàn diện giúp đội ngũ Sales vận hành hiệu quả,
              theo dõi doanh thu, xử lý khách hàng và chốt tour nhanh chóng.
            </p>
          </div>

          <div className="absolute bottom-11 left-8 right-8 rounded-xl border border-white/12 bg-white/[0.05] p-6 text-white/35 md:left-14 md:right-14">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
            </div>
            <LineChartOutlined className="text-7xl" />
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="h-14 rounded-lg bg-white/10" />
              <div className="h-14 rounded-lg bg-white/10" />
              <div className="h-14 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 py-10 md:px-20">
          <Suspense
            fallback={
              <div className="p-12 text-center">
                <Spin size="large" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-24 flex items-center justify-between border-t border-[#E8E8E8] pt-8 text-xs text-slate-500">
            <span>© 2025 SkyLux Travel. All rights reserved.</span>
            <span>Phiên bản 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
