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
  Typography,
  Avatar,
  Badge,
  Tooltip,
} from 'antd';
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  SearchOutlined,
  UserOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  rbacService,
  RoleItem,
  UserItem,
} from '@/services/rbac.service';
import { useRbacStore } from './store';
import RoleModal from './components/RoleModal';
import PermissionMatrixModal from './components/PermissionMatrixModal';
import UserRoleModal from './components/UserRoleModal';

const { Title, Text } = Typography;

export default function UsersAndRbacPage() {
  // Zustand Store
  const {
    activeTab,
    setActiveTab,
    userSearch,
    setUserSearch,
    roleSearch,
    setRoleSearch,
    openCreateRole,
    openEditRole,
    openPermMatrix,
    openUserRoles,
  } = useRbacStore();

  // 1. Fetch Users
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => rbacService.getUsers(),
  });

  // 2. Fetch Roles
  const { data: rolesData, isLoading: isRolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ['roles', roleSearch],
    queryFn: () => rbacService.getRoles({ search: roleSearch }),
  });
  const roles = rolesData?.items || [];

  // Filtered Users
  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.employeeCode.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // Columns for Users Table
  const userColumns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: UserItem) => (
        <Space size={12}>
          <Avatar
            style={{ backgroundColor: '#0A2540' }}
            src={record.avatarUrl}
            icon={<UserOutlined />}
          >
            {record.fullName.charAt(0)}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800">{record.fullName}</div>
            <div className="text-xs text-slate-500 font-mono">{record.employeeCode}</div>
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
          <div className="text-xs text-slate-400">{record.phone || 'Chưa có SĐT'}</div>
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
        <Tag color={status === 'ACTIVE' ? 'success' : 'error'}>
          {status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, record: UserItem) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<KeyOutlined />}
          onClick={() => openUserRoles(record, record.roles?.map((r) => r.id) || [])}
          className="text-xs"
        >
          Gán vai trò
        </Button>
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
      render: (name: string) => <span className="font-semibold text-slate-800">{name}</span>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => <span className="text-slate-500 text-xs">{desc || '—'}</span>,
    },
    {
      title: 'Số quyền hạn',
      key: 'permCount',
      render: (_: any, record: RoleItem) => (
        <Badge
          count={record.permissionCount || 0}
          overflowCount={999}
          style={{ backgroundColor: record.permissionCount > 0 ? '#10B981' : '#94A3B8' }}
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
            onClick={() => openPermMatrix(record, record.permissions?.map((p) => p.code) || [])}
            className="bg-[#0A2540] hover:bg-[#133E68] border-none text-xs"
          >
            Phân quyền
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <Title level={3} style={{ marginBottom: 2, color: '#0F172A' }}>
            Quản trị Người dùng & Phân quyền (RBAC)
          </Title>
          <Text type="secondary" className="text-sm">
            Quản lý tài khoản nhân viên, thiết lập vai trò và cấu hình ma trận quyền hạn bảo mật.
          </Text>
        </div>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { refetchUsers(); refetchRoles(); }}>
            Làm mới
          </Button>
          {activeTab === 'roles' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateRole}
              className="bg-[#0A2540] hover:bg-[#133E68] border-none"
            >
              Tạo vai trò mới
            </Button>
          )}
        </Space>
      </div>

      {/* Main Tabbed Card */}
      <Card className="shadow-xs border-slate-200" styles={{ body: { padding: '20px 24px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <span className="font-semibold text-sm flex items-center gap-2">
                  <TeamOutlined /> Danh sách Người dùng ({users.length})
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center gap-4">
                    <Input
                      placeholder="Tìm theo tên, email, mã nhân viên..."
                      prefix={<SearchOutlined className="text-slate-400" />}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="max-w-md"
                      allowClear
                    />
                  </div>

                  <Table
                    dataSource={filteredUsers}
                    columns={userColumns}
                    rowKey="id"
                    loading={isUsersLoading}
                    pagination={{ pageSize: 15, showTotal: (total) => `Tổng số ${total} người dùng` }}
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

      {/* Custom Modal Components */}
      <RoleModal />
      <PermissionMatrixModal />
      <UserRoleModal />
    </div>
  );
}
