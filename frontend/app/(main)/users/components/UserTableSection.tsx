'use client';

import React from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  SearchOutlined,
  UserOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { UserItem } from '@/types/user';
import { RoleItem } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useUserMutations } from '@/hooks/use-users';
import { themeTokens } from '@/lib/theme/tokens.config';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import { queryKeys } from '@/lib/query-keys';

export interface UserTableSectionProps {
  users: UserItem[];
  totalUsers: number;
  roles: RoleItem[];
  isLoading: boolean;
  isSuperAdmin?: boolean;
}

export default function UserTableSection({
  users,
  totalUsers,
  roles,
  isLoading,
  isSuperAdmin = false,
}: UserTableSectionProps) {
  const {
    userSearch,
    setUserSearch,
    userStatusFilter,
    setUserStatusFilter,
    userRoleFilter,
    setUserRoleFilter,
    userPage,
    setUserPage,
    userPageSize,
    setUserPageSize,
    openCreateUser,
    openEditUser,
    openUserDetail,
    openUserRoles,
  } = useRbacStore(
    useShallow((s) => ({
      userSearch: s.userSearch,
      setUserSearch: s.setUserSearch,
      userStatusFilter: s.userStatusFilter,
      setUserStatusFilter: s.setUserStatusFilter,
      userRoleFilter: s.userRoleFilter,
      setUserRoleFilter: s.setUserRoleFilter,
      userPage: s.userPage,
      setUserPage: s.setUserPage,
      userPageSize: s.userPageSize,
      setUserPageSize: s.setUserPageSize,
      openCreateUser: s.openCreateUser,
      openEditUser: s.openEditUser,
      openUserDetail: s.openUserDetail,
      openUserRoles: s.openUserRoles,
    })),
  );

  const { lockMutation, unlockMutation, deleteMutation } = useUserMutations();
  const queryClient = useQueryClient();
  const deleteCeoMutation = useMutation({
    mutationFn: usersService.deleteCeo,
    onSuccess: () => {
      message.success('Đã xóa tài khoản CEO doanh nghiệp');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error: any) => message.error(error.message || 'Không thể xóa tài khoản CEO'),
  });

  const userColumns = [
    {
      title: isSuperAdmin ? 'CEO doanh nghiệp' : 'Nhân viên',
      key: 'user',
      render: (_: any, record: UserItem) => (
        <Space
          size={12}
          className="cursor-pointer group"
          onClick={() => !isSuperAdmin && openUserDetail(record)}
        >
          <Avatar
            style={{ backgroundColor: themeTokens.brand.primary[900] }}
            src={record.avatarUrl}
            icon={<UserOutlined />}
          >
            {record.fullName?.charAt(0)}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {record.fullName}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {record.employeeCode}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email & Số điện thoại',
      key: 'contact',
      render: (_: any, record: UserItem) => (
        <div>
          <div className="text-slate-700 text-sm">{record.email}</div>
          <div className="text-xs text-slate-400">
            {record.phone || 'Chưa có SĐT'}
          </div>
        </div>
      ),
    },
    {
      title: 'Phòng ban',
      key: 'department',
      render: (_: any, record: UserItem) => (
        <span className="text-slate-600 font-medium">
          {record.department?.name || 'Chưa phân bổ'}
        </span>
      ),
    },
    ...(isSuperAdmin ? [{
      title: 'Doanh nghiệp',
      key: 'organization',
      render: (_: any, record: UserItem) => (
        <span className="text-slate-700 font-medium">{record.organization?.name || '—'}</span>
      ),
    }] : []),
    {
      title: 'Vai trò (Roles)',
      key: 'roles',
      render: (_: any, record: UserItem) => (
        <Space size={4} wrap>
          {record.roles && record.roles.length > 0 ? (
            record.roles.filter((r) => !isSuperAdmin || r.code === 'CEO_ADMIN').map((r) => (
              <Tag
                key={r.id}
                color={
                  r.code === 'SUPER_ADMIN'
                    ? 'magenta'
                    : r.code === 'CEO_ADMIN'
                    ? 'purple'
                    : r.code === 'SALES'
                    ? 'blue'
                    : r.code === 'OPERATOR'
                    ? 'cyan'
                    : 'green'
                }
                className="font-medium"
              >
                {r.name || r.code}
              </Tag>
            ))
          ) : (
            <Tag color="default">Chưa gán vai trò</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={
            status === 'ACTIVE'
              ? 'success'
              : status === 'LOCKED'
              ? 'error'
              : 'default'
          }
          className="font-semibold"
        >
          {status === 'ACTIVE'
            ? 'Hoạt động'
            : status === 'LOCKED'
            ? 'Bị khóa'
            : 'Chưa kích hoạt'}
        </Tag>
      ),
    },
    ...(isSuperAdmin ? [{
      title: 'Hành động',
      key: 'actions',
      width: 110,
      render: (_: any, record: UserItem) => (
        <Space size={6}>
          <Tooltip title="Sửa CEO">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditUser(record)} />
          </Tooltip>
          <Popconfirm
            title="Xóa tài khoản CEO này?"
            description="Tài khoản sẽ bị xóa mềm và các phiên đăng nhập sẽ bị thu hồi."
            onConfirm={() => deleteCeoMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true, loading: deleteCeoMutation.isPending }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleteCeoMutation.isPending} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
    ...(!isSuperAdmin ? [{
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: UserItem) => (
        <Space size={6}>
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openUserDetail(record)}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditUser(record)}
            />
          </Tooltip>

          <Tooltip title="Gán vai trò">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<KeyOutlined />}
              onClick={() =>
                openUserRoles(record, record.roles?.map((r) => r.id) || [])
              }
            />
          </Tooltip>

          {record.status === 'LOCKED' ? (
            <Tooltip title="Mở khóa tài khoản">
              <Popconfirm
                title="Mở khóa tài khoản?"
                description={`Bạn có chắc muốn mở khóa cho ${record.fullName}?`}
                onConfirm={() => unlockMutation.mutate(record.id)}
                okText="Mở khóa"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  icon={<UnlockOutlined className="text-emerald-600" />}
                  loading={unlockMutation.isPending}
                />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="Khóa tài khoản">
              <Popconfirm
                title="Khóa tài khoản?"
                description={`Nhân viên ${record.fullName} sẽ bị đăng xuất khỏi hệ thống.`}
                onConfirm={() => lockMutation.mutate(record.id)}
                okText="Khóa tài khoản"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<LockOutlined />}
                  loading={lockMutation.isPending}
                />
              </Popconfirm>
            </Tooltip>
          )}

          <Tooltip title="Xóa nhân viên">
            <Popconfirm
              title="Xóa nhân viên này?"
              description="Dữ liệu nhân viên sẽ được lưu trữ và có thể khôi phục."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                type="text"
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-4 pt-2">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Input
            placeholder="Tìm theo tên, email, mã nhân viên, SĐT..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="max-w-xs"
            allowClear
          />

          <Select
            placeholder="Trạng thái"
            value={userStatusFilter || undefined}
            onChange={(value) => setUserStatusFilter(value || '')}
            allowClear
            className="w-40"
            options={[
              { label: 'Tất cả trạng thái', value: '' },
              { label: 'Hoạt động', value: 'ACTIVE' },
              { label: 'Bị khóa', value: 'LOCKED' },
              { label: 'Chưa kích hoạt', value: 'INACTIVE' },
            ]}
          />

          {!isSuperAdmin && <Select
            placeholder="Lọc theo vai trò"
            value={userRoleFilter || undefined}
            onChange={(value) => setUserRoleFilter(value || undefined)}
            allowClear
            className="w-48"
            options={roles.map((r) => ({
              label: `${r.name} (${r.code})`,
              value: r.id,
            }))}
          />}

          {(userSearch || userStatusFilter || (!isSuperAdmin && userRoleFilter)) && (
            <Button
              type="link"
              onClick={() => {
                setUserSearch('');
                setUserStatusFilter('');
                if (!isSuperAdmin) setUserRoleFilter(undefined);
              }}
              className="text-xs text-slate-500"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateUser}
          className="bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-950)] border-none"
        >
          {isSuperAdmin ? 'Thêm CEO doanh nghiệp' : 'Thêm người dùng'}
        </Button>
      </div>

      {/* Users Data Table */}
      <Table
        dataSource={users}
        columns={userColumns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: userPage,
          pageSize: userPageSize,
          total: totalUsers,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Tổng số ${total} người dùng`,
          onChange: (page, pageSize) => {
            setUserPage(page);
            setUserPageSize(pageSize);
          },
        }}
        className="border border-slate-100 rounded-lg overflow-hidden"
        scroll={{ x: isSuperAdmin ? 1120 : 800 }}
      />
    </div>
  );
}
