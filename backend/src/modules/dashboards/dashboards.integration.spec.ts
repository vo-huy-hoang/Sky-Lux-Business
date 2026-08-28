import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { Task } from '../tasks/entities/task.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { KpiResult } from '../kpis/entities/kpi-result.entity';
import { KpiPeriodType } from '../../common/enums';

describe('Dashboards Module (Integration)', () => {
  let controller: DashboardsController;
  let estimateRepository: jest.Mocked<Repository<Estimate>>;

  const orgA = 'org-A-uuid';
  const userA = 'user-A-uuid';

  const mockDossierRepository = {
    count: jest.fn(),
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

  const mockTaskRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockSupplierRepository = {
    count: jest.fn(),
  };

  const mockKpiResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardsController],
      providers: [
        DashboardsService,
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
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(KpiResult),
          useValue: mockKpiResultRepository,
        },
      ],
    }).compile();

    controller = module.get<DashboardsController>(DashboardsController);
    estimateRepository = module.get<Repository<Estimate>>(
      getRepositoryToken(Estimate),
    ) as jest.Mocked<Repository<Estimate>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Chỉ tính toán số liệu của organizationId tương ứng khi gọi CEO Dashboard', async () => {
      const mockEstimateQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockEstimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);

      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: 0 }),
      };
      mockDossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);

      const mockCustomerQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockRevenueLineRepository.createQueryBuilder.mockReturnValue(
        mockCustomerQB,
      );

      const mockCategoryQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockCostLineRepository.createQueryBuilder.mockReturnValue(mockCategoryQB);

      await controller.getCeoDashboard(orgA, {
        periodType: KpiPeriodType.MONTHLY,
      });

      // Verification that query contains organization filter
      expect(mockEstimateQB.where).toHaveBeenCalledWith(
        'dossier.organizationId = :organizationId',
        expect.objectContaining({ organizationId: orgA }),
      );
    });
  });
});
