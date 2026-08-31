import { apiClient } from '@/lib/api-client';
import { rbacService } from '@/services/rbac.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('RbacService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('adapts backend roles to the role shape used by the UI', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([
      {
        id: 'role-1',
        code: 'SALES',
        name: 'Sales',
        isSystem: true,
        rolePermissions: [
          {
            scope: 'OWN',
            permission: { id: 'perm-1', code: 'dossier.view.own', name: 'View own' },
          },
        ],
      },
    ]);

    const roles = await rbacService.getRoles();

    expect(roles[0]).toEqual(
      expect.objectContaining({
        permissionCount: 1,
        permissions: [
          expect.objectContaining({ code: 'dossier.view.own', scope: 'OWN' }),
        ],
      }),
    );
  });

  it('sends permission ids and scopes required by the backend DTO', async () => {
    (apiClient.put as jest.Mock).mockResolvedValueOnce({ message: 'ok' });

    await rbacService.assignRolePermissions('role-1', [
      { permissionId: 'perm-1', scope: 'ALL' },
    ]);

    expect(apiClient.put).toHaveBeenCalledWith('/roles/role-1/permissions', {
      permissions: [{ permissionId: 'perm-1', scope: 'ALL' }],
    });
  });
});

