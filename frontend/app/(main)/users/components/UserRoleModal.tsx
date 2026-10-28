'use client';

import React from 'react';
import { Modal, Checkbox, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '@/services/rbac.service';
import { useRbacStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { queryKeys } from '@/lib/query-keys';
import { useUserRoles } from '@/hooks/use-users';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function UserRoleModal() {
  const queryClient = useQueryClient();

  const {
    isUserRoleModalOpen,
    selectedUserForRoles,
    selectedUserRoleIds,
    setSelectedUserRoleIds,
    closeUserRoleModal,
  } = useRbacStore(
    useShallow((s) => ({
      isUserRoleModalOpen: s.isUserRoleModalOpen,
      selectedUserForRoles: s.selectedUserForRoles,
      selectedUserRoleIds: s.selectedUserRoleIds,
      setSelectedUserRoleIds: s.setSelectedUserRoleIds,
      closeUserRoleModal: s.closeUserRoleModal,
    })),
  );

  // 1. Fetch All Roles (Deep Hook with signal)
  const { data: rolesData } = useUserRoles('');
  const roles = rolesData || [];
  const isSuperAdmin = useAuthStore((state) => Boolean(state.user?.roles?.includes('SUPER_ADMIN')));
  const assignableRoles = roles.filter((role) =>
    isSuperAdmin || ['OPERATOR', 'SALES'].includes(role.code),
  );

  const assignUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      return rbacService.assignUserRoles(userId, roleIds);
    },
    onSuccess: () => {
      message.success('Cập nhật vai trò cho người dùng thành công');
      closeUserRoleModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi gán vai trò');
    },
  });

  return (
    <Modal
      title={`Gán vai trò cho: ${selectedUserForRoles?.fullName}`}
      open={isUserRoleModalOpen}
      onCancel={closeUserRoleModal}
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
      destroyOnHidden
    >
      <div className="py-4 space-y-4">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="font-medium text-sm text-slate-800">
            {selectedUserForRoles?.fullName} ({selectedUserForRoles?.employeeCode})
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {selectedUserForRoles?.email}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Chọn các vai trò áp dụng:
          </label>
          <Checkbox.Group
            value={selectedUserRoleIds}
            onChange={(checkedValues) =>
              setSelectedUserRoleIds(checkedValues as string[])
            }
            className="w-full space-y-2"
          >
            {assignableRoles.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Checkbox value={r.id}>
                  <span className="font-medium text-sm text-slate-800">
                    {r.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono ml-2">
                    ({r.code})
                  </span>
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
  );
}
