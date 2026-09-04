'use client';

import React from 'react';
import { Table, Button, Tag, Space, Input, Badge, Tooltip } from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { RoleItem } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';

export interface RoleTableSectionProps {
  roles: RoleItem[];
  isLoading: boolean;
}

export default function RoleTableSection({
  roles,
  isLoading,
}: RoleTableSectionProps) {
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
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        className="border border-slate-100 rounded-lg overflow-hidden"
      />
    </div>
  );
}
