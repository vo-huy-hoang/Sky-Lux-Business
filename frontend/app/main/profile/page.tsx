'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Statistic,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CheckOutlined,
  EditOutlined,
  FolderOpenOutlined,
  KeyOutlined,
  LockOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authService,
  AuthMeResponse,
  UpdateUserSettingsPayload,
} from '@/services/auth.service';
import { kpiService, MyKpiItem } from '@/services/kpi.service';
import { dossiersService } from '@/services/dossiers.service';
import { DossierItem } from '@/types/dossier';
import { UserProfile } from '@/types/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/financial-calculations';

const { Title, Text } = Typography;

const defaultNotificationSettings = {
  taskAssignments: false,
  dossierUpdates: false,
  appointmentReminders: false,
  periodicReports: false,
};

const notificationSettingDefinitions = [
  ['taskAssignments', 'Thông báo công việc mới', 'Nhận thông báo khi có công việc mới được giao'],
  ['dossierUpdates', 'Thông báo hồ sơ cần cập nhật', 'Nhận thông báo khi hồ sơ có cập nhật'],
  ['appointmentReminders', 'Nhắc lịch hẹn', 'Nhận nhắc nhở trước lịch hẹn'],
  ['periodicReports', 'Báo cáo định kỳ', 'Nhận báo cáo hiệu suất định kỳ'],
] as const;

function normalizeProfile(profile: AuthMeResponse): UserProfile {
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    organizationName: profile.organization?.name,
    departmentId: profile.departmentId,
    departmentName: profile.department?.name,
    employeeCode: profile.employeeCode,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    roles: profile.roles?.map((role) => role.code) || [],
    permissions: profile.permissions || [],
  };
}

function formatPercent(value: number | undefined) {
  if (value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(0)}%`;
}

function getKpiMetric(items: MyKpiItem[], metricCode: string) {
  return items.find((item) => item.target?.metricCode === metricCode);
}

function activityStatus(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return { label: 'Hoàn thành', color: 'success' as const };
    case 'SUBMITTED':
    case 'RESUBMITTED':
      return { label: 'Cập nhật', color: 'processing' as const };
    default:
      return { label: 'Cập nhật', color: 'default' as const };
  }
}

export default function ProfilePage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const passwordSectionRef = useRef<HTMLDivElement>(null);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(defaultNotificationSettings);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const isOperator = user?.roles?.includes('OPERATOR');

  const { data: meData, isLoading: isProfileLoading } = useQuery({
    queryKey: queryKeys.users.me(user?.id),
    queryFn: ({ signal }) => authService.getMe({ signal }),
    enabled: !!user?.id,
  });

  const profile = useMemo(
    () => (meData && meData.id === user?.id ? normalizeProfile(meData) : user),
    [meData, user],
  );

  useEffect(() => {
    if (!meData) return;
    const normalized = normalizeProfile(meData);
    const currentUser = useAuthStore.getState().user;
    if (
      !currentUser ||
      currentUser.id !== normalized.id ||
      currentUser.fullName !== normalized.fullName ||
      currentUser.email !== normalized.email ||
      currentUser.phone !== normalized.phone ||
      currentUser.avatarUrl !== normalized.avatarUrl
    ) {
      setUser(normalized);
    }
    setTwoFactorEnabled(Boolean(meData.twoFactorEnabled));
    setNotificationSettings({
      ...defaultNotificationSettings,
      ...(meData.notificationPreferences || {}),
    });
  }, [meData, setUser]);

  useEffect(() => {
    if (!profile || !isProfileEditing) return;
    profileForm.setFieldsValue({
      fullName: profile.fullName || '',
      phone: profile.phone || '',
      avatarUrl: profile.avatarUrl || '',
    });
  }, [isProfileEditing, profile, profileForm]);

  const { data: kpiData } = useQuery({
    queryKey: queryKeys.kpis.myResults({ periodType: 'MONTHLY' }),
    queryFn: ({ signal }) => kpiService.getMyKpi({ periodType: 'MONTHLY' }, { signal }),
    enabled: !!profile?.id,
  });

  const { data: dossierData } = useQuery({
    queryKey: queryKeys.dossiers.list({ page: 1, limit: 4 }),
    queryFn: ({ signal }) => dossiersService.getDossiers({ page: 1, limit: 4 }, { signal }),
    enabled: !!profile?.id,
  });


  const changePasswordMutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công');
      passwordForm.resetFields();
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể đổi mật khẩu');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (updatedProfile) => {
      const normalized = normalizeProfile(updatedProfile);
      setUser(normalized);
      queryClient.setQueryData(queryKeys.users.me(normalized.id), updatedProfile);
      message.success('Cập nhật hồ sơ cá nhân thành công');
      setIsProfileEditing(false);
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể cập nhật hồ sơ cá nhân');
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: authService.updateSettings,
    onSuccess: (updatedProfile) => {
      setTwoFactorEnabled(Boolean(updatedProfile.twoFactorEnabled));
      setNotificationSettings({
        ...defaultNotificationSettings,
        ...(updatedProfile.notificationPreferences || {}),
      });
      queryClient.setQueryData(queryKeys.users.me(updatedProfile.id), updatedProfile);
      message.success('Đã lưu cài đặt cá nhân');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể lưu cài đặt cá nhân');
    },
  });

  const kpiItems = Array.isArray(kpiData) ? kpiData : [];
  const dossierItems: DossierItem[] = dossierData?.data || [];
  const revenueKpi = getKpiMetric(kpiItems, 'REVENUE');
  const closeRateKpi = getKpiMetric(kpiItems, 'CLOSE_RATE');
  const dossierCountKpi = getKpiMetric(kpiItems, 'DOSSIER_COUNT');

  const scrollToPassword = () => {
    window.setTimeout(() => {
      passwordSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  const handleUpdateProfile = async () => {
    const values = await profileForm.validateFields();
    updateProfileMutation.mutate({
      fullName: values.fullName.trim(),
      phone: values.phone?.trim() || '',
      avatarUrl: values.avatarUrl?.trim() || '',
    });
  };

  if (isProfileLoading && !profile) {
    return <div className="min-h-[420px] animate-pulse rounded-xl bg-white" />;
  }

  return (
    <div className={`space-y-5 pb-8 ${isOperator ? 'op-page' : ''}`}>
      <div className={isOperator ? 'op-page-heading' : undefined}>
        <Title level={1} className="skylux-page-title">
          Hồ sơ cá nhân
        </Title>
        <Text className="skylux-subtitle">
          Quản lý thông tin cá nhân và cài đặt tài khoản
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8} xl={7}>
          <Card className="skylux-card h-full" styles={{ body: { padding: 22 } }}>
            <div className="flex min-h-[184px] items-center gap-5">
              <Avatar
                size={96}
                src={profile?.avatarUrl}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#EAF5EF', color: '#00543D' }}
              >
                {profile?.fullName?.charAt(0)}
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Text strong className="text-lg text-slate-900">
                    {profile?.fullName || 'Người dùng'}
                  </Text>
                  <CheckCircleOutlined className="text-[#D6A51F]" />
                </div>
                <div className="mt-2 truncate text-sm text-slate-600">
                  {profile?.email || '-'}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <PhoneOutlined /> {profile?.phone || 'Chưa cập nhật'}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Chức vụ:{' '}
                  <span className="font-semibold text-[#00543D]">
                    {profile?.roles?.[0] || 'Chưa gán role'}
                  </span>
                </div>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  className="skylux-outline-button mt-4"
                  onClick={() => setIsProfileEditing(true)}
                >
                  Chỉnh sửa hồ sơ
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8} lg={5}>
          <Card className="skylux-card h-full" styles={{ body: { padding: 22 } }}>
            <div className="flex items-start gap-4">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <SafetyCertificateOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-600">KPI tháng</Text>
                <Statistic
                  value={formatPercent(closeRateKpi?.actualValue)}
                  styles={{ content: { color: '#00543D', fontSize: 27, fontWeight: 700 } }}
                />
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#D6A51F]"
                    style={{ width: `${Math.min(closeRateKpi?.achievementRate || 0, 100)}%` }}
                  />
                </div>
                <Text className="mt-2 block text-xs text-slate-500">
                  {closeRateKpi ? 'Theo dữ liệu KPI hiện tại' : 'Chưa thiết lập mục tiêu'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8} lg={5}>
          <Card className="skylux-card h-full" styles={{ body: { padding: 22 } }}>
            <div className="flex items-start gap-4">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <span className="text-3xl font-semibold">₫</span>
              </span>
              <div>
                <Text className="text-sm text-slate-600">Doanh thu cá nhân</Text>
                <Statistic
                  value={formatCurrency(revenueKpi?.actualValue, { fallback: '-' })}
                  styles={{ content: { color: '#00543D', fontSize: 24, fontWeight: 700 } }}
                />
                <Text className="mt-3 block text-xs text-[#007A55]">
                  {revenueKpi ? 'Theo KPI tháng hiện tại' : 'Chưa có dữ liệu doanh thu'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={8} lg={6}>
          <Card className="skylux-card h-full" styles={{ body: { padding: 22 } }}>
            <div className="flex items-start gap-4">
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <FolderOpenOutlined />
              </span>
              <div>
                <Text className="text-sm text-slate-600">Hồ sơ đã xử lý</Text>
                <Statistic
                  value={dossierCountKpi?.actualValue ?? 0}
                  styles={{ content: { color: '#00543D', fontSize: 27, fontWeight: 700 } }}
                />
                <Text className="mt-3 block text-xs text-[#007A55]">
                  {dossierCountKpi ? 'Theo KPI tháng hiện tại' : 'Chưa thiết lập KPI'}
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card
            title="Cài đặt tài khoản"
            className="skylux-card h-full"
            styles={{ body: { padding: '8px 22px 20px' } }}
          >
            <div className="divide-y divide-slate-100">
              <button
                type="button"
                className="flex w-full items-center gap-4 py-5 text-left transition-colors hover:bg-slate-50"
                onClick={scrollToPassword}
              >
                <span className="skylux-icon-bubble h-11 w-11 bg-[var(--color-primary-soft)] text-lg text-[var(--color-primary-600)]">
                  <LockOutlined />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800">Đổi mật khẩu</span>
                  <span className="mt-1 block text-xs text-slate-500">Cập nhật mật khẩu tài khoản</span>
                </span>
                <KeyOutlined className="text-slate-400" />
              </button>
              <div className="flex items-center gap-4 py-5">
                <span className="skylux-icon-bubble h-11 w-11 bg-[var(--color-primary-soft)] text-lg text-[var(--color-primary-600)]">
                  <SafetyCertificateOutlined />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">Bảo mật 2 lớp</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {twoFactorEnabled ? 'Đang bật bảo mật 2 lớp' : 'Bật để tăng bảo mật tài khoản'}
                  </div>
                </div>
                <Switch
                  size="small"
                  checked={twoFactorEnabled}
                  loading={updateSettingsMutation.isPending}
                  onChange={(checked) =>
                    updateSettingsMutation.mutate({ twoFactorEnabled: checked })
                  }
                  aria-label="Bảo mật 2 lớp"
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            ref={passwordSectionRef}
            title="Thông tin đăng nhập"
            className="skylux-card h-full"
            styles={{ body: { padding: '12px 22px 20px' } }}
          >
            <Form form={passwordForm} layout="vertical" requiredMark={false}>
              <Form.Item label="Email đăng nhập">
                <Input value={profile?.email || ''} readOnly prefix={<UserOutlined />} />
              </Form.Item>
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password
                  placeholder="Nhập mật khẩu hiện tại"
                  prefix={<LockOutlined />}
                />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password
                  placeholder="Nhập mật khẩu mới"
                  prefix={<LockOutlined />}
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
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  placeholder="Nhập lại mật khẩu mới"
                  prefix={<LockOutlined />}
                />
              </Form.Item>
              <Button
                type="primary"
                block
                icon={<CheckOutlined />}
                className="skylux-primary-button"
                loading={changePasswordMutation.isPending}
                onClick={handleChangePassword}
              >
                Cập nhật mật khẩu
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Cài đặt thông báo"
            className="skylux-card h-full"
            styles={{ body: { padding: '8px 22px 20px' } }}
          >
            <div className="space-y-1">
              {notificationSettingDefinitions.map(([key, title, description]) => (
                <div key={title} className="flex items-center gap-4 py-3">
                  <span className="skylux-icon-bubble h-10 w-10 bg-[var(--color-primary-soft)] text-base text-[var(--color-primary-600)]">
                    <SettingOutlined />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">{title}</div>
                    <div className="mt-1 text-xs text-slate-500">{description}</div>
                  </div>
                  <Switch
                    size="small"
                    checked={notificationSettings[key]}
                    loading={updateSettingsMutation.isPending}
                    onChange={(checked) =>
                      updateSettingsMutation.mutate({
                        [key]: checked,
                      } as UpdateUserSettingsPayload)
                    }
                    aria-label={title}
                  />
                </div>
              ))}
            </div>
            <Text className="mt-3 block text-xs text-slate-400">
              Các tùy chọn được lưu riêng theo từng tài khoản.
            </Text>
          </Card>
        </Col>
      </Row>

      <Card
        title="Lịch sử hoạt động gần đây"
        className="skylux-card"
        styles={{ body: { padding: 0 } }}
      >
        {dossierItems.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {dossierItems.map((dossier) => {
              const status = activityStatus(dossier.status);
              return (
                <div key={dossier.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                    <FolderOpenOutlined />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-700">
                      Cập nhật hồ sơ {dossier.code}
                      {dossier.customer?.displayName ? ` - ${dossier.customer.displayName}` : ''}
                    </div>
                  </div>
                  <Text className="hidden text-xs text-slate-500 md:block">
                    {dayjs(dossier.updatedAt || dossier.createdAt).format('HH:mm  DD/MM/YYYY')}
                  </Text>
                  <Tag color={status.color}>{status.label}</Tag>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Chưa có dữ liệu hoạt động gần đây.
          </div>
        )}
      </Card>

      <div className="py-1 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} SkyLux Travel. All rights reserved.
      </div>

      <Modal
        title="Chỉnh sửa hồ sơ cá nhân"
        open={isProfileEditing}
        onCancel={() => setIsProfileEditing(false)}
        onOk={handleUpdateProfile}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={updateProfileMutation.isPending}
        destroyOnHidden
      >
        <Form form={profileForm} layout="vertical" requiredMark={false} className="pt-3">
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              { required: true, message: 'Vui lòng nhập họ và tên' },
              { min: 2, message: 'Họ và tên tối thiểu 2 ký tự' },
            ]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item name="avatarUrl" label="Ảnh đại diện (URL)">
            <Input placeholder="Dán đường dẫn ảnh đại diện nếu có" />
          </Form.Item>
          <Text className="text-xs text-slate-500">
            Email, mã nhân viên, phòng ban và quyền truy cập do quản trị viên quản lý.
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
