'use client';

import React from 'react';
import {
  Tabs,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
} from 'antd';
import {
  TeamOutlined,
  SafetyCertificateOutlined,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService, RoleItem } from '@/services/rbac.service';
import { usersService } from '@/services/users.service';
import { UserItem, UserStatus } from '@/types/user';
import { useRbacStore } from './store';
import RoleModal from './components/RoleModal';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import UserRoleModal from './components/UserRoleModal';
import UserModal from './components/UserModal';
import UserDetailDrawer from './components/UserDetailDrawer';

const { Text } = Typography;

export default function UsersAndRbacPage() {
  const queryClient = useQueryClient();

  // Zustand Store
  const {
    activeTab,
    setActiveTab,
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
    roleSearch,
    setRoleSearch,
    openCreateUser,
    openEditUser,
    openUserDetail,
    openCreateRole,
    openEditRole,
    openPermMatrix,
    openUserRoles,
  } = useRbacStore();

  // 1. Fetch Paginated & Filtered Users (API-USERS-001)
  const {
    data: usersResponse,
    isLoading: isUsersLoading,
  } = useQuery({
    queryKey: [
      'users',
      userPage,
      userPageSize,
      userSearch,
      userStatusFilter,
      userRoleFilter,
    ],
    queryFn: () =>
      usersService.getUsers({
        page: userPage,
        pageSize: userPageSize,
        search: userSearch || undefined,
        status: (userStatusFilter || undefined) as UserStatus | undefined,
        roleId: userRoleFilter || undefined,
      }),
  });

  // Handle both array or { data, meta } structure
  const users: UserItem[] = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.data || [];
  const totalUsers: number = Array.isArray(usersResponse)
    ? usersResponse.length
    : usersResponse?.meta?.total || users.length;
  const activeUsers = users.filter((user) => user.status === 'ACTIVE').length;
  const lockedUsers = users.filter((user) => user.status === 'LOCKED').length;
  const countRole = (code: string) => users.filter((user) => user.roles?.some((role) => role.code === code)).length;
  const ceoAdminUsers = users.filter((user) => user.roles?.some((role) => ['CEO_ADMIN', 'SUPER_ADMIN'].includes(role.code))).length;

  // 2. Fetch Roles for Filter and Roles Tab
  const {
    data: rolesData,
    isLoading: isRolesLoading,
  } = useQuery({
    queryKey: ['roles', roleSearch],
    queryFn: () => rbacService.getRoles({ search: roleSearch }),
  });
  const roles = rolesData || [];

  // Mutations
  const lockMutation = useMutation({
    mutationFn: (id: string) => usersService.lockUser(id),
    onSuccess: () => {
      message.success('Đã khóa tài khoản người dùng thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi khóa tài khoản');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersService.unlockUser(id),
    onSuccess: () => {
      message.success('Đã mở khóa tài khoản người dùng thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi mở khóa tài khoản');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      message.success('Đã xóa người dùng thành công');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi xóa người dùng');
    },
  });

  // Columns for Users Table
  const userColumns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: UserItem) => (
        <Space
          size={12}
          className="cursor-pointer group"
          onClick={() => openUserDetail(record)}
        >
          <Avatar
            style={{ backgroundColor: '#0A2540' }}
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
    {
      title: 'Vai trò (Roles)',
      key: 'roles',
      render: (_: any, record: UserItem) => (
        <Space size={4} wrap>
          {record.roles && record.roles.length > 0 ? (
            record.roles.map((r) => (
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
    {
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
    },
  ];

  // Columns for Roles Table
  const roleColumns = [
    {
      title: 'Mã vai trò',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: RoleItem) => (
        <Space>
          <span className="font-mono font-bold text-blue-700">{code}</span>
          {record.isSystem && (
            <Tag color="volcano" className="text-[10px] uppercase font-bold">
              Hệ thống
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Tên vai trò',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="font-semibold text-slate-800">{name}</span>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => (
        <span className="text-slate-500 text-xs">{desc || '-'}</span>
      ),
    },
    {
      title: 'Số quyền hạn',
      key: 'permCount',
      render: (_: any, record: RoleItem) => (
        <Badge
          count={record.permissionCount || 0}
          overflowCount={999}
          style={{
            backgroundColor:
              record.permissionCount > 0 ? '#10B981' : '#94A3B8',
          }}
        />
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: RoleItem) => (
        <Space size={8}>
          <Tooltip title="Chỉnh sửa thông tin">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditRole(record)}
            />
          </Tooltip>
          <Button
            size="small"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() =>
              openPermMatrix(
                record,
                record.permissions?.map((p) => p.code) || [],
              )
            }
            className="bg-[#0A2540] hover:bg-[#133E68] border-none text-xs"
          >
            Phân quyền
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[12, 12]}>
        {[
          { label: 'Tổng người dùng', value: totalUsers, tone: 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]' },
          { label: 'Đang hoạt động', value: activeUsers, tone: 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]' },
          { label: 'Sales', value: countRole('SALES'), tone: 'bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]' },
          { label: 'Điều hành', value: countRole('OPERATOR'), tone: 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]' },
          { label: 'CEO/Admin', value: ceoAdminUsers, tone: 'bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]' },
          { label: 'Tài khoản tạm khóa', value: lockedUsers, tone: 'bg-[var(--ceo-danger-soft)] text-[var(--ceo-danger)]' },
        ].map((metric) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={metric.label}>
            <Card className="ceo-card ceo-metric-card h-full">
              <div className="flex items-center gap-3">
                <span className={`ceo-metric-icon ${metric.tone}`}><TeamOutlined /></span>
                <div><Text className="text-xs text-[var(--ceo-text-muted)]">{metric.label}</Text><div className="text-[25px] font-bold">{isUsersLoading ? '-' : metric.value}</div></div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Tabbed Card */}
      <Card
        className="ceo-card"
        styles={{ body: { padding: '20px 24px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold text-sm flex items-center gap-2">
                  <TeamOutlined /> Danh sách Người dùng ({totalUsers})
                </span>
              ),
              children: (
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

                      <Select
                        placeholder="Lọc theo vai trò"
                        value={userRoleFilter || undefined}
                        onChange={(value) => setUserRoleFilter(value || undefined)}
                        allowClear
                        className="w-48"
                        options={roles.map((r) => ({
                          label: `${r.name} (${r.code})`,
                          value: r.id,
                        }))}
                      />

                      {(userSearch || userStatusFilter || userRoleFilter) && (
                        <Button
                          type="link"
                          onClick={() => {
                            setUserSearch('');
                            setUserStatusFilter('');
                            setUserRoleFilter(undefined);
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
                      className="bg-[#0A2540] hover:bg-[#133E68] border-none"
                    >
                      Thêm người dùng
                    </Button>
                  </div>

                  {/* Users Data Table */}
                  <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="id"
                    loading={isUsersLoading}
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
                  />
                </div>
              ),
            },
            {
              key: 'roles',
              label: (
                <span className="font-semibold text-sm flex items-center gap-2">
                  <SafetyCertificateOutlined /> Vai trò & Quyền hạn ({roles.length})
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center gap-4">
                    <Input
                      placeholder="Tìm theo mã hoặc tên vai trò..."
                      prefix={<SearchOutlined className="text-slate-400" />}
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                      className="max-w-md"
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateRole}
                      className="bg-[#0A2540] hover:bg-[#133E68] border-none"
                    >
                      Thêm vai trò
                    </Button>
                  </div>

                  <Table
                    dataSource={roles}
                    columns={roleColumns}
                    rowKey="id"
                    loading={isRolesLoading}
                    pagination={{ pageSize: 20 }}
                    className="border border-slate-100 rounded-lg overflow-hidden"
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modals & Drawers */}
      <UserModal />
      <UserDetailDrawer />
      <RoleModal />
      <PermissionMatrixModal />
      <UserRoleModal />
    </div>
  );
}
