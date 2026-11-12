import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { DossierAccessPolicyService } from '../dossiers/dossier-access-policy.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { EstimateStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('Estimates Module (Integration)', () => {
  let controller: EstimatesController;
  let estimateRepository: jest.Mocked<Repository<Estimate>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgA = {
    id: 'user-A-uuid',
    organizationId: orgA,
    permissions: [
      'dossier.view.all',
      'estimate.view',
      'estimate.create',
      'estimate.update',
    ],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockEstimateOrgB = {
    id: 'est-B-uuid',
    dossierId: 'dossier-B-uuid',
    organizationId: orgB,
    status: EstimateStatus.DRAFT,
    revenueLines: [],
    costLines: [],
  } as unknown as Estimate;

  const mockEstimateOrgA = {
    id: 'est-A-uuid',
    dossierId: 'dossier-A-uuid',
    organizationId: orgA,
    status: EstimateStatus.DRAFT,
    revenueLines: [],
    costLines: [],
  } as unknown as Estimate;

  const mockDossiersService = {
    findOne: jest.fn(),
  };

  const mockDossierRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'dossier-A-uuid',
      organizationId: orgA,
      salesUserId: 'user-A-uuid',
      createdBy: 'user-A-uuid',
    }),
  };

  beforeEach(async () => {
    mockDossierRepo.findOne.mockResolvedValue({
      id: 'dossier-A-uuid',
      organizationId: orgA,
      salesUserId: 'user-A-uuid',
      createdBy: 'user-A-uuid',
    });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatesController],
      providers: [
        EstimatesService,
        {
          provide: getRepositoryToken(Estimate),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: {
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: {
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: {
            count: jest.fn().mockResolvedValue(1),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: any) =>
              cb({
                getRepository: jest.fn((entity: any) => {
                  if (entity === EstimateRevenueLine) {
                    return {
                      create: jest.fn((dto) => dto),
                      delete: jest.fn(),
                    };
                  }
                  if (entity === EstimateCostLine) {
                    return {
                      create: jest.fn((dto) => dto),
                      delete: jest.fn(),
                    };
                  }
                  return estimateRepository;
                }),
                save: jest.fn((entity: any) => estimateRepository.save(entity)),
                delete: jest.fn(),
              }),
            ),
          },
        },
        {
          provide: DossiersService,
          useValue: mockDossiersService,
        },
        DossierAccessPolicyService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepo,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<EstimatesController>(EstimatesController);
    estimateRepository = module.get(getRepositoryToken(Estimate));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ xem báo giá của Doanh nghiệp B (Trả về 404)', async () => {
      estimateRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'est-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockEstimateOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgA, 'est-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa báo giá của Doanh nghiệp B (Trả về 404)', async () => {
      estimateRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'est-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockEstimateOrgB);
      });

      const updateDto: UpdateEstimateDto = { note: 'Hacked note' };

      await expect(
        controller.update(mockUserOrgA, 'est-B-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Khóa cập nhật dựa trên Máy trạng thái (Locked states enforcement)', () => {
    it('Báo giá đã APPROVED không thể bị chỉnh sửa (Trả về 400)', async () => {
      const approvedEst = {
        ...mockEstimateOrgA,
        status: EstimateStatus.APPROVED,
      };
      estimateRepository.findOne.mockResolvedValue(approvedEst);

      const updateDto: UpdateEstimateDto = { note: 'Change after approval' };

      await expect(
        controller.update(mockUserOrgA, 'est-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('Báo giá đã SUPERSEDED không thể bị chỉnh sửa (Trả về 400)', async () => {
      const supersededEst = {
        ...mockEstimateOrgA,
        status: EstimateStatus.SUPERSEDED,
      };
      estimateRepository.findOne.mockResolvedValue(supersededEst);

      const updateDto: UpdateEstimateDto = { note: 'Change after supersede' };

      await expect(
        controller.update(mockUserOrgA, 'est-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Bảo vệ BOLA theo phạm vi hồ sơ (Ticket 02: own / team / all)', () => {
    const salesOwnUser = {
      id: 'sales-own-uuid',
      organizationId: orgA,
      departmentId: 'dept-hcm',
      permissions: ['estimate.view', 'estimate.update', 'dossier.view.own'],
      roles: ['SALES'],
    } as unknown as CurrentUserPayload;

    const salesTeamUser = {
      id: 'sales-lead-uuid',
      organizationId: orgA,
      departmentId: 'dept-hcm',
      permissions: ['estimate.view', 'dossier.view.team'],
      roles: ['SALES'],
    } as unknown as CurrentUserPayload;

    it('SALES scope own KHÔNG THỂ xem hoặc sửa báo giá hồ sơ đồng nghiệp', async () => {
      estimateRepository.findOne.mockResolvedValue({
        ...mockEstimateOrgA,
        dossierId: 'dossier-colleague-uuid',
      });
      mockDossierRepo.findOne.mockResolvedValue({
        id: 'dossier-colleague-uuid',
        organizationId: orgA,
        salesUserId: 'sales-other-uuid',
        operatorUserId: 'operator-uuid',
        createdBy: 'sales-other-uuid',
      });

      await expect(
        controller.findOne(salesOwnUser, 'est-A-uuid'),
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.update(salesOwnUser, 'est-A-uuid', { note: 'Tamper' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('User có quyền dossier.view.team XEM ĐƯỢC báo giá cùng phòng ban và bị TỪ CHỐI khác phòng ban', async () => {
      estimateRepository.findOne.mockResolvedValue({
        ...mockEstimateOrgA,
        dossierId: 'dossier-team-uuid',
      });

      mockDossierRepo.findOne.mockResolvedValueOnce({
        id: 'dossier-team-uuid',
        organizationId: orgA,
        salesUserId: 'colleague-hcm',
        salesUser: { organizationId: orgA, departmentId: 'dept-hcm' },
        operatorUser: null,
      });

      await expect(
        controller.findOne(salesTeamUser, 'est-A-uuid'),
      ).resolves.toMatchObject({ id: 'est-A-uuid' });

      mockDossierRepo.findOne.mockResolvedValueOnce({
        id: 'dossier-team-uuid',
        organizationId: orgA,
        salesUserId: 'colleague-hn',
        salesUser: { organizationId: orgA, departmentId: 'dept-hn' },
        operatorUser: { organizationId: orgA, departmentId: 'dept-hn' },
      });

      await expect(
        controller.findOne(salesTeamUser, 'est-A-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('scopes findAll with DossierAccessPolicy and blocks remove for unauthorized scope', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      estimateRepository.createQueryBuilder.mockReturnValue(qb as any);

      await expect(
        controller.findAll(salesOwnUser, { page: 1, limit: 10 }),
      ).resolves.toMatchObject({ data: [], meta: { total: 0 } });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dossier.salesUserId = :userId'),
        expect.objectContaining({ userId: salesOwnUser.id }),
      );

      estimateRepository.findOne.mockResolvedValueOnce({
        ...mockEstimateOrgA,
        dossierId: 'dossier-colleague-uuid',
      });
      mockDossierRepo.findOne.mockResolvedValueOnce({
        id: 'dossier-colleague-uuid',
        organizationId: orgA,
        salesUserId: 'sales-other-uuid',
        operatorUserId: 'operator-uuid',
        createdBy: 'sales-other-uuid',
      });

      await expect(
        controller.remove(salesOwnUser, 'est-A-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
