'use client';

import React, { useEffect } from 'react';
import { Modal, Card, Checkbox, Row, Col, Space, Button, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '@/services/rbac.service';
import { useRbacStore } from '../store';

export default function PermissionMatrixModal() {
  const queryClient = useQueryClient();

  const {
    isPermModalOpen,
    selectedRoleForPerms,
    selectedPermCodes,
    setSelectedPermCodes,
    closePermModal,
  } = useRbacStore();

  // 1. Fetch All Permissions
  const { data: permsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => rbacService.getPermissions({ limit: 150 }),
  });
  const permissionsByModule = permsData?.modules || {};

  // 2. Fetch Detailed Role Permissions
  const selectedRoleId = selectedRoleForPerms?.id;
  const { data: detailedRole } = useQuery({
    queryKey: ['role-details', selectedRoleId],
    queryFn: () => rbacService.getRole(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  // Sync detailed permission codes to store state when details query loads
  useEffect(() => {
    if (detailedRole) {
      const codes = detailedRole.permissions?.map((p) => p.code) || [];
      setSelectedPermCodes(codes);
    }
  }, [detailedRole, setSelectedPermCodes]);

  const assignPermsMutation = useMutation({
    mutationFn: async ({ roleId, codes }: { roleId: string; codes: string[] }) => {
      return rbacService.assignRolePermissions(roleId, codes);
    },
    onSuccess: () => {
      message.success('Cập nhật quyền cho vai trò thành công');
      closePermModal();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err: any) => {
      message.error(err.message || 'Lỗi khi gán quyền');
    },
  });

  return (
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
      onCancel={closePermModal}
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
      destroyOnHidden
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
                const allCodes = Object.values(permissionsByModule).flatMap(
                  (list) => list.map((p) => p.code),
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
          const isAllSelected = moduleCodes.every((c) =>
            selectedPermCodes.includes(c),
          );
          const isSomeSelected = moduleCodes.some((c) =>
            selectedPermCodes.includes(c),
          );

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
                        const merged = Array.from(
                          new Set([...selectedPermCodes, ...moduleCodes]),
                        );
                        setSelectedPermCodes(merged);
                      } else {
                        setSelectedPermCodes(
                          selectedPermCodes.filter(
                            (c) => !moduleCodes.includes(c),
                          ),
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
                        <div className="font-semibold text-xs text-slate-800">
                          {perm.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {perm.code}
                        </div>
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
  );
}
