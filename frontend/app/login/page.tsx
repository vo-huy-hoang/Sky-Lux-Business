'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ClockCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  RiseOutlined,
} from '@ant-design/icons';

import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/lib/stores/auth-store';
import { BrandLogo } from '@/components/ui';

function LoginLogo() {
  return (
    <div className="relative inline-block select-none">
      <BrandLogo variant="full" size="xl" theme="dark" asLink={true} href="/" priority />
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

      const redirectPath = searchParams.get('redirect') || '/dashboard';
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
        <h2 className="text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight mb-2">
          Đăng nhập hệ thống
        </h2>
        <p className="text-slate-500 text-sm font-normal">
          Vui lòng nhập tài khoản doanh nghiệp của bạn để tiếp tục
        </p>
      </div>

      {lockoutSeconds > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined className="text-amber-600 animate-spin" />}
          title="Tài khoản tạm thời bị giới hạn đăng nhập"
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
          label={<span className="text-slate-700 text-sm font-medium">Email công vụ</span>}
          rules={[
            { required: true, message: 'Vui lòng nhập email của bạn' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
          className="mb-4"
        >
          <Input
            prefix={<MailOutlined className="text-slate-400 mr-2 text-base" />}
            placeholder="name@company.com"
            autoComplete="email"
            className="h-12 rounded-lg border-slate-200 hover:border-[var(--color-primary-700)] focus:border-[var(--color-primary-700)] text-sm text-slate-800 placeholder:text-slate-400 shadow-xs"
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
            placeholder="Nhập mật khẩu truy cập"
            autoComplete="current-password"
            className="h-12 rounded-lg border-slate-200 hover:border-[var(--color-primary-700)] focus:border-[var(--color-primary-700)] text-sm text-slate-800 placeholder:text-slate-400 shadow-xs"
            iconRender={(visible) =>
              visible ? (
                <EyeTwoTone twoToneColor="#075440" />
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
            className="h-12 rounded-lg bg-[var(--color-primary-950)] hover:bg-[var(--color-primary-850)] active:bg-[var(--color-primary-950)] border-none text-white font-semibold text-base shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
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
          className="text-[var(--color-primary-800)] hover:text-[var(--color-primary-700)] font-medium transition-colors"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            message.info('Vui lòng liên hệ Quản trị viên để đặt lại mật khẩu.');
          }}
        >
          Quên mật khẩu?
        </a>
        <a
          className="inline-flex items-center gap-1 text-[var(--color-primary-800)] hover:text-[var(--color-primary-700)] font-medium transition-colors"
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
    <div className="min-h-[100dvh] w-full grid grid-cols-1 lg:grid-cols-12 bg-white">
      {/* Left Brand & Hero Column (Full Height Edge-to-Edge) */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[var(--color-primary-950)] p-8 sm:p-12 lg:p-16 text-white lg:col-span-6 xl:col-span-7">
        {/* Subtle Ambient Geographic & Flight Vector Watermarks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.05]">
          {/* Orbital Tech Network Circle (Chữ O công nghệ) */}
          <svg
            className="absolute -top-16 -left-16 w-[620px] h-[620px] text-white"
            fill="none"
            viewBox="0 0 400 400"
          >
            <circle cx="200" cy="200" r="170" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
            <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="1" />
            <circle cx="200" cy="200" r="60" fill="currentColor" fillOpacity="0.2" />
            {/* Tech nodes */}
            <circle cx="80" cy="200" r="7" fill="currentColor" />
            <circle cx="320" cy="200" r="7" fill="currentColor" />
            <circle cx="200" cy="80" r="7" fill="currentColor" />
            <circle cx="200" cy="320" r="7" fill="currentColor" />
            <circle cx="115" cy="115" r="5" fill="currentColor" />
            <circle cx="285" cy="285" r="5" fill="currentColor" />
          </svg>

          {/* Upward Flight Path (Mũi tên vàng chuyển động vươn xa) */}
          <svg
            className="absolute -bottom-24 -right-24 w-[580px] h-[580px] text-white"
            fill="none"
            viewBox="0 0 300 300"
          >
            <path
              d="M60 220 C 100 240, 160 210, 150 150 C 140 100, 200 80, 260 50"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <path
              d="M250 45 L 265 48 L 260 62 Z"
              fill="currentColor"
            />
            <circle cx="150" cy="150" r="130" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Top Header: Logo & Brand Classification */}
        <div className="relative z-10">
          <LoginLogo />
        </div>

        {/* Center Presentation: Authentic Brand Story & Core Promise */}
        <div className="relative z-10 my-auto py-8 lg:py-12 max-w-[580px]">
          {/* Brand Concept Label */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs font-semibold tracking-wider text-emerald-200/90 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
            <span>OPTRIP Platform • One Platform. Every Trip.</span>
          </div>

          {/* Main Headline: Brand Core Message */}
          <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-bold text-white tracking-tight leading-[1.2] mb-4 font-sans">
            Một nền tảng thống nhất. <br />
            <span className="text-[var(--color-gold)]">Quản trị mọi hành trình.</span>
          </h1>

          {/* Official Brand Narrative */}
          <p className="text-sm sm:text-base font-normal leading-relaxed text-emerald-100/85 mb-8 max-w-[540px]">
            Hệ sinh thái công nghệ thông minh kết nối toàn diện từ tiếp nhận khách hàng, báo giá, đặt dịch vụ, điều hành tour đến quyết toán tài chính — giúp doanh nghiệp lữ hành đơn giản hóa quản lý, tối ưu vận hành và bứt phá vươn xa.
          </p>

          {/* 3 Pillars directly mapped to the 3 Logo Components */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* Pillar 1: Chữ O - Vận hành khép kín */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2 mb-1.5 text-[var(--color-gold)]">
                <SyncOutlined className="text-sm" />
                <span className="text-xs font-semibold text-white">Vận hành khép kín</span>
              </div>
              <p className="text-[11px] text-emerald-100/70 leading-normal m-0">
                Biểu tượng chữ O kết nối kinh doanh, booking, điều hành, nhà cung cấp và tài chính.
              </p>
            </div>

            {/* Pillar 2: Mũi tên vàng - Tốc độ & Vươn xa */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2 mb-1.5 text-[var(--color-gold)]">
                <RiseOutlined className="text-sm" />
                <span className="text-xs font-semibold text-white">Tốc độ & Vươn xa</span>
              </div>
              <p className="text-[11px] text-emerald-100/70 leading-normal m-0">
                Mũi tên vàng hướng lên đại diện cho tự động hóa, tốc độ xử lý và khát vọng tăng trưởng.
              </p>
            </div>

            {/* Pillar 3: Nền tảng SaaS tin cậy */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3.5 backdrop-blur-xs">
              <div className="flex items-center gap-2 mb-1.5 text-[var(--color-gold)]">
                <SafetyCertificateOutlined className="text-sm" />
                <span className="text-xs font-semibold text-white">Nền tảng tin cậy</span>
              </div>
              <p className="text-[11px] text-emerald-100/70 leading-normal m-0">
                Phần mềm quản trị B2B chuyên nghiệp, ổn định, chính xác và bảo mật đa tầng.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Slogan Banner */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/[0.1] pt-6 text-xs text-emerald-200/70">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
            <span className="font-medium text-emerald-100">
              Kết nối vận hành – Tối ưu quản trị – Vươn xa cùng công nghệ
            </span>
          </div>
        </div>
      </div>

      {/* Right Form Column (Full Height Edge-to-Edge) */}
      <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 bg-white lg:col-span-6 xl:col-span-5 min-h-[100dvh]">
        {/* Mobile-only brand logo display */}
        <div className="lg:hidden mb-8">
          <BrandLogo variant="full" size="lg" theme="light" asLink={true} href="/" priority />
        </div>

        <div className="flex-1 flex items-center justify-center my-auto w-full">
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
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 text-xs text-slate-400 gap-2">
          <span>© 2026 OPTRIP Platform. All rights reserved.</span>
          <span className="font-mono">Phiên bản 1.0.0</span>
        </div>
      </div>
    </div>
  );
}
