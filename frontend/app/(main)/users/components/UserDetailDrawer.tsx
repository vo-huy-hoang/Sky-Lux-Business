'use client';

import React from 'react';
import {
  Drawer,
  Avatar,
  Tag,
  Descriptions,
  Space,
  Button,
  Divider,
  Popconfirm,
  message,
  Spin,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { usersService } from '@/services/users.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { queryKeys } from '@/lib/query-keys';
import { themeTokens } from '@/lib/theme/tokens.config';

export default function UserDetailDrawer() {
  const queryClient = useQueryClient();

  const {
    isUserDrawerOpen,
    selectedUserForDetail,
    closeUserDetail,
    openEditUser,
    openUserRoles,
  } = useRbacStore(
    useShallow((s) => ({
      isUserDrawerOpen: s.isUserDrawerOpen,
      selectedUserForDetail: s.selectedUserForDetail,
      closeUserDetail: s.closeUserDetail,
      openEditUser: s.openEditUser,
      openUserRoles: s.openUserRoles,
    })),
  );

  const userId = selectedUserForDetail?.id;



  // 1. Fetch Fresh User Details (API-USERS-002)
  const { data: userDetail, isLoading } = useQuery({
    queryKey: queryKeys.users.detail(userId || undefined),
    queryFn: ({ signal }) => usersService.getUser(userId!, { signal }),
    enabled: !!userId && isUserDrawerOpen,
  });

  const user = userDetail || selectedUserForDetail;

  // 2. Lock Mutation (API-USERS-005)
  const lockMutation = useMutation({
    mutationFn: (id: string) => usersService.lockUser(id),
    onSuccess: () => {
      message.success('Đã khóa tài khoản thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi khóa tài khoản');
    },
  });

  // 3. Unlock Mutation (API-USERS-006)
  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersService.unlockUser(id),
    onSuccess: () => {
      message.success('Đã mở khóa tài khoản thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi mở khóa tài khoản');
    },
  });


  // 4. Delete Mutation (API-USERS-007)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      message.success('Đã xóa người dùng thành công');
      closeUserDetail();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi xóa người dùng');
    },
  });

  if (!user) return null;

  return (
    <Drawer
      title="Chi tiết hồ sơ nhân viên"
      placement="right"
      styles={{ wrapper: { width: 540, maxWidth: '100vw' } }}
      onClose={closeUserDetail}
      open={isUserDrawerOpen}
      extra={
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              closeUserDetail();
              openEditUser(user);
            }}
          >
            Sửa
          </Button>
        </Space>
      }
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Header Profile Card */}
          <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
            <Avatar
              size={64}
              src={user.avatarUrl}
              icon={<UserOutlined />}
              style={{ backgroundColor: themeTokens.brand.primary[900] }}
              className="shadow-sm"
            >
              {user.fullName?.charAt(0)}
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800 m-0">
                  {user.fullName}
                </h3>
                <Tag
                  color={
                    user.status === 'ACTIVE'
                      ? 'success'
                      : user.status === 'LOCKED'
                      ? 'error'
                      : 'default'
                  }
                  className="font-semibold"
                >
                  {user.status === 'ACTIVE'
                    ? 'Hoạt động'
                    : user.status === 'LOCKED'
                    ? 'Bị khóa'
                    : 'Chưa kích hoạt'}
                </Tag>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Mã NV: <span className="font-semibold text-slate-700">{user.employeeCode}</span>
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <Descriptions
            title={<span className="text-sm font-bold text-slate-800">Thông tin liên hệ & Công tác</span>}
            column={1}
            bordered
            size="small"
          >
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {user.phone || <span className="text-slate-400">Chưa cập nhật</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Phòng ban">
              {user.department?.name || <span className="text-slate-400">Chưa phân bổ</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Lần đăng nhập cuối">
              {user.lastLoginAt
                ? dayjs(user.lastLoginAt).format('DD/MM/YYYY HH:mm:ss')
                : <span className="text-slate-400">Chưa từng đăng nhập</span>}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo tài khoản">
              {dayjs(user.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>

          {/* Assigned Roles Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <SafetyCertificateOutlined className="text-blue-600" /> Vai trò đảm nhiệm
              </span>
              <Button
                type="link"
                size="small"
                icon={<KeyOutlined />}
                onClick={() => {
                  closeUserDetail();
                  openUserRoles(user, user.roles?.map((r) => r.id) || []);
                }}
              >
                Thay đổi vai trò
              </Button>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              {user.roles && user.roles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Tag
                      key={role.id}
                      color="blue"
                      className="px-2.5 py-1 text-xs font-semibold rounded-md"
                    >
                      {role.name} ({role.code})
                    </Tag>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">Chưa được gán vai trò nào.</span>
              )}
            </div>
          </div>

          <Divider className="my-2" />

          {/* Quick Security Actions */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-800">Thao tác tài khoản</span>
            <div className="flex flex-wrap gap-3">
              {user.status === 'LOCKED' ? (
                <Button
                  icon={<UnlockOutlined />}
                  onClick={() => unlockMutation.mutate(user.id)}
                  loading={unlockMutation.isPending}
                  className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                >
                  Mở khóa tài khoản
                </Button>
              ) : (
                <Popconfirm
                  title="Khóa tài khoản nhân viên?"
                  description="Nhân viên sẽ bị đăng xuất khỏi tất cả thiết bị ngay lập tức."
                  onConfirm={() => lockMutation.mutate(user.id)}
                  okText="Khóa tài khoản"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<LockOutlined />}
                    loading={lockMutation.isPending}
                  >
                    Khóa tài khoản
                  </Button>
                </Popconfirm>
              )}

              <Popconfirm
                title="Xác nhận xóa nhân viên này?"
                description="Tài khoản sẽ bị vô hiệu hóa và chuyển vào danh sách lưu trữ."
                onConfirm={() => deleteMutation.mutate(user.id)}
                okText="Xóa vĩnh viễn"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                >
                  Xóa tài khoản
                </Button>
              </Popconfirm>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
