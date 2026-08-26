'use client';

import React, { useState } from 'react';
import {
  Tabs,
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  Checkbox,
  message,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  Divider,
  Row,
  Col,
  Select,
} from 'antd';
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rbacService,
  RoleItem,
  UserItem,
  PermissionItem,
} from '@/services/rbac.service';

const { Title, Text, Paragraph } = Typography;

export default function UsersAndRbacPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');

  // State for Role Creation & Editing
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleForm] = Form.useForm();

  // State for Permission Assignment Matrix Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<RoleItem | null>(null);
  const [selectedPermCodes, setSelectedPermCodes] = useState<string[]>([]);

  // State for User Role Assignment Modal
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<UserItem | null>(null);
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<string[]>([]);

  // Search queries
  const [userSearch, setUserSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

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

  // 3. Fetch Permissions
  const { data: permsData, isLoading: isPermsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rbacService.getPermissions({ limit: 150 }),
  });
  const permissionsByModule = permsData?.modules || {};

  // Mutation: Save Role (Create or Update)
  const saveRoleMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editingRole) {
        return rbacService.updateRole(editingRole.id, values);
      } else {
        return rbacService.createRole(values);
      }
    },
    onSuccess: () => {
      message.success(editingRole ? 'Cập nhật vai trò thành công' : 'Tạo vai trò mới thành công');
      setIsRoleModalOpen(false);
      setEditingRole(null);
      roleForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Thao tác thất bại');
    },
  });

  // Mutation: Assign Permissions to Role
  const assignPermsMutation = useMutation({
    mutationFn: async ({ roleId, codes }: { roleId: string; codes: string[] }) => {
      return rbacService.assignRolePermissions(roleId, codes);
    },
    onSuccess: () => {
      message.success('Cập nhật quyền cho vai trò thành công');
      setIsPermModalOpen(false);
      setSelectedRoleForPerms(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi gán quyền');
    },
  });

  // Mutation: Assign Roles to User
  const assignUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      return rbacService.assignUserRoles(userId, roleIds);
    },
    onSuccess: () => {
      message.success('Cập nhật vai trò cho người dùng thành công');
      setIsUserRoleModalOpen(false);
      setSelectedUserForRoles(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi gán vai trò');
    },
  });

  // Handlers for Role Modal
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    roleForm.resetFields();
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: RoleItem) => {
    setEditingRole(role);
    roleForm.setFieldsValue({
      code: role.code,
      name: role.name,
      description: role.description,
    });
    setIsRoleModalOpen(true);
  };

  // Handlers for Permission Matrix Modal
  const handleOpenPermMatrix = async (role: RoleItem) => {
    setSelectedRoleForPerms(role);
    try {
      const detailed = await rbacService.getRole(role.id);
      const codes = detailed.permissions?.map((p) => p.code) || [];
      setSelectedPermCodes(codes);
    } catch {
      setSelectedPermCodes(role.permissions?.map((p) => p.code) || []);
    }
    setIsPermModalOpen(true);
  };

  // Handlers for User Role Modal
  const handleOpenUserRoles = (user: UserItem) => {
    setSelectedUserForRoles(user);
    setSelectedUserRoleIds(user.roles?.map((r) => r.id) || []);
    setIsUserRoleModalOpen(true);
  };

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
          onClick={() => handleOpenUserRoles(record)}
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
              onClick={() => handleOpenEditRole(record)}
            />
          </Tooltip>
          <Button
            size="small"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => handleOpenPermMatrix(record)}
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
              onClick={handleOpenCreateRole}
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
                      onClick={handleOpenCreateRole}
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT ROLE */}
      {/* ========================================================================= */}
      <Modal
        title={editingRole ? `Chỉnh sửa vai trò: ${editingRole.name}` : 'Tạo vai trò mới'}
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        confirmLoading={saveRoleMutation.isPending}
        okText={editingRole ? 'Lưu thay đổi' : 'Tạo vai trò'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={(values) => saveRoleMutation.mutate(values)}
          className="pt-3"
        >
          {!editingRole && (
            <Form.Item
              name="code"
              label={<span className="font-medium">Mã vai trò (Code)</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập mã vai trò' },
                { pattern: /^[A-Z0-9_]+$/, message: 'Chỉ chữ hoa, số và gạch dưới (VD: SALES_LEAD)' },
              ]}
              extra="Mã định danh duy nhất trong tổ chức (không thể đổi sau khi tạo)"
            >
              <Input placeholder="VD: SALES_LEAD" />
            </Form.Item>
          )}

          <Form.Item
            name="name"
            label={<span className="font-medium">Tên hiển thị của vai trò</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
          >
            <Input placeholder="VD: Trưởng nhóm Kinh Doanh" />
          </Form.Item>

          <Form.Item name="description" label={<span className="font-medium">Mô tả</span>}>
            <Input.TextArea rows={3} placeholder="Mô tả phạm vi trách nhiệm và quyền hạn..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: PERMISSION MATRIX CHECKBOXES */}
      {/* ========================================================================= */}
      <Modal
        title={
          <div>
            <div className="text-base font-bold text-slate-800">
              Phân quyền cho vai trò: {selectedRoleForPerms?.name}
            </div>
            <div className="text-xs text-slate-500 font-mono font-normal">
              Mã vai trò: {selectedRoleForPerms?.code}
            </div>
          </div>
        }
        open={isPermModalOpen}
        onCancel={() => setIsPermModalOpen(false)}
        onOk={() => {
          if (selectedRoleForPerms) {
            assignPermsMutation.mutate({
              roleId: selectedRoleForPerms.id,
              codes: selectedPermCodes,
            });
          }
        }}
        confirmLoading={assignPermsMutation.isPending}
        okText="Lưu danh sách quyền"
        cancelText="Đóng"
        width={900}
        destroyOnClose
      >
        <div className="py-2 max-h-[65vh] overflow-y-auto pr-2 space-y-6">
          <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
            <span className="text-xs font-medium text-blue-900">
              Đã chọn: <strong>{selectedPermCodes.length}</strong> quyền
            </span>
            <Space>
              <Button
                size="small"
                onClick={() => {
                  // Select all available permission codes
                  const allCodes = Object.values(permissionsByModule).flatMap((list) =>
                    list.map((p) => p.code),
                  );
                  setSelectedPermCodes(allCodes);
                }}
              >
                Chọn tất cả
              </Button>
              <Button size="small" onClick={() => setSelectedPermCodes([])}>
                Bỏ chọn hết
              </Button>
            </Space>
          </div>

          {Object.entries(permissionsByModule).map(([moduleName, permList]) => {
            const moduleCodes = permList.map((p) => p.code);
            const isAllSelected = moduleCodes.every((c) => selectedPermCodes.includes(c));
            const isSomeSelected = moduleCodes.some((c) => selectedPermCodes.includes(c));

            return (
              <Card
                key={moduleName}
                size="small"
                title={
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">
                      Phân hệ: {moduleName}
                    </span>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={!isAllSelected && isSomeSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const merged = Array.from(new Set([...selectedPermCodes, ...moduleCodes]));
                          setSelectedPermCodes(merged);
                        } else {
                          setSelectedPermCodes(
                            selectedPermCodes.filter((c) => !moduleCodes.includes(c)),
                          );
                        }
                      }}
                    >
                      <span className="text-xs">Chọn cả nhóm</span>
                    </Checkbox>
                  </div>
                }
                className="border-slate-200 shadow-2xs"
              >
                <Row gutter={[16, 12]}>
                  {permList.map((perm) => (
                    <Col xs={24} sm={12} key={perm.id}>
                      <Checkbox
                        checked={selectedPermCodes.includes(perm.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermCodes([...selectedPermCodes, perm.code]);
                          } else {
                            setSelectedPermCodes(
                              selectedPermCodes.filter((c) => c !== perm.code),
                            );
                          }
                        }}
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-800">{perm.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{perm.code}</div>
                        </div>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Card>
            );
          })}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ASSIGN ROLES TO USER */}
      {/* ========================================================================= */}
      <Modal
        title={`Gán vai trò cho: ${selectedUserForRoles?.fullName}`}
        open={isUserRoleModalOpen}
        onCancel={() => setIsUserRoleModalOpen(false)}
        onOk={() => {
          if (selectedUserForRoles) {
            assignUserRolesMutation.mutate({
              userId: selectedUserForRoles.id,
              roleIds: selectedUserRoleIds,
            });
          }
        }}
        confirmLoading={assignUserRolesMutation.isPending}
        okText="Lưu vai trò"
        cancelText="Hủy"
        destroyOnClose
      >
        <div className="py-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="font-medium text-sm text-slate-800">
              {selectedUserForRoles?.fullName} ({selectedUserForRoles?.employeeCode})
            </div>
            <div className="text-xs text-slate-500 font-mono">{selectedUserForRoles?.email}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Chọn các vai trò áp dụng:
            </label>
            <Checkbox.Group
              value={selectedUserRoleIds}
              onChange={(checkedValues) => setSelectedUserRoleIds(checkedValues as string[])}
              className="w-full space-y-2"
            >
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Checkbox value={r.id}>
                    <span className="font-medium text-sm text-slate-800">{r.name}</span>
                    <span className="text-xs text-slate-400 font-mono ml-2">({r.code})</span>
                  </Checkbox>
                  <span className="text-xs text-emerald-600 font-medium">
                    {r.permissionCount} quyền
                  </span>
                </div>
              ))}
            </Checkbox.Group>
          </div>
        </div>
      </Modal>
    </div>
  );
}
