import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KpisController } from './kpis.controller';
import { KpisService } from './kpis.service';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { User } from '../users/entities/user.entity';
import { KpiMetric, KpiPeriodType } from '../../common/enums';

describe('KPIs Module (Integration)', () => {
  let controller: KpisController;
  let targetRepository: jest.Mocked<Repository<KpiTarget>>;
  let resultRepository: jest.Mocked<Repository<KpiResult>>;
  let dossierRepository: jest.Mocked<Repository<Dossier>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';
  const userA = 'user-A-uuid';

  const mockTargetRepository = {
    find: jest.fn(),
  };

  const mockResultRepository = {
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn((dto) => Promise.resolve(dto)),
  };

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockEstimateRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockRevenueLineRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockCostLineRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpisController],
      providers: [
        KpisService,
        {
          provide: getRepositoryToken(KpiTarget),
          useValue: mockTargetRepository,
        },
        {
          provide: getRepositoryToken(KpiResult),
          useValue: mockResultRepository,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
        {
          provide: getRepositoryToken(Estimate),
          useValue: mockEstimateRepository,
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: mockRevenueLineRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: mockCostLineRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    controller = module.get<KpisController>(KpisController);
    targetRepository = module.get<Repository<KpiTarget>>(
      getRepositoryToken(KpiTarget),
    ) as jest.Mocked<Repository<KpiTarget>>;
    resultRepository = module.get<Repository<KpiResult>>(
      getRepositoryToken(KpiResult),
    ) as jest.Mocked<Repository<KpiResult>>;
    dossierRepository = module.get<Repository<Dossier>>(
      getRepositoryToken(Dossier),
    ) as jest.Mocked<Repository<Dossier>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Chỉ truy vấn các mục tiêu KpiTarget thuộc về đúng organizationId', async () => {
      targetRepository.find.mockResolvedValue([]);

      await controller.findMyKpi(orgA, userA, {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(targetRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: orgA,
          userId: userA,
        }),
      });
    });
  });

  describe('2. Tính toán chỉ số động & Trả kết quả (Dynamic KPIs & Results mapping)', () => {
    it('Tổng hợp đúng actualValue và achievementRate cho mục tiêu số lượng hồ sơ', async () => {
      const mockTargets = [
        {
          id: 'target-1',
          metricCode: KpiMetric.DOSSIER_COUNT,
          targetValue: 5,
          organizationId: orgA,
          userId: userA,
          periodType: KpiPeriodType.MONTHLY,
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
        } as KpiTarget,
      ];
      targetRepository.find.mockResolvedValue(mockTargets);
      mockResultRepository.findOne.mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(4),
      };
      mockDossierRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await controller.findMyKpi(orgA, userA, {
        periodType: KpiPeriodType.MONTHLY,
        date: '2026-08-15',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].actualValue).toBe(4);
      expect(result.data[0].achievementRate).toBe(80);
      expect(mockResultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actualValue: 4,
          achievementRate: 80,
        }),
      );
    });
  });
});
