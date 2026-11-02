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
import { KpiPeriodType, DossierStatus } from '../../common/enums';

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
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
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
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
        getRawOne: jest.fn().mockResolvedValue({ totalSpend: '0', totalSupplierCount: '0' }),
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
      expect(result.supplierSpendSummary).toBeDefined();
      expect(result.totalSupplierSpend).toBe(0);
      expect(result.otherSuppliersSpend).toBe(0);
      expect(result.otherSuppliersCount).toBe(0);
      expect(mockCostQB.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          countableStatuses: [DossierStatus.COMPLETED, DossierStatus.LOCKED],
        }),
      );
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
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
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
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
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

  describe('caching integration with getOrCompute', () => {
    it('should delegate caching to redisService.getOrCompute when redisService is provided', async () => {
      const mockRedisService = {
        getOrCompute: jest
          .fn()
          .mockImplementation((key, computeFn, ttl) => computeFn()),
      };
      (service as any).redisService = mockRedisService;

      const mockEstimateQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      estimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);

      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);

      const mockTaskQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
      };
      taskRepository.createQueryBuilder.mockReturnValue(mockTaskQB);

      await service.getSalesDashboard('org-1', 'user-1', {});

      expect(mockRedisService.getOrCompute).toHaveBeenCalledWith(
        expect.stringContaining('dashboard:sales:org-1:user-1:'),
        expect.any(Function),
        60,
      );
    });
  });
  describe('getCeoDashboard supplier spend analytics and long-tail aggregation', () => {
    it('should compute top 6 suppliers, otherSuppliersSpend, and totalSupplierSpend accurately', async () => {
      const top6Suppliers = [
        { supplierId: 's1', supplierCode: 'NCC-01', supplierName: 'KS Mường Thanh', amount: '200000000', grossAmount: '220000000', dossierCount: '5' },
        { supplierId: 's2', supplierCode: 'NCC-02', supplierName: 'Xe Duy Hải', amount: '150000000', grossAmount: '165000000', dossierCount: '4' },
        { supplierId: 's3', supplierCode: 'NCC-03', supplierName: 'NH Madam Lân', amount: '100000000', grossAmount: '110000000', dossierCount: '3' },
        { supplierId: 's4', supplierCode: 'NCC-04', supplierName: 'Vé Bà Nà Hills', amount: '80000000', grossAmount: '88000000', dossierCount: '2' },
        { supplierId: 's5', supplierCode: 'NCC-05', supplierName: 'KS Royal', amount: '50000000', grossAmount: '55000000', dossierCount: '2' },
        { supplierId: 's6', supplierCode: 'NCC-06', supplierName: 'Cano Cù Lao Chàm', amount: '20000000', grossAmount: '22000000', dossierCount: '1' },
      ];

      const mockEstimateQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      estimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);

      const mockDossierQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
      };
      dossierRepository.createQueryBuilder.mockReturnValue(mockDossierQB);

      const mockRevenueQB = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
        getRawOne: jest.fn().mockResolvedValue({ sum: '1500000000' }),
      };
      revenueLineRepository.createQueryBuilder.mockReturnValue(mockRevenueQB);

      let costQBCallCount = 0;
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
        getRawMany: jest.fn().mockImplementation(() => {
          costQBCallCount++;
          // Call 1: category breakdown, Call 2: supplier top 6, Call 3: market cost
          if (costQBCallCount === 2) {
            return Promise.resolve(top6Suppliers);
          }
          return Promise.resolve([]);
        }),
        getRawOne: jest.fn().mockResolvedValue({
          totalSpend: '1000000000', // 1 Billion total spend
          totalSupplierCount: '20',  // 20 total active suppliers
        }),
      };
      costLineRepository.createQueryBuilder.mockReturnValue(mockCostQB);

      const result = await service.getCeoDashboard('org-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      // Top 6 sum = 200 + 150 + 100 + 80 + 50 + 20 = 600M
      // Other suppliers spend = 1,000M - 600M = 400M
      // Other suppliers count = 20 - 6 = 14
      expect(result.supplierSpendSummary).toBeDefined();
      expect(result.supplierSpendSummary.totalSpend).toBe(1000000000);
      expect(result.supplierSpendSummary.otherSuppliersSpend).toBe(400000000);
      expect(result.supplierSpendSummary.otherSuppliersCount).toBe(14);
      expect(result.supplierSpendSummary.totalSupplierCount).toBe(20);
      expect(result.supplierSpendSummary.items).toHaveLength(6);

      // Verify share percentage calculations relative to 1B
      expect(result.supplierSpendSummary.items[0].sharePercentage).toBe(20); // 200M / 1B = 20.0%
      expect(result.supplierSpendSummary.items[1].sharePercentage).toBe(15); // 150M / 1B = 15.0%
      expect(result.supplierSpendSummary.items[2].sharePercentage).toBe(10); // 100M / 1B = 10.0%

      // Verify mathematical consistency: top items sum + others = totalSpend
      const topItemsSum = result.supplierSpendSummary.items.reduce((acc, it) => acc + it.amount, 0);
      expect(topItemsSum + result.supplierSpendSummary.otherSuppliersSpend).toBe(result.supplierSpendSummary.totalSpend);
    });

    it('should correctly handle <= 6 suppliers with zero otherSuppliersSpend', async () => {
      const top3Suppliers = [
        { supplierId: 's1', supplierCode: 'NCC-01', supplierName: 'KS Mường Thanh', amount: '150000000', grossAmount: '165000000', dossierCount: '2' },
        { supplierId: 's2', supplierCode: 'NCC-02', supplierName: 'Xe Duy Hải', amount: '100000000', grossAmount: '110000000', dossierCount: '2' },
        { supplierId: 's3', supplierCode: 'NCC-03', supplierName: 'NH Madam Lân', amount: '50000000', grossAmount: '55000000', dossierCount: '1' },
      ];

      estimateRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      dossierRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
      });

      revenueLineRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      });

      let costQBCount = 0;
      costLineRepository.createQueryBuilder.mockReturnValue({
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
        getRawMany: jest.fn().mockImplementation(() => {
          costQBCount++;
          if (costQBCount === 2) return Promise.resolve(top3Suppliers);
          return Promise.resolve([]);
        }),
        getRawOne: jest.fn().mockResolvedValue({
          totalSpend: '300000000',
          totalSupplierCount: '3',
        }),
      });

      const result = await service.getCeoDashboard('org-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result.supplierSpendSummary.totalSpend).toBe(300000000);
      expect(result.supplierSpendSummary.otherSuppliersSpend).toBe(0);
      expect(result.supplierSpendSummary.otherSuppliersCount).toBe(0);
      expect(result.supplierSpendSummary.totalSupplierCount).toBe(3);
      expect(result.supplierSpendSummary.items).toHaveLength(3);
      expect(result.supplierSpendSummary.items[0].sharePercentage).toBe(50); // 150M / 300M = 50.0%
    });

    it('should handle zero total spend cleanly without division by zero', async () => {
      estimateRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      dossierRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
      });

      revenueLineRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
        getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
      });

      costLineRepository.createQueryBuilder.mockReturnValue({
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
        getRawOne: jest.fn().mockResolvedValue({ avgDays: '5' }),
        getRawOne: jest.fn().mockResolvedValue({ totalSpend: '0', totalSupplierCount: '0' }),
      });

      const result = await service.getCeoDashboard('org-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result.supplierSpendSummary.totalSpend).toBe(0);
      expect(result.supplierSpendSummary.otherSuppliersSpend).toBe(0);
      expect(result.supplierSpendSummary.otherSuppliersCount).toBe(0);
      expect(result.supplierSpendSummary.totalSupplierCount).toBe(0);
      expect(result.supplierSpendSummary.items).toEqual([]);
    });
  });

});
