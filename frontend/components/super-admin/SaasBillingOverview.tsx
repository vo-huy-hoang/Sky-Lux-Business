'use client';

import { useMemo, useState } from 'react';
import { Alert, Card, Empty, Input, Skeleton, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BankOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { organizationsService } from '@/services/organizations.service';
import { queryKeys } from '@/lib/query-keys';
import type { OrganizationItem } from '@/types/organization';

const { Text } = Typography;

export default function SaasBillingOverview() {
  const [search, setSearch] = useState('');
  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: ({ signal }) => organizationsService.listOrganizations({ signal }),
  });

  const filteredOrganizations = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN');
    if (!keyword) return organizations;
    return organizations.filter((organization) =>
      `${organization.name} ${organization.code} ${organization.contactEmail || ''}`
        .toLocaleLowerCase('vi-VN')
        .includes(keyword),
    );
  }, [organizations, search]);

  const columns: ColumnsType<OrganizationItem> = [
    {
      title: 'Doanh nghiệp',
      key: 'organization',
      render: (_, organization) => (
        <div className="flex flex-col">
          <Text strong className="text-slate-800">{organization.name}</Text>
          <Text type="secondary" className="text-xs">{organization.code}</Text>
        </div>
      ),
    },
    {
      title: 'Gói dịch vụ',
      key: 'plan',
      render: () => <Text type="secondary">Chưa cấu hình</Text>,
    },
    {
      title: 'Phí thuê bao',
      key: 'amount',
      render: () => <Text type="secondary">Chưa ghi nhận</Text>,
    },
    {
      title: 'Kỳ thanh toán',
      key: 'billingPeriod',
      render: () => <Text type="secondary">Chưa thiết lập</Text>,
    },
    {
      title: 'Trạng thái doanh nghiệp',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? 'Đang hoạt động' : status || 'Chưa xác định'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <Alert
        showIcon
        type="info"
        title="Đây là khoản thu phí sử dụng Sky-Lux CRM từ các doanh nghiệp."
        description="Không bao gồm doanh thu, chi phí hoặc khoản thanh toán trong các hồ sơ và file dự toán."
        className="rounded-xl"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <Statistic
            title="Doanh nghiệp trên nền tảng"
            value={isLoading ? '—' : organizations.length}
            prefix={<BankOutlined className="text-emerald-800" />}
          />
          <Text type="secondary" className="text-xs">Tenant đã đăng ký trong hệ thống</Text>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <Statistic
            title="Phí dịch vụ đã thu trong tháng"
            value="Chưa có dữ liệu"
            styles={{ content: { fontSize: 20 } }}
            prefix={<DollarOutlined className="text-emerald-800" />}
          />
          <Text type="secondary" className="text-xs">Chưa có dữ liệu gói thuê bao và giao dịch thu phí</Text>
        </Card>
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <Statistic
            title="Khoản phí sắp đến hạn"
            value="Chưa có dữ liệu"
            styles={{ content: { fontSize: 20 } }}
            prefix={<CalendarOutlined className="text-amber-600" />}
          />
          <Text type="secondary" className="text-xs">Kỳ hạn sẽ hiện khi hệ thống có lịch thanh toán thuê bao</Text>
        </Card>
      </div>

      <Card
        title={<span className="flex items-center gap-2"><CreditCardOutlined /> Thuê bao dịch vụ theo doanh nghiệp</span>}
        className="rounded-xl border-slate-200 shadow-sm"
        extra={
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm doanh nghiệp"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64"
          />
        }
      >
        {isError ? (
          <Alert type="error" showIcon title="Không tải được danh sách doanh nghiệp." />
        ) : isLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : organizations.length === 0 ? (
          <Empty description="Chưa có doanh nghiệp trên nền tảng" />
        ) : (
          <Table<OrganizationItem>
            rowKey="id"
            columns={columns}
            dataSource={filteredOrganizations}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 850 }}
            locale={{ emptyText: 'Không tìm thấy doanh nghiệp phù hợp' }}
          />
        )}
      </Card>

      <Card className="rounded-xl border-slate-200 shadow-sm">
        <div className="flex flex-col items-center py-6 text-center">
          <CreditCardOutlined className="mb-3 text-3xl text-slate-300" />
          <Text strong>Chưa có giao dịch phí dịch vụ</Text>
          <Text type="secondary" className="mt-1 max-w-xl">
            Các doanh nghiệp hiện chưa có dữ liệu gói, mức phí hoặc lịch sử thanh toán thuê bao trong hệ thống.
            Khi có dữ liệu này, bảng giao dịch sẽ hiển thị hóa đơn, số tiền, ngày đến hạn và trạng thái thanh toán tại đây.
          </Text>
        </div>
      </Card>
    </div>
  );
}
