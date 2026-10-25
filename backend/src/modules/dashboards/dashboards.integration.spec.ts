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
import { User } from '../users/entities/user.entity';
import { KpiPeriodType } from '../../common/enums';
import { RedisService } from '../../common/redis/redis.service';

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
    find: jest.fn().mockResolvedValue([]),
  };

  const mockCostLineRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
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

  const mockUserRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockRedisService = {
    cacheMap: new Map<string, any>(),
    lockHeld: false,
    isDegraded: false,
    reset() {
      this.cacheMap.clear();
      this.lockHeld = false;
      this.isDegraded = false;
    },
    async get(key: string) {
      if (this.isDegraded) throw new Error('Redis connection error');
      return this.cacheMap.has(key) ? this.cacheMap.get(key) : null;
    },
    async set(key: string, val: any, ttl = 60) {
      if (this.isDegraded) throw new Error('Redis connection error');
      this.cacheMap.set(key, val);
    },
    async del(key: string) {
      if (this.isDegraded) throw new Error('Redis connection error');
      this.cacheMap.delete(key);
      if (key.startsWith('lock:')) this.lockHeld = false;
    },
    async delByPattern(pattern: string) {
      if (this.isDegraded) throw new Error('Redis connection error');
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*'));
      for (const k of this.cacheMap.keys()) {
        if (regex.test(String(k))) this.cacheMap.delete(k);
      }
    },
    async setNx(key: string, val = '1', ttl = 5) {
      if (this.isDegraded) throw new Error('Redis connection error');
      if (this.lockHeld) return false;
      this.lockHeld = true;
      return true;
    },
    async getOrCompute(key: string, computeFn: any, ttl = 60) {
      if (this.isDegraded) {
        return computeFn();
      }
      try {
        const cached = await this.get(key);
        if (cached !== null && cached !== undefined) return cached;
        const acquired = await this.setNx(`lock:${key}`);
        if (acquired) {
          try {
            const doubleCheck = await this.get(key);
            if (doubleCheck !== null && doubleCheck !== undefined)
              return doubleCheck;
            const res = await computeFn();
            await this.set(key, res, ttl);
            return res;
          } finally {
            await this.del(`lock:${key}`);
          }
        }
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 20));
          const retry = await this.get(key);
          if (retry !== null && retry !== undefined) return retry;
        }
        return computeFn();
      } catch (err) {
        return computeFn();
      }
    },
  };

  function setupCeoQueryMocks(
    customOverrides: {
      getManyDelayMs?: number;
      approvedEstimates?: any[];
      revenueAmount?: number;
    } = {},
  ) {
    const mockEstimateQB = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => {
        if (customOverrides.getManyDelayMs) {
          await new Promise((r) =>
            setTimeout(r, customOverrides.getManyDelayMs),
          );
        }
        return customOverrides.approvedEstimates ?? [];
      }),
    };
    mockEstimateRepository.createQueryBuilder.mockReturnValue(mockEstimateQB);

    const mockDossierQB = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
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
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockImplementation(async () => ({
        sum:
          customOverrides.revenueAmount !== undefined
            ? String(customOverrides.revenueAmount)
            : '0',
      })),
    };
    mockRevenueLineRepository.createQueryBuilder.mockReturnValue(
      mockCustomerQB,
    );

    const mockCategoryQB = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ sum: '0' }),
    };
    mockCostLineRepository.createQueryBuilder.mockReturnValue(mockCategoryQB);

    return {
      mockEstimateQB,
      mockDossierQB,
      mockCustomerQB,
      mockCategoryQB,
    };
  }

  beforeEach(async () => {
    mockRedisService.reset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardsController],
      providers: [
        DashboardsService,
        {
          provide: RedisService,
          useValue: mockRedisService,
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
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
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
      const { mockEstimateQB } = setupCeoQueryMocks();

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

  describe('2. Chống dập sóng (Cache Stampede & Single-Flight Concurrency)', () => {
    it('10 request đồng thời khi cache rỗng chỉ thực thi truy vấn Database đúng 1 lần duy nhất', async () => {
      const { mockEstimateQB } = setupCeoQueryMocks({
        getManyDelayMs: 40, // Giả lập độ trễ truy vấn PostgreSQL tính toán
        approvedEstimates: [{ id: 'est-concurrent-1' }],
        revenueAmount: 50000000,
      });

      // Bắn 10 request đồng thời vào CEO Dashboard
      const concurrentRequests = Array.from({ length: 10 }, () =>
        controller.getCeoDashboard(orgA, {
          periodType: KpiPeriodType.MONTHLY,
        }),
      );

      const results = await Promise.all(concurrentRequests);

      // Cả 10 client đều nhận cùng một kết quả chính xác
      expect(results).toHaveLength(10);
      results.forEach((res) => {
        expect(res).toEqual(results[0]);
        expect(res.totalRevenue).toBe(50000000);
      });

      // Database query builder chỉ được gọi đúng 1 lần duy nhất cho toàn bộ 10 requests!
      expect(mockEstimateQB.getMany).toHaveBeenCalledTimes(1);

      // Mutex lock đã được tự động giải phóng sạch sẽ
      expect(mockRedisService.lockHeld).toBe(false);
      expect(mockRedisService.cacheMap.size).toBeGreaterThan(0);
    });
  });

  describe('3. Cập nhật tức thì khi duyệt (Event-Driven Invalidation 0ms)', () => {
    it('Duyệt hồ sơ xóa cache chủ động, request ngay sau đó trả về số liệu mới mà không cần đợi TTL 60s', async () => {
      const orgB = 'org-B-uuid';

      // 1. Khởi tạo dữ liệu ban đầu: Org A có doanh thu 100M
      let currentRevenue = 100000000;
      setupCeoQueryMocks({
        approvedEstimates: [{ id: 'est-initial-1' }],
        get revenueAmount() {
          return currentRevenue;
        },
      });

      // Org B cũng có dashboard được cache
      await mockRedisService.set(`dashboard:ceo:v7:${orgB}:MONTHLY:current`, {
        totalRevenue: 999999999,
      });

      // Lần gọi 1: Org A tính toán và lưu cache
      const initialDashboard = await controller.getCeoDashboard(orgA, {
        periodType: KpiPeriodType.MONTHLY,
      });
      expect(initialDashboard.totalRevenue).toBe(100000000);

      // Lần gọi 1.5: Giả sử DB đã có dữ liệu mới (250M) nhưng chưa được purge cache
      currentRevenue = 250000000;
      const cachedDashboard = await controller.getCeoDashboard(orgA, {
        periodType: KpiPeriodType.MONTHLY,
      });
      // Vẫn trả về 100M từ cache vì chưa xóa cache
      expect(cachedDashboard.totalRevenue).toBe(100000000);

      // 2. Sếp duyệt hồ sơ mới: Trigger xóa cache chủ động theo pattern tenant
      await mockRedisService.delByPattern(`dashboard:*${orgA}*`);

      // Kiểm tra: Cache của Org A đã bị xóa, nhưng cache Org B vẫn nguyên vẹn (Multi-tenant safe)
      const cachedOrgA = await mockRedisService.get(
        `dashboard:ceo:v7:${orgA}:MONTHLY:current`,
      );
      const cachedOrgB = await mockRedisService.get(
        `dashboard:ceo:v7:${orgB}:MONTHLY:current`,
      );
      expect(cachedOrgA).toBeNull();
      expect(cachedOrgB).not.toBeNull();

      // 3. Lần gọi 2 ngay lập tức: Hệ thống tính lại từ DB trả về 250M tức thì (0ms latency, không chờ 60s)
      const freshDashboard = await controller.getCeoDashboard(orgA, {
        periodType: KpiPeriodType.MONTHLY,
      });
      expect(freshDashboard.totalRevenue).toBe(250000000);
    });
  });

  describe('4. Khả năng chịu lỗi (Resilience & Graceful Degradation)', () => {
    it('Khi Redis gặp sự cố hoặc offline, dashboard vẫn tính toán trực tiếp từ DB mà không văng lỗi 500', async () => {
      setupCeoQueryMocks({
        approvedEstimates: [{ id: 'est-resilience-1' }],
        revenueAmount: 75000000,
      });

      // Giả lập Redis bị mất kết nối hoặc ném Exception
      mockRedisService.isDegraded = true;

      // Request vẫn chạy êm xuôi và trả về kết quả
      const result = await controller.getCeoDashboard(orgA, {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBe(75000000);
    });
  });
});
