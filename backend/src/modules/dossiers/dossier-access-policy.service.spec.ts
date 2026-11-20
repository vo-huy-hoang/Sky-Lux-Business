import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DossierAccessPolicyService } from './dossier-access-policy.service';
import { Dossier } from './entities/dossier.entity';
import { DossierStatus } from '../../common/enums';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('DossierAccessPolicyService', () => {
  let policy: DossierAccessPolicyService;

  const mockDossierRepo = {
    findOne: jest.fn(),
  };

  const orgId = 'org-1';
  const baseUser: CurrentUserPayload = {
    id: 'user-sales-1',
    organizationId: orgId,
    employeeCode: 'E01',
    fullName: 'Sales One',
    email: 'sales1@skylux.vn',
    roles: ['SALES'],
    permissions: ['dossier.view.own'],
    departmentId: 'dept-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossierAccessPolicyService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepo,
        },
      ],
    }).compile();

    policy = module.get(DossierAccessPolicyService);
  });

  it('allows SUPER_ADMIN, *, or dossier.view.all across the same organization', async () => {
    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dos-1',
      organizationId: orgId,
      salesUserId: 'other-user',
    });

    await expect(
      policy.assertCanView({ ...baseUser, permissions: ['dossier.view.all'] }, 'dos-1'),
    ).resolves.toMatchObject({ id: 'dos-1' });

    await expect(
      policy.assertCanView({ ...baseUser, permissions: ['*'] }, 'dos-1'),
    ).resolves.toMatchObject({ id: 'dos-1' });

    await expect(
      policy.assertCanView(
        { ...baseUser, roles: ['SUPER_ADMIN'], permissions: [] },
        'dos-1',
      ),
    ).resolves.toMatchObject({ id: 'dos-1' });
  });

  it('allows own scope only when user is salesUserId, operatorUserId, or createdBy', async () => {
    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dos-1',
      organizationId: orgId,
      salesUserId: 'sales-2',
      operatorUserId: 'user-sales-1',
      createdBy: 'sales-2',
    });

    await expect(policy.assertCanView(baseUser, 'dos-1')).resolves.toMatchObject({
      id: 'dos-1',
    });

    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dos-2',
      organizationId: orgId,
      salesUserId: 'sales-2',
      operatorUserId: 'op-2',
      createdBy: 'sales-2',
    });

    await expect(policy.assertCanView(baseUser, 'dos-2')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('allows team scope when salesUser or operatorUser shares departmentId in same org', async () => {
    const teamUser: CurrentUserPayload = {
      ...baseUser,
      permissions: ['dossier.view.team'],
      departmentId: 'dept-hcm',
    };

    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dos-team',
      organizationId: orgId,
      salesUserId: 'colleague',
      salesUser: { organizationId: orgId, departmentId: 'dept-hcm' },
      operatorUser: null,
    });
    await expect(policy.assertCanView(teamUser, 'dos-team')).resolves.toMatchObject({
      id: 'dos-team',
    });

    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dos-other-dept',
      organizationId: orgId,
      salesUserId: 'colleague-hn',
      salesUser: { organizationId: orgId, departmentId: 'dept-hn' },
      operatorUser: { organizationId: orgId, departmentId: 'dept-hn' },
    });
    await expect(
      policy.assertCanView(teamUser, 'dos-other-dept'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects cross-organization dossier entities even when user ids match', () => {
    const foreignDossier = {
      id: 'dos-foreign',
      organizationId: 'org-2',
      salesUserId: baseUser.id,
    };

    expect(
      policy.canViewDossier(
        { ...baseUser, permissions: ['dossier.view.all'] },
        foreignDossier,
      ),
    ).toBe(false);
  });

  it('applies 1 = 0 fail-closed filter in applyVisibilityScope when user has no dossier scope', () => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    } as any;

    policy.applyVisibilityScope(qb, 'dossier', {
      ...baseUser,
      permissions: ['estimate.view'],
      roles: ['SALES'],
    });

    expect(qb.andWhere).toHaveBeenCalledWith('1 = 0', {});
  });

  it('uses snake_case columns on raw users alias u_team in QueryBuilder fallback subquery', () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
    } as any;

    policy.applyVisibilityScope(qb, 'dossier', {
      ...baseUser,
      permissions: ['dossier.view.team'],
      roles: ['SALES'],
      departmentId: 'dept-1',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('u_team.organization_id = dossier.organizationId'),
      expect.objectContaining({ departmentId: 'dept-1' }),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('u_team.department_id = :departmentId'),
      expect.objectContaining({ departmentId: 'dept-1' }),
    );
  });

  describe('isAdmin & hasViewAllAccess', () => {
    it('recognizes SUPER_ADMIN, CEO_ADMIN, DIRECTOR, ADMIN roles as admin', () => {
      expect(policy.isAdmin({ ...baseUser, roles: ['SUPER_ADMIN'] })).toBe(true);
      expect(policy.isAdmin({ ...baseUser, roles: ['CEO_ADMIN'] })).toBe(true);
      expect(policy.isAdmin({ ...baseUser, roles: ['DIRECTOR'] })).toBe(true);
      expect(policy.isAdmin({ ...baseUser, roles: ['ADMIN'] })).toBe(true);
      expect(policy.isAdmin({ ...baseUser, roles: ['SALES'] })).toBe(false);
      expect(policy.isAdmin({ ...baseUser, roles: ['OPERATOR'] })).toBe(false);
    });

    it('recognizes wildcard * or dossier.manage.all permission as admin', () => {
      expect(policy.isAdmin({ ...baseUser, permissions: ['*'], roles: [] })).toBe(true);
      expect(
        policy.isAdmin({ ...baseUser, permissions: ['dossier.manage.all'], roles: [] }),
      ).toBe(true);
    });

    it('hasViewAllAccess returns true for admin or dossier.view.all', () => {
      expect(policy.hasViewAllAccess({ ...baseUser, roles: ['SUPER_ADMIN'] })).toBe(true);
      expect(
        policy.hasViewAllAccess({ ...baseUser, permissions: ['dossier.view.all'], roles: [] }),
      ).toBe(true);
      expect(
        policy.hasViewAllAccess({ ...baseUser, permissions: ['dossier.view.own'], roles: ['SALES'] }),
      ).toBe(false);
      expect(
        policy.hasViewAllAccess({ ...baseUser, permissions: ['dossier.view.team'], roles: ['OPERATOR'] }),
      ).toBe(false);
    });
  });

  describe('assertCanMutate', () => {
    const activeDossier = {
      id: 'dos-mutate',
      organizationId: orgId,
      salesUserId: baseUser.id,
      operatorUserId: null,
      status: DossierStatus.DRAFT,
    };

    it('throws NotFoundException (404) if user cannot view dossier (anti-enumeration)', () => {
      const foreignDossier = { ...activeDossier, organizationId: 'foreign-org' };
      expect(() =>
        policy.assertCanMutate(baseUser, foreignDossier, 'dos-mutate'),
      ).toThrow(NotFoundException);

      const unownedDossier = { ...activeDossier, salesUserId: 'other-user' };
      expect(() =>
        policy.assertCanMutate(baseUser, unownedDossier, 'dos-mutate'),
      ).toThrow(NotFoundException);
    });

    it('throws BadRequestException (400) if dossier is LOCKED', () => {
      const lockedDossier = { ...activeDossier, status: DossierStatus.LOCKED };
      expect(() =>
        policy.assertCanMutate(
          { ...baseUser, roles: ['CEO_ADMIN'] },
          lockedDossier,
          'dos-mutate',
        ),
      ).toThrow(BadRequestException);
    });

    it('throws ForbiddenException (403) if user is not admin and lacks edit assignment/permission', () => {
      const viewerUser: CurrentUserPayload = {
        ...baseUser,
        id: 'viewer-1',
        roles: ['SALES'],
        permissions: ['dossier.view.all'],
      };
      expect(() =>
        policy.assertCanMutate(viewerUser, activeDossier, 'dos-mutate'),
      ).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if unassigned sales user has dossier.update but is not owner/operator', () => {
      const colleagueSales: CurrentUserPayload = {
        ...baseUser,
        id: 'sales-2',
        roles: ['SALES'],
        permissions: ['dossier.view.all', 'dossier.update'],
      };
      expect(() =>
        policy.assertCanMutate(colleagueSales, activeDossier, 'dos-mutate'),
      ).toThrow(ForbiddenException);
    });

    it('allows mutation if user is assigned salesUser with dossier.update permission', () => {
      const salesUserWithUpdate: CurrentUserPayload = {
        ...baseUser,
        permissions: ['dossier.view.own', 'dossier.update'],
      };
      expect(() =>
        policy.assertCanMutate(salesUserWithUpdate, activeDossier, 'dos-mutate'),
      ).not.toThrow();
    });

    it('allows mutation if user is CEO_ADMIN or has dossier.manage.all', () => {
      const adminUser: CurrentUserPayload = {
        ...baseUser,
        id: 'admin-1',
        roles: ['CEO_ADMIN'],
        permissions: [],
      };
      expect(() =>
        policy.assertCanMutate(adminUser, activeDossier, 'dos-mutate'),
      ).not.toThrow();
    });
  });

  describe('assertCanDelete', () => {
    const draftDossier = {
      id: 'dos-del',
      organizationId: orgId,
      salesUserId: baseUser.id,
      operatorUserId: 'op-1',
      status: DossierStatus.DRAFT,
    };

    it('throws NotFoundException (404) if user cannot view dossier', () => {
      const unownedDossier = { ...draftDossier, salesUserId: 'other-user', operatorUserId: null };
      expect(() =>
        policy.assertCanDelete(baseUser, unownedDossier, 'dos-del'),
      ).toThrow(NotFoundException);
    });

    it('throws BadRequestException if LOCKED and user is not SUPER_ADMIN', () => {
      const lockedDossier = { ...draftDossier, status: DossierStatus.LOCKED };
      expect(() =>
        policy.assertCanDelete(
          { ...baseUser, roles: ['CEO_ADMIN'] },
          lockedDossier,
          'dos-del',
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        policy.assertCanDelete(
          { ...baseUser, roles: ['SUPER_ADMIN'] },
          lockedDossier,
          'dos-del',
        ),
      ).not.toThrow();
    });

    it('throws BadRequestException if APPROVED or COMPLETED and user is not admin', () => {
      const approvedDossier = { ...draftDossier, status: DossierStatus.APPROVED };
      expect(() =>
        policy.assertCanDelete(baseUser, approvedDossier, 'dos-del'),
      ).toThrow(BadRequestException);

      const completedDossier = { ...draftDossier, status: DossierStatus.COMPLETED };
      expect(() =>
        policy.assertCanDelete(baseUser, completedDossier, 'dos-del'),
      ).toThrow(BadRequestException);

      expect(() =>
        policy.assertCanDelete(
          { ...baseUser, roles: ['CEO_ADMIN'] },
          approvedDossier,
          'dos-del',
        ),
      ).not.toThrow();
    });

    it('throws ForbiddenException if non-owner/operator/admin attempts to delete SUBMITTED or IN_REVIEW dossier', () => {
      const viewerUser: CurrentUserPayload = {
        ...baseUser,
        id: 'viewer-1',
        roles: ['SALES'],
        permissions: ['dossier.view.all', 'dossier.delete'],
      };
      const submittedDossier = { ...draftDossier, status: DossierStatus.SUBMITTED };
      expect(() =>
        policy.assertCanDelete(viewerUser, submittedDossier, 'dos-del'),
      ).toThrow(ForbiddenException);

      const reviewDossier = { ...draftDossier, status: DossierStatus.IN_REVIEW };
      expect(() =>
        policy.assertCanDelete(viewerUser, reviewDossier, 'dos-del'),
      ).toThrow(ForbiddenException);
    });

    it('allows deletion of DRAFT / NEED_CHANGES by assigned sales or operator or admin', () => {
      const salesUser: CurrentUserPayload = {
        ...baseUser,
        permissions: ['dossier.view.own', 'dossier.delete'],
      };
      expect(() =>
        policy.assertCanDelete(salesUser, draftDossier, 'dos-del'),
      ).not.toThrow();

      const operatorUser: CurrentUserPayload = {
        ...baseUser,
        id: 'op-1',
        roles: ['OPERATOR'],
        permissions: ['dossier.view.all', 'dossier.delete'],
      };
      expect(() =>
        policy.assertCanDelete(operatorUser, draftDossier, 'dos-del'),
      ).not.toThrow();
    });
  });

  describe('assertCanRestore', () => {
    const deletedDraftDossier = {
      id: 'dos-restore',
      organizationId: orgId,
      salesUserId: baseUser.id,
      status: DossierStatus.DRAFT,
      deletedAt: new Date(),
    };

    it('throws NotFoundException (404) if user cannot view dossier (anti-enumeration)', () => {
      const unownedDossier = { ...deletedDraftDossier, salesUserId: 'other-user' };
      expect(() =>
        policy.assertCanRestore(baseUser, unownedDossier, 'dos-restore'),
      ).toThrow(NotFoundException);
    });

    it('throws ForbiddenException if regular sales user attempts to restore non-DRAFT dossier', () => {
      const nonDraftDossier = { ...deletedDraftDossier, status: DossierStatus.APPROVED };
      expect(() =>
        policy.assertCanRestore(baseUser, nonDraftDossier, 'dos-restore'),
      ).toThrow(ForbiddenException);
    });

    it('allows sales user to restore own DRAFT dossier', () => {
      expect(() =>
        policy.assertCanRestore(baseUser, deletedDraftDossier, 'dos-restore'),
      ).not.toThrow();
    });

    it('allows admin to restore dossier in any status', () => {
      const nonDraftDossier = { ...deletedDraftDossier, status: DossierStatus.APPROVED };
      const adminUser: CurrentUserPayload = { ...baseUser, roles: ['CEO_ADMIN'] };
      expect(() =>
        policy.assertCanRestore(adminUser, nonDraftDossier, 'dos-restore'),
      ).not.toThrow();
    });
  });

  describe('assertCanPurge', () => {
    const archivedDossier = {
      id: 'dos-purge',
      organizationId: orgId,
      status: DossierStatus.CANCELLED,
      deletedAt: new Date(),
    };

    it('throws NotFoundException (404) if dossier belongs to different organization', () => {
      const foreignDossier = { ...archivedDossier, organizationId: 'foreign-org' };
      expect(() =>
        policy.assertCanPurge(
          { ...baseUser, roles: ['CEO_ADMIN'] },
          foreignDossier,
          'dos-purge',
        ),
      ).toThrow(NotFoundException);
    });

    it('throws ForbiddenException (403) if non-admin user attempts purge', () => {
      expect(() =>
        policy.assertCanPurge(baseUser, archivedDossier, 'dos-purge'),
      ).toThrow(ForbiddenException);
    });

    it('allows admin user to purge archived dossier', () => {
      expect(() =>
        policy.assertCanPurge(
          { ...baseUser, roles: ['CEO_ADMIN'] },
          archivedDossier,
          'dos-purge',
        ),
      ).not.toThrow();
    });
  });
});

