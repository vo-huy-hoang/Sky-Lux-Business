'use client';

import React from 'react';
import {
  App,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Badge,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService, type RoleItem } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { themeTokens } from '@/lib/theme/tokens.config';
import { queryKeys } from '@/lib/query-keys';

export interface RoleTableSectionProps {
  roles: RoleItem[];
  isLoading: boolean;
}

export default function RoleTableSection({
  roles,
  isLoading,
}: RoleTableSectionProps) {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const {
    roleSearch,
    setRoleSearch,
    openCreateRole,
    openEditRole,
    openPermMatrix,
  } = useRbacStore(
    useShallow((s) => ({
      roleSearch: s.roleSearch,
      setRoleSearch: s.setRoleSearch,
      openCreateRole: s.openCreateRole,
      openEditRole: s.openEditRole,
      openPermMatrix: s.openPermMatrix,
    })),
  );

  const deleteRoleMutation = useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      rbacService.deleteRole(id, force),
    onSuccess: () => {
      message.success('Đã xóa vai trò');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.roles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error: any, variables) => {
      if (error?.code === 'ROLE_HAS_ASSIGNED_USERS' && !variables.force) {
        const assignedCount = error?.response?.data?.details?.count;
        modal.confirm({
          title: 'Vai trò đang được gán cho nhân viên',
          content: `Xóa vai trò sẽ gỡ vai trò này khỏi ${assignedCount ?? 'các'} nhân viên đang được gán. Bạn có muốn tiếp tục không?`,
          okText: 'Xóa và gỡ vai trò',
          cancelText: 'Hủy',
          okButtonProps: { danger: true },
          onOk: () => deleteRoleMutation.mutateAsync({ id: variables.id, force: true }),
        });
        return;
      }

      message.error(error?.message || 'Không thể xóa vai trò');
    },
  });

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
              record.permissionCount > 0 ? themeTokens.semantic.success.main : themeTokens.neutral.textSoft,
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
            className="bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-950)] border-none text-xs"
          >
            Phân quyền
          </Button>
          {!record.isSystem && (
            <Popconfirm
              title="Xóa vai trò này?"
              description="Vai trò sẽ bị xóa mềm. Nếu đang được gán, hệ thống sẽ hỏi xác nhận trước khi gỡ khỏi nhân viên."
              onConfirm={() => deleteRoleMutation.mutate({ id: record.id })}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xóa vai trò">
                <Button
                  size="small"
                  danger
                  aria-label={`Xóa vai trò ${record.name}`}
                  icon={<DeleteOutlined />}
                  loading={
                    deleteRoleMutation.isPending &&
                    deleteRoleMutation.variables?.id === record.id
                  }
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
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
          className="bg-[var(--color-primary-900)] hover:bg-[var(--color-primary-950)] border-none"
        >
          Thêm vai trò
        </Button>
      </div>

      <Table
        dataSource={roles}
        columns={roleColumns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        className="border border-slate-100 rounded-lg overflow-hidden"
        scroll={{ x: 700 }}
      />
    </div>
  );
}
