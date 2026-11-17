import { In, EntityManager } from 'typeorm';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { RolePermission } from '../../modules/permissions/entities/role-permission.entity';
import { RoleScope } from '../../common/enums';

export const BASELINE_ROLE_PERMISSIONS: Record<string, string[]> = {
  SALES: [
    'dashboard.sales',
    'dossier.view.own',
    'dossier.view.team',
    'dossier.create',
    'dossier.update',
    'dossier.submit',
    'estimate.create',
    'estimate.update',
    'estimate.view',
    'import.manage',
    'customer.manage',
    'supplier.manage',
    'task.view',
    'task.manage',
    'user.view',
    'chat.access',
    'master_data.view',
    'kpi.manage',
    'kpi.view',
    'document.view',
    'approval.view',
    'department.view',
    'report.view',
  ],
  OPERATOR: [
    'dashboard.operator',
    'dossier.view.all',
    'dossier.view.team',
    'dossier.update',
    'dossier.approve',
    'customer.manage',
    'estimate.view',
    'estimate.update',
    'import.manage',
    'supplier.manage',
    'task.view',
    'task.manage',
    'user.view',
    'chat.access',
    'master_data.view',
    'kpi.view',
    'kpi.view.team',
    'document.view',
    'approval.view',
    'department.view',
    'department.manage',
    'report.view',
  ],
  CEO_ADMIN: [
    'dashboard.ceo',
    'dossier.view.all',
    'dossier.view.team',
    'dossier.view.own',
    'dossier.create',
    'dossier.update',
    'dossier.submit',
    'dossier.approve',
    'dossier.lock',
    'estimate.view',
    'estimate.update',
    'estimate.create',
    'import.manage',
    'document.view',
    'document.manage',
    'customer.manage',
    'supplier.view',
    'supplier.manage',
    'finance.view',
    'finance.manage',
    'report.view',
    'report.view.team',
    'report.view.all',
    'report.manage',
    'report.export',
    'approval.view',
    'audit.view',
    'task.view',
    'task.manage',
    'chat.access',
    'kpi.view',
    'kpi.view.team',
    'kpi.view.all',
    'kpi.manage',
    'user.view',
    'user.create',
    'user.update',
    'user.manage',
    'role.manage',
    'department.view',
    'department.manage',
    'master_data.view',
  ],
};

/**
 * Reusable deep seam: ensures canonical baseline permissions are persisted for a given role entity.
 */
export async function syncBaselinePermissionsForRole(
  manager: EntityManager,
  role: { id: string; code: string },
): Promise<void> {
  const baselineCodes = BASELINE_ROLE_PERMISSIONS[role.code];
  if (!baselineCodes || baselineCodes.length === 0) {
    return;
  }

  if (!manager || typeof manager.getRepository !== 'function') {
    return;
  }

  const permissionRepo = manager.getRepository(Permission);
  const rolePermRepo = manager.getRepository(RolePermission);

  if (
    !permissionRepo ||
    typeof permissionRepo.find !== 'function' ||
    !rolePermRepo ||
    typeof rolePermRepo.find !== 'function' ||
    typeof rolePermRepo.create !== 'function' ||
    typeof rolePermRepo.save !== 'function'
  ) {
    return;
  }

  const permissions = await permissionRepo.find({
    where: { code: In(baselineCodes) },
  });

  if (permissions.length === 0) return;

  const existing = await rolePermRepo.find({
    where: { roleId: role.id },
    select: { permissionId: true },
  });
  const existingPermIds = new Set(existing.map((rp) => rp.permissionId));

  const toInsert = permissions
    .filter((p) => !existingPermIds.has(p.id))
    .map((p) =>
      rolePermRepo.create({
        roleId: role.id,
        permissionId: p.id,
        scope: RoleScope.ALL,
      }),
    );

  if (toInsert.length > 0) {
    await rolePermRepo.save(toInsert);
  }
}
