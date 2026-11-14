import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DossierAccessPolicyService } from './dossier-access-policy.service';
import { Dossier } from './entities/dossier.entity';
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
});

