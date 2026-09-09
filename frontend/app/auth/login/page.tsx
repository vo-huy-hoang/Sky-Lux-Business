'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Form,
  Input,
  Button,
  Checkbox,
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
  RightOutlined,
} from '@ant-design/icons';

import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/lib/stores/auth-store';

function LoginLogo() {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <div className="relative h-[130px] w-[130px]">
        <Image
          src="/logo/logo.png"
          alt="SkyLux Travel"
          width={130}
          height={130}
          className="h-full w-full object-contain drop-shadow-md"
          onError={() => setFailed(true)}
          unoptimized
          priority
        />
      </div>
    );
  }

  return (
    <div className="flex h-[130px] w-[130px] items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#0A3324] text-center shadow-lg">
      <div>
        <div className="text-xl font-bold tracking-wider text-[#F0C020]">SKYLUX</div>
        <div className="mt-0.5 text-[10px] font-semibold tracking-widest text-[#D4AF37]">
          TRAVEL
        </div>
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative mt-8 rounded-2xl border border-[#164E3A] bg-[#0A3425]/90 p-5 shadow-2xl backdrop-blur-md">
      {/* Top window dots and header icons */}
      <div className="flex items-center justify-between pb-3 border-b border-[#134935]/80">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2A7558]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2A7558]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2A7558]" />
        </div>
        <div className="flex items-center gap-2 text-emerald-400/40">
          <span className="h-2 w-2 rounded-full bg-emerald-400/50" />
          <span className="h-4 w-4 rounded-full border border-emerald-400/30" />
        </div>
      </div>

      {/* Middle dashboard contents */}
      <div className="grid grid-cols-12 gap-3 py-4 items-center">
        {/* Line chart widget */}
        <div className="col-span-7 rounded-lg bg-[#07281C]/90 p-3 border border-[#124231]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-emerald-300/60">Doanh thu tour</span>
            <span className="text-[10px] font-bold text-emerald-400">+24.8%</span>
          </div>
          <svg viewBox="0 0 160 50" className="w-full h-10 overflow-visible">
            <path
              d="M 0,40 Q 30,35 50,22 T 100,28 T 150,8"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 0,40 Q 30,35 50,22 T 100,28 T 150,8 L 150,50 L 0,50 Z"
              fill="url(#greenGradient)"
              opacity="0.25"
            />
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="150" cy="8" r="3" fill="#34D399" />
          </svg>
        </div>

        {/* Circular Progress & Metrics */}
        <div className="col-span-5 flex flex-col gap-2">
          <div className="rounded-lg bg-[#07281C]/90 p-2.5 border border-[#124231] flex items-center gap-2.5">
            <div className="relative h-7 w-7 rounded-full border-2 border-emerald-500 flex items-center justify-center text-[9px] font-bold text-emerald-300">
              78%
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-full rounded bg-emerald-950">
                <div className="h-full w-[78%] rounded bg-emerald-500" />
              </div>
              <span className="text-[9px] text-emerald-300/60 mt-1 block">Chỉ tiêu KPI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 stat cards */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <div className="h-12 rounded-lg bg-[#07281C]/90 border border-[#124231] p-2 flex flex-col justify-center">
          <span className="text-[9px] text-emerald-300/60 leading-none">Hồ sơ mới</span>
          <span className="text-xs font-bold text-white mt-1">128</span>
        </div>
        <div className="h-12 rounded-lg bg-[#07281C]/90 border border-[#124231] p-2 flex flex-col justify-center">
          <span className="text-[9px] text-emerald-300/60 leading-none">Khách hàng</span>
          <span className="text-xs font-bold text-white mt-1">1,420</span>
        </div>
        <div className="h-12 rounded-lg bg-[#07281C]/90 border border-[#124231] p-2 flex flex-col justify-center">
          <span className="text-[9px] text-emerald-300/60 leading-none">Tỷ lệ chốt</span>
          <span className="text-xs font-bold text-emerald-400 mt-1">94.2%</span>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
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
      const response = await authService.login({
        email: values.email,
        password: values.password,
      });

      queryClient.clear();
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
    <div className="w-full max-w-[420px] mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl md:text-[28px] font-bold text-[#06281B] tracking-tight mb-2">
          Đăng nhập hệ thống
        </h2>
        <p className="text-slate-500 text-sm font-normal">
          Vui lòng nhập thông tin để tiếp tục
        </p>
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
        className="space-y-4"
      >
        <Form.Item
          name="email"
          label={<span className="text-slate-700 text-sm font-medium">Email</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập email của bạn' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
          className="mb-4"
        >
          <Input
            prefix={<MailOutlined className="text-slate-400 mr-2 text-base" />}
            placeholder="Nhập email của bạn"
            autoComplete="email"
            className="h-12 rounded-lg border-slate-200 hover:border-[#073323] focus:border-[#073323] text-sm text-slate-800 placeholder:text-slate-400 shadow-sm"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className="text-slate-700 text-sm font-medium">Mật khẩu</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
          ]}
          className="mb-4"
        >
          <Input.Password
            prefix={<LockOutlined className="text-slate-400 mr-2 text-base" />}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className="h-12 rounded-lg border-slate-200 hover:border-[#073323] focus:border-[#073323] text-sm text-slate-800 placeholder:text-slate-400 shadow-sm"
            iconRender={(visible) =>
              visible ? (
                <EyeTwoTone twoToneColor="#10B981" />
              ) : (
                <EyeInvisibleOutlined className="text-slate-400" />
              )
            }
          />
        </Form.Item>

        <div className="flex items-center justify-between pb-1">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-slate-600 text-sm select-none">
              Ghi nhớ đăng nhập
            </Checkbox>
          </Form.Item>
        </div>

        <Form.Item className="pt-2 mb-4">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={lockoutSeconds > 0}
            block
            className="h-12 rounded-lg bg-[#063826] hover:bg-[#084D34] active:bg-[#052C1E] border-none text-white font-semibold text-base shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            {!loading && <ArrowRightOutlined className="text-sm" />}
          </Button>

        </Form.Item>
      </Form>

      <div className="relative my-6 flex items-center justify-center">
        <Divider className="my-0 border-slate-200">
          <span className="text-slate-400 text-xs px-2 font-normal">hoặc</span>
        </Divider>
      </div>

      <div className="flex items-center justify-between text-sm pt-1">
        <a
          className="text-[#074D34] hover:text-[#0A6B48] font-medium transition-colors"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            message.info(
              'Tài khoản demo: admin@skylux.vn / Admin@123456 hoặc sales@skylux.vn / Sales@123456',
            );
          }}
        >
          Quên mật khẩu?
        </a>
        <a
          className="inline-flex items-center gap-1 text-[#074D34] hover:text-[#0A6B48] font-medium transition-colors"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            message.info('Vui lòng liên hệ Quản trị viên để được cấp tài khoản nhân viên.');
          }}
        >
          <span>Đăng ký tài khoản</span>
          <RightOutlined className="text-[11px]" />
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#F3F5F4] px-4 py-8 sm:px-6 lg:px-8">
      {/* Background Travel Vector Watermarks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <svg
          className="absolute -top-24 -left-24 w-[600px] h-[600px] text-[#06281B]"
          fill="none"
          viewBox="0 0 400 400"
        >
          <circle cx="200" cy="200" r="180" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
          <circle cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1.5" />
          <path d="M50 200 Q 200 80 350 200" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
        </svg>
        <svg
          className="absolute -bottom-20 -right-20 w-[500px] h-[500px] text-[#06281B]"
          fill="none"
          viewBox="0 0 300 300"
        >
          <circle cx="150" cy="150" r="140" stroke="currentColor" strokeWidth="2" />
          <circle cx="150" cy="150" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Main Login Card Wrapper */}
      <div className="relative z-10 w-full max-w-[1240px] rounded-[28px] md:rounded-[36px] bg-white shadow-2xl shadow-emerald-950/10 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-[48%_52%] min-h-[680px]">
        {/* Left Hero Banner */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#06281B] p-8 sm:p-10 md:p-12 lg:p-14 text-white">
          {/* Subtle Ambient Background Watermarks inside the banner */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Airplane with dotted flight curve */}
            <svg
              className="absolute top-10 right-8 w-44 h-44 text-emerald-500/10"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            {/* Globe latitude lines watermark */}
            <svg
              className="absolute -bottom-16 -right-16 w-80 h-80 text-emerald-400/[0.06]"
              fill="none"
              viewBox="0 0 200 200"
            >
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="2" />
              <ellipse cx="100" cy="100" rx="90" ry="40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="1.5" />
              <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <LoginLogo />

            {/* Headings */}
            <div className="mt-8 sm:mt-10">
              <span className="block text-sm sm:text-base font-normal text-[#78A996] tracking-wide mb-1">
                Chào mừng bạn đến với
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-[42px] font-bold text-white tracking-tight leading-tight mb-2 font-sans">
                SkyLux Travel
              </h1>
              <p className="text-sm sm:text-base font-normal text-[#6CA08B] mb-0">
                Phần mềm quản trị nội bộ dành cho Sales
              </p>

              {/* Golden Accent Line */}
              <div className="h-[2.5px] w-14 bg-[#D4AF37] rounded-full my-5" />

              {/* Description Paragraph */}
              <p className="text-sm sm:text-[15px] font-normal leading-relaxed text-[#D2E3DC] max-w-[440px]">
                Nền tảng quản lý toàn diện giúp đội ngũ Sales vận hành hiệu quả,
                theo dõi doanh thu, xử lý khách hàng và chốt tour nhanh chóng.
              </p>
            </div>
          </div>

          {/* Interactive / Visual Dashboard Mockup Card */}
          <div className="relative z-10 pt-4">
            <DashboardMockup />
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex flex-col justify-between p-8 sm:p-10 md:p-14 lg:p-16 bg-white">
          <div className="flex-1 flex items-center justify-center">
            <Suspense
              fallback={
                <div className="p-12 text-center">
                  <Spin size="large" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          {/* Bottom copyright and version */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 text-xs text-slate-400 gap-2">
            <span>© 2025 SkyLux Travel. All rights reserved.</span>
            <span>Phiên bản 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
