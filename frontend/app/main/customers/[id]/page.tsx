'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Tag,
  Select,
  Dropdown,
  Popconfirm,
  message,
  Skeleton,
  Empty,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  BankOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  TagOutlined,
  IdcardOutlined,
  FolderOpenOutlined,
  DollarOutlined,
  CalendarOutlined,
  PlusOutlined,
  MoreOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  MessageOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { useCustomerActivities } from '@/hooks/use-customers';
import {
  CustomerItem,
  CustomerContact,
} from '@/types/customer';
import { DossierItem } from '@/types/dossier';
import { ContactModal } from '../components/ContactModal';
import { formatCurrency } from '@/lib/financial-calculations';

function getInitials(name?: string) {
  if (!name) return 'KH';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getAvatarBgColor(initials: string) {
  const colors = [
    'bg-emerald-100 text-emerald-700',
    'bg-sky-100 text-sky-700',
    'bg-indigo-100 text-indigo-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
  ];
  let sum = 0;
  for (let i = 0; i < initials.length; i++) {
    sum += initials.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

const dossierStatusMap: Record<string, { label: string; dotColor: string; bg: string }> = {
  DRAFT: { label: 'Đề xuất', dotColor: 'bg-amber-500', bg: 'text-amber-700' },
  SUBMITTED: { label: 'Đang xử lý', dotColor: 'bg-blue-500', bg: 'text-blue-700' },
  IN_REVIEW: { label: 'Đàm phán', dotColor: 'bg-sky-500', bg: 'text-sky-700' },
  APPROVED: { label: 'Thành công', dotColor: 'bg-emerald-500', bg: 'text-emerald-700' },
  LOCKED: { label: 'Hoàn thành', dotColor: 'bg-emerald-600', bg: 'text-emerald-800' },
  CANCELLED: { label: 'Mất nhịp', dotColor: 'bg-purple-500', bg: 'text-purple-700' },
};


function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const activityPresentation: Record<
  string,
  { icon: React.ReactNode; bg: string }
> = {
  CALL: {
    icon: <PhoneOutlined className="text-emerald-600 text-sm" />,
    bg: 'bg-emerald-50 border-emerald-200',
  },
  QUOTE_SENT: {
    icon: <FileTextOutlined className="text-amber-600 text-sm" />,
    bg: 'bg-amber-50 border-amber-200',
  },
  CUSTOMER_RESPONSE: {
    icon: <MessageOutlined className="text-sky-600 text-sm" />,
    bg: 'bg-sky-50 border-sky-200',
  },
  BROCHURE_SENT: {
    icon: <FileTextOutlined className="text-amber-600 text-sm" />,
    bg: 'bg-amber-50 border-amber-200',
  },
  NOTE: {
    icon: <FileTextOutlined className="text-indigo-600 text-sm" />,
    bg: 'bg-indigo-50 border-indigo-200',
  },
};

const defaultActivityPresentation = {
  icon: <MessageOutlined className="text-slate-600 text-sm" />,
  bg: 'bg-slate-50 border-slate-200',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = params.id as string;

  const [activeTab, setActiveTab] = useState<'info' | 'dossiers' | 'comments'>('dossiers');
  const [dossierStatusFilter, setDossierStatusFilter] = useState<string>('ALL');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);

  // 1. Fetch Customer Detail
  const { data: customer, isLoading: isLoadingCustomer } = useQuery<CustomerItem>({
    queryKey: ['customer', customerId],
    queryFn: () => customersService.getCustomer(customerId),
    enabled: !!customerId,
  });

  // 2. Fetch Customer Dossiers
  const { data: dossiersData, isLoading: isLoadingDossiers } = useQuery<{
    data: DossierItem[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: ['customer-dossiers', customerId],
    queryFn: () => customersService.getCustomerDossiers(customerId, { page: 1, limit: 50 }),
    enabled: !!customerId,
  });

  // 3. Fetch persisted customer activities for the timeline
  const { data: activitiesData, isLoading: isLoadingActivities } =
    useCustomerActivities(customerId, { page: 1, limit: 20 });

  // 4. Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) =>
      customersService.deleteContact(customerId, contactId),
    onSuccess: () => {
      message.success('Đã xóa người liên hệ');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || 'Không thể xóa người liên hệ');
    },
  });

  // Primary Contact Calculation
  const contactsList = customer?.contacts;
  const primaryContact = useMemo(() => {
    if (!contactsList || contactsList.length === 0) return null;
    return (
      contactsList.find((c) => c.isPrimary) ||
      contactsList[0]
    );
  }, [contactsList]);

  // Dossiers List & Filtering
  const liveDossiers = useMemo(
    () => dossiersData?.data ?? [],
    [dossiersData?.data],
  );

  const filteredDossiers = useMemo(() => {
    if (dossierStatusFilter === 'ALL') return liveDossiers;
    return liveDossiers.filter((d) => d.status === dossierStatusFilter);
  }, [liveDossiers, dossierStatusFilter]);

  const totalEstimatedRevenue = useMemo(() => {
    return liveDossiers.reduce((sum, d) => {
      const rev = d.estimates?.[0]?.totalRevenue;
      return sum + (rev ? Number(rev) : 0);
    }, 0);
  }, [liveDossiers]);

  const latestDossier = liveDossiers[0];

  const activities = useMemo(
    () =>
      (activitiesData?.data ?? []).map((activity) => {
        const presentation =
          activityPresentation[activity.type] || defaultActivityPresentation;

        return {
          ...activity,
          desc: activity.description || 'Không có mô tả',
          time: formatDate(activity.occurredAt),
          user:
            activity.actor?.fullName ||
            customer?.assignedSales?.fullName ||
            'Hệ thống',
          ...presentation,
        };
      }),
    [activitiesData?.data, customer?.assignedSales?.fullName],
  );

  // Contacts Table Columns
  const contactColumns: ColumnsType<CustomerContact> = [
    {
      title: 'Họ và tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => {
        const init = getInitials(name);
        return (
          <div className="flex items-center gap-2.5">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] select-none ${getAvatarBgColor(
                init,
              )}`}
            >
              {init}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-xs">{name}</span>
              {record.isPrimary && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-200/50">
                  Chính
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Chức vụ',
      dataIndex: 'position',
      key: 'position',
      render: (pos?: string) => (
        <span className="text-slate-600 text-xs">{pos || '-'}</span>
      ),
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => (
        <span className="text-slate-700 text-xs font-mono">{phone || '-'}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email?: string) => (
        <span className="text-slate-500 text-xs">{email || '-'}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      render: (_, record) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Chỉnh sửa',
                onClick: () => {
                  setSelectedContact(record);
                  setContactModalVisible(true);
                },
              },
              {
                key: 'delete',
                danger: true,
                icon: <DeleteOutlined />,
                label: (
                  <Popconfirm
                    title="Xóa người liên hệ"
                    description="Bạn có chắc chắn muốn xóa người liên hệ này?"
                    onConfirm={() => record.id && deleteContactMutation.mutate(record.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <span>Xóa liên hệ</span>
                  </Popconfirm>
                ),
              },
            ],
          }}
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined className="text-slate-400 rotate-90" />}
          />
        </Dropdown>
      ),
    },
  ];

  // Dossiers Table Columns
  const dossierColumns: ColumnsType<DossierItem> = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string, record) => (
        <span
          onClick={() => router.push(`/main/dossiers/${record.id}`)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
        >
          {code}
        </span>
      ),
    },
    {
      title: 'Tên hồ sơ',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <span
          onClick={() => router.push(`/main/dossiers/${record.id}`)}
          className="text-xs text-slate-800 hover:text-emerald-700 cursor-pointer truncate max-w-[200px] block"
          title={name}
        >
          {name}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const info = dossierStatusMap[status] || {
          label: status,
          dotColor: 'bg-slate-400',
          bg: 'text-slate-600',
        };
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`h-1.5 w-1.5 rounded-full ${info.dotColor}`} />
            <span className={`font-medium ${info.bg}`}>{info.label}</span>
          </div>
        );
      },
    },
    {
      title: 'Giá trị dự toán',
      key: 'revenue',
      width: 130,
      render: (_, record) => {
        const est = record.estimates?.[0];
        const val = est?.totalRevenue || 0;
        return (
          <span className="text-xs font-semibold text-slate-800">
            {formatCurrency(val)}
          </span>
        );
      },
    },
    {
      title: 'Ngày cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (date: string) => (
        <span className="text-[11px] text-slate-500">{formatDate(date)}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 36,
      render: (_, record) => (
        <Tooltip title="Xem chi tiết hồ sơ">
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined className="text-slate-400 rotate-90" />}
            onClick={() => router.push(`/main/dossiers/${record.id}`)}
          />
        </Tooltip>
      ),
    },
  ];

  if (isLoadingCustomer) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl">
        <Empty description="Không tìm thấy thông tin khách hàng" />
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          className="mt-4 skylux-primary-button"
          onClick={() => router.push('/main/customers')}
        >
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  const isBusiness = customer.customerType === 'BUSINESS';
  const customerTitle = customer.displayName || 'Khách hàng';

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header with Back Button and Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/main/customers')}
          className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeftOutlined className="text-sm" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0">
          Chi tiết khách hàng - {customerTitle}
        </h1>
      </div>

      {/* 2. Top Overview Section: Left Info Card + Right 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Customer Info Card (Span 6) */}
        <Card className="lg:col-span-6 rounded-2xl border-slate-100 shadow-sm p-2">
          <div className="flex items-start gap-4 mb-5">
            <div className="h-12 w-12 rounded-xl bg-sky-50 border border-sky-100/80 flex items-center justify-center text-sky-600 text-xl shrink-0">
              {isBusiness ? <BankOutlined /> : <UserOutlined />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 mb-0">
                  {customerTitle}
                </h2>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  {isBusiness ? 'Doanh nghiệp' : 'Cá nhân'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2">
              <TagOutlined className="text-slate-400 text-sm shrink-0" />
              <span className="text-slate-500">Loại khách hàng:</span>
              <span className="font-medium text-slate-800 ml-auto">
                {isBusiness ? 'Doanh nghiệp' : 'Cá nhân'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <IdcardOutlined className="text-slate-400 text-sm shrink-0" />
              <span className="text-slate-500">Mã khách hàng:</span>
              <span className="font-semibold text-slate-900 ml-auto">
                {customer.code}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <UserOutlined className="text-slate-400 text-sm shrink-0" />
              <span className="text-slate-500 shrink-0">Người liên hệ chính:</span>
              <span className="font-medium text-slate-800 ml-auto truncate">
                {primaryContact
                  ? `${primaryContact.name}${
                      primaryContact.position ? ` - ${primaryContact.position}` : ''
                    }`
                  : customer.assignedSales?.fullName || '-'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <PhoneOutlined className="text-slate-400 text-sm shrink-0" />
              <span className="text-slate-500">Điện thoại:</span>
              <span className="font-mono font-medium text-slate-800 ml-auto">
                {customer.phone || primaryContact?.phone || '-'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MailOutlined className="text-slate-400 text-sm shrink-0" />
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-800 ml-auto truncate max-w-[140px]">
                {customer.email || primaryContact?.email || '-'}
              </span>
            </div>

            <div className="flex items-start gap-2 sm:col-span-2">
              <EnvironmentOutlined className="text-slate-400 text-sm shrink-0 mt-0.5" />
              <span className="text-slate-500 shrink-0">Địa chỉ:</span>
              <span className="font-medium text-slate-800 ml-auto text-right">
                {customer.address || '-'}
              </span>
            </div>
          </div>
        </Card>

        {/* Right 4 KPI Stat Cards (Span 6) */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-3.5">
          {/* Card 1: Số hồ sơ */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1 flex flex-col justify-between">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
              <FolderOpenOutlined />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900 leading-tight">
                {dossiersData?.meta?.total ?? liveDossiers.length}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Số hồ sơ
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">
                Tổng số hồ sơ liên quan
              </div>
            </div>
          </Card>

          {/* Card 2: Doanh thu dự toán */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1 flex flex-col justify-between">
            <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-sm">
              <DollarOutlined />
            </div>
            <div className="mt-3">
              <div className="text-lg md:text-xl font-bold text-slate-900 leading-tight truncate">
                {formatCurrency(totalEstimatedRevenue)}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Doanh thu dự toán
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1">
                {liveDossiers.length > 0 ? `Từ ${liveDossiers.length} hồ sơ` : 'Chưa phát sinh doanh thu'}
              </div>
            </div>
          </Card>

          {/* Card 3: Hồ sơ gần nhất */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1 flex flex-col justify-between">
            <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-sm">
              <CalendarOutlined />
            </div>
            <div className="mt-3">
              <div className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                {latestDossier?.createdAt
                  ? new Date(latestDossier.createdAt).toLocaleDateString('vi-VN')
                  : 'Chưa có'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Hồ sơ gần nhất
              </div>
              <div className="text-[11px] text-slate-500 font-normal mt-1 truncate">
                {latestDossier
                  ? `${latestDossier.code} - ${dossierStatusMap[latestDossier.status]?.label || latestDossier.status}`
                  : 'Chưa có hồ sơ'}
              </div>
            </div>
          </Card>

          {/* Card 4: Trạng thái chăm sóc */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1 flex flex-col justify-between">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
              <UserOutlined />
            </div>
            <div className="mt-3">
              <div className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                {customer.status === 'ACTIVE' ? 'Đang chăm sóc' : 'Tạm dừng'}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                Trạng thái chăm sóc
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                {customer.status === 'ACTIVE' ? 'Tích cực' : 'Tạm dừng'}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Bottom Section: Left (Contacts & Dossiers) + Right (Recent Activities Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Bottom Left Column (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Người liên hệ */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 px-2">
              <div className="font-bold text-slate-900 text-sm">
                Người liên hệ ({customer.contacts?.length || 0})
              </div>
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setSelectedContact(null);
                  setContactModalVisible(true);
                }}
                className="text-emerald-700 hover:text-emerald-800 font-semibold p-0 flex items-center"
              >
                Thêm liên hệ
              </Button>
            </div>

            <Table
              dataSource={customer.contacts || []}
              columns={contactColumns}
              rowKey="id"
              pagination={false}
              size="small"
              className="mt-2"
              locale={{
                emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có người liên hệ" />,
              }}
            />
          </Card>

          {/* Card 2: Tabs (Thông tin chung, Hồ sơ liên quan, Lịch sử trao đổi) */}
          <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
            {/* Custom Tab Header */}
            <div className="flex items-center gap-6 border-b border-slate-100 px-2 pb-0">
              <button
                onClick={() => setActiveTab('info')}
                className={`text-xs font-semibold pb-2.5 transition-colors cursor-pointer ${
                  activeTab === 'info'
                    ? 'text-emerald-700 border-b-2 border-emerald-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Thông tin chung
              </button>
              <button
                onClick={() => setActiveTab('dossiers')}
                className={`text-xs font-semibold pb-2.5 transition-colors cursor-pointer ${
                  activeTab === 'dossiers'
                    ? 'text-emerald-700 border-b-2 border-emerald-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hồ sơ liên quan
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`text-xs font-semibold pb-2.5 transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'text-emerald-700 border-b-2 border-emerald-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Lịch sử trao đổi
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'dossiers' && (
              <div className="pt-3">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="font-bold text-slate-900 text-xs">
                    Danh sách hồ sơ ({filteredDossiers.length})
                  </span>
                  <Select
                    size="small"
                    value={dossierStatusFilter}
                    onChange={(val) => setDossierStatusFilter(val)}
                    className="w-36 text-xs"
                    options={[
                      { label: 'Tất cả trạng thái', value: 'ALL' },
                      { label: 'Đề xuất', value: 'DRAFT' },
                      { label: 'Đang xử lý', value: 'SUBMITTED' },
                      { label: 'Đàm phán', value: 'IN_REVIEW' },
                      { label: 'Thành công', value: 'APPROVED' },
                      { label: 'Mất nhịp', value: 'CANCELLED' },
                    ]}
                  />
                </div>

                <Table
                  dataSource={filteredDossiers}
                  columns={dossierColumns}
                  rowKey="id"
                  loading={isLoadingDossiers}
                  pagination={{ pageSize: 5, size: 'small' }}
                  size="small"
                  locale={{
                    emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có hồ sơ nào" />,
                  }}
                />

                <div className="text-center pt-2 border-t border-slate-100">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => router.push('/main/dossiers')}
                    className="text-emerald-700 hover:text-emerald-800 font-medium text-xs inline-flex items-center gap-1"
                  >
                    <span>Xem tất cả hồ sơ</span>
                    <ArrowRightOutlined className="text-[10px]" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mã số thuế:</span>
                    <span className="font-semibold text-slate-800">{customer.taxCode || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Ngày tạo hồ sơ:</span>
                    <span className="font-semibold text-slate-800">{formatDate(customer.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Sales phụ trách:</span>
                    <span className="font-semibold text-slate-800">
                      {customer.assignedSales?.fullName || 'Chưa phân công'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Trạng thái:</span>
                    <Tag color={customer.status === 'ACTIVE' ? 'green' : 'default'} className="text-xs">
                      {customer.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                    </Tag>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="p-6 text-center">
                <Empty description="Chưa có lịch sử trao đổi trực tiếp" />
              </div>
            )}
          </Card>
        </div>

        {/* Bottom Right Column: Hoạt động gần đây Timeline (Span 5) */}
        <Card className="lg:col-span-5 rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="font-bold text-slate-900 text-sm px-2 pb-3 border-b border-slate-100">
            Hoạt động gần đây
          </div>

          <div className="p-2 space-y-4 relative">
            {isLoadingActivities ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : activities.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có hoạt động nào được ghi nhận"
              />
            ) : (
              activities.map((item, idx) => (
                <div key={item.id} className="relative flex items-start gap-3">
                  {/* Connecting vertical line */}
                  {idx < activities.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-slate-200" />
                  )}

                  {/* Icon Circle */}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border z-10 ${item.bg}`}
                  >
                    {item.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-800 mb-0.5 truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-1 leading-normal line-clamp-2">
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.user}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center pt-3 border-t border-slate-100">
            <Button
              type="link"
              size="small"
              className="text-emerald-700 hover:text-emerald-800 font-medium text-xs inline-flex items-center gap-1"
            >
              <span>Xem tất cả hoạt động</span>
              <ArrowRightOutlined className="text-[10px]" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Contact Modal (Create / Edit) */}
      <ContactModal
        visible={contactModalVisible}
        customerId={customerId}
        contact={selectedContact}
        onCancel={() => {
          setContactModalVisible(false);
          setSelectedContact(null);
        }}
        onSuccess={() => {
          setContactModalVisible(false);
          setSelectedContact(null);
        }}
      />
    </div>
  );
}
