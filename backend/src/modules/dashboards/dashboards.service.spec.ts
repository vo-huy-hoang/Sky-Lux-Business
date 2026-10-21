import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardsService } from './dashboards.service';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { Task } from '../tasks/entities/task.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { KpiResult } from '../kpis/entities/kpi-result.entity';
import { User } from '../users/entities/user.entity';
import { KpiPeriodType } from '../../common/enums';

describe('DashboardsService', () => {
  let service: DashboardsService;
  let dossierRepository: any;
  let estimateRepository: any;
  let revenueLineRepository: any;
  let costLineRepository: any;
  let taskRepository: any;
  let supplierRepository: any;
  let kpiResultRepository: any;
  let userRepository: any;

  beforeEach(async () => {
    dossierRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    estimateRepository = {
      createQueryBuilder: jest.fn(),
    };

    revenueLineRepository = {
      createQueryBuilder: jest.fn(),
    };

    costLineRepository = {
      createQueryBuilder: jest.fn(),
    };

    taskRepository = {
      createQueryBuilder: jest.fn(),
    };

    supplierRepository = {
      count: jest.fn(),
    };

    kpiResultRepository = {
      createQueryBuilder: jest.fn(),
    };

    userRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardsService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: dossierRepository,
        },
        {
          provide: getRepositoryToken(Estimate),
          useValue: estimateRepository,
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: revenueLineRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: costLineRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepository,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: supplierRepository,
        },
        {
          provide: getRepositoryToken(KpiResult),
          useValue: kpiResultRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesDashboard', () => {
    it('should aggregate sales metrics correctly', async () => {
      // Mock getApprovedEstimates query builder
      const mockApprovedEstimates = [{ id: 'est-1' }];
      const mockEstimateQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockApprovedEstimates),
      };
      estimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);

      // Mock revenue lines SUM
      const mockRevQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: 1000 }),
      };
      revenueLineRepository.createQueryBuilder.mockReturnValue(mockRevQB);

      // Mock cost lines SUM
      const mockCostQB = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: 600 }),
      };
      costLineRepository.createQueryBuilder.mockReturnValue(mockCostQB);

      // Mock dossiers breakdown
      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ status: 'APPROVED', count: 2 }]),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);

      // Mock tasks breakdown
      const mockTaskQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ status: 'COMPLETED', count: 1 }]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(mockTaskQB);

      const result = await service.getSalesDashboard('org-id', 'user-id', {
        periodType: KpiPeriodType.MONTHLY,
        date: '2026-08-15',
      });

      expect(result.revenue).toBe(1000);
      expect(result.profit).toBe(400);
      expect(result.dossiersBreakdown).toEqual([
        { status: 'APPROVED', count: 2 },
      ]);
      expect(result.tasksBreakdown).toEqual([
        { status: 'COMPLETED', count: 1 },
      ]);
    });
  });

  describe('getOperatorDashboard', () => {
    it('should calculate operator stats', async () => {
      dossierRepository.count.mockResolvedValue(3);

      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ priority: 'HIGH', count: 2 }]),
        getCount: jest.fn().mockResolvedValue(3),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);
      const mockTaskQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ status: 'TODO', count: 4 }]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(mockTaskQB);

      const mockRevenueQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      revenueLineRepository.createQueryBuilder.mockReturnValue(mockRevenueQB);

      const mockCostQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      costLineRepository.createQueryBuilder.mockReturnValue(mockCostQB);

      const mockEstimateQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      estimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);
      supplierRepository.count.mockResolvedValue(15);

      const result = await service.getOperatorDashboard('org-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result.activeDossiersCount).toBe(3);
      expect(result.overdueTasksCount).toBe(1);
      expect(result.totalSuppliers).toBe(15);
      expect(result.priorityBreakdown).toEqual([
        { priority: 'HIGH', count: 2 },
      ]);
    });
  });

  describe('getOperatorSalesSummary', () => {
    it('should aggregate dossiers, revenue and profit by sales user', async () => {
      const mockSalesUsersQB = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            salesUserId: 'user-1',
            salesUserName: 'Harry River',
            salesUserEmail: 'harry@skylux.vn',
            employeeCode: 'NV001',
            totalDossiers: '5',
            approvedDossiers: '4',
            completedDossiers: '3',
          },
        ]),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockSalesUsersQB);

      const mockRevenueQB = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ salesUserId: 'user-1', revenue: '50000000' }]),
      };
      revenueLineRepository.createQueryBuilder.mockReturnValue(mockRevenueQB);

      const mockCostQB = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ salesUserId: 'user-1', cost: '30000000' }]),
      };
      costLineRepository.createQueryBuilder.mockReturnValue(mockCostQB);

      const result = await service.getOperatorSalesSummary('org-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        salesUserId: 'user-1',
        salesUserName: 'Harry River',
        salesUserEmail: 'harry@skylux.vn',
        employeeCode: 'NV001',
        totalDossiers: 5,
        approvedDossiers: 4,
        completedDossiers: 3,
        completionRate: 80,
        totalRevenue: 50000000,
        totalCost: 30000000,
        totalProfit: 20000000,
      });
    });
  });

  describe('getOperatorMonthlyTrend', () => {
    it('should aggregate dossiers and revenue by month', async () => {
      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);

      const mockRevenueQB = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      revenueLineRepository.createQueryBuilder.mockReturnValue(mockRevenueQB);

      const result = await service.getOperatorMonthlyTrend('org-id', 6);

      expect(result).toHaveLength(6);
      expect(result[0]).toHaveProperty('monthKey');
      expect(result[0]).toHaveProperty('label');
      expect(result[0]).toHaveProperty('totalDossiers');
      expect(result[0]).toHaveProperty('totalRevenue');
    });
  });
});
