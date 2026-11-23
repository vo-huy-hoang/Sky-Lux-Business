import { DossierItem } from '@/types/dossier';
import {
  isExecutiveAdmin,
  isOperator as checkIsOperator,
  isPlatformSuperAdmin,
} from './authorization-policy';

export interface UserContextForDelete {
  id?: string;
  roles?: string[];
  permissions?: string[];
}

export interface DossierDeleteEligibility {
  canDelete: boolean;
  disableReason: string | null;
  isApprovedOrCompleted: boolean;
  hasActivePayments: boolean;
}

/**
 * Domain policy utility: Evaluates whether a user can delete a dossier
 * based on RBAC permissions, financial payment guard, and lifecycle status.
 */
export function getDossierDeleteEligibility(
  dossier: Partial<DossierItem> | null | undefined,
  user: UserContextForDelete | null | undefined,
  options?: {
    hasPermission?: (permission: string) => boolean;
    hasRole?: (role: string | string[]) => boolean;
    hasPayments?: boolean;
  },
): DossierDeleteEligibility {
  if (!dossier?.id) {
    return {
      canDelete: false,
      disableReason: 'Hồ sơ không hợp lệ',
      isApprovedOrCompleted: false,
      hasActivePayments: false,
    };
  }

  const canDeletePermission =
    typeof options?.hasPermission === 'function'
      ? options.hasPermission('dossier.delete')
      : Boolean(user?.permissions?.includes('dossier.delete'));

  const isCeoOrAdmin =
    typeof options?.hasRole === 'function'
      ? options.hasRole(['SUPER_ADMIN', 'CEO_ADMIN'])
      : isExecutiveAdmin(user);

  const isOperator =
    typeof options?.hasRole === 'function'
      ? options.hasRole('OPERATOR')
      : checkIsOperator(user);

  const isOwner =
    dossier.salesUserId === user?.id || dossier.createdBy === user?.id;

  const isLocked = dossier.status === 'LOCKED';
  const isApprovedOrCompleted =
    dossier.status === 'APPROVED' || dossier.status === 'COMPLETED';

  const hasActivePayments = Boolean(
    options?.hasPayments ||
      dossier.hasPayments ||
      Number(dossier.totalPaid ?? 0) > 0,
  );

  let canDelete = false;
  let disableReason: string | null = null;

  if (!canDeletePermission) {
    disableReason = 'Bạn không có quyền xóa hồ sơ';
  } else if (hasActivePayments) {
    disableReason = 'Không thể xóa hồ sơ đã phát sinh phiếu thu tiền thực tế';
  } else if (isLocked && !isPlatformSuperAdmin(user)) {
    disableReason = 'Hồ sơ đã khóa, chỉ Quản trị viên cấp cao mới có thể xóa';
  } else if (isApprovedOrCompleted && !isCeoOrAdmin) {
    disableReason =
      'Chỉ Ban Giám Đốc mới có quyền xóa hồ sơ đã duyệt hoặc hoàn tất';
  } else if (!isCeoOrAdmin && !isOperator && !isOwner) {
    disableReason = 'Bạn chỉ được xóa hồ sơ do mình phụ trách';
  } else {
    canDelete = true;
  }

  return {
    canDelete,
    disableReason,
    isApprovedOrCompleted,
    hasActivePayments,
  };
}
