import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinancialReadModelService } from './financial-read-model.service';
import {
  LATEST_APPROVED_ESTIMATE_SUBQUERY,
  VALUED_COST_NET_SQL,
  VALUED_REVENUE_NET_SQL,
  latestApprovedEstimateJoinCondition,
  zonedMonthKeySql,
} from './financial-read-model.sql';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { DossierStatus, EstimateStatus } from '../../common/enums';
import { valuateEstimate } from '../../common/utils/estimate-valuation.util';
import { resolvePeriodRange } from '../../common/utils/period-range.util';

function createMockQueryBuilder(overrides: Record<string, jest.Mock> = {}) {
  const qb: Record<string, jest.Mock> = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  return qb;
}

describe('FinancialReadModelService', () => {
  let service: FinancialReadModelService;
  let estimateRepository: { createQueryBuilder: jest.Mock };
  let revenueLineRepository: { createQueryBuilder: jest.Mock };
  let costLineRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    estimateRepository = { createQueryBuilder: jest.fn() };
    revenueLineRepository = { createQueryBuilder: jest.fn() };
    costLineRepository = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialReadModelService,
        { provide: getRepositoryToken(Estimate), useValue: estimateRepository },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: revenueLineRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: costLineRepository,
        },
      ],
    }).compile();

    service = module.get(FinancialReadModelService);
  });

  describe('SQL fragments', () => {
    it('deduplicates multi-revision dossiers to the single latest non-deleted APPROVED estimate', () => {
      expect(LATEST_APPROVED_ESTIMATE_SUBQUERY).toContain('latest.version_no DESC');
      expect(LATEST_APPROVED_ESTIMATE_SUBQUERY).toContain('latest.deleted_at IS NULL');
      expect(LATEST_APPROVED_ESTIMATE_SUBQUERY).toContain('LIMIT 1');
    });

    it('encodes canonical 1.08 VAT valuation in SQL for revenue and cost lines', () => {
      expect(VALUED_REVENUE_NET_SQL('line')).toContain('1.08');
      expect(VALUED_COST_NET_SQL('line')).toContain('vat_rate');
      expect(VALUED_COST_NET_SQL('line')).toContain('1.08');
    });
  });

  describe('getLatestApprovedEstimateIds', () => {
    it('enforces latest-approved-estimate subquery and UTC+7 period bounds', async () => {
      const estQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([{ id: 'est-v2' }]),
      });
      estimateRepository.createQueryBuilder.mockReturnValue(estQb);

      const range = resolvePeriodRange('MONTHLY', '2026-11-01T00:00:00+07:00');
      const ids = await service.getLatestApprovedEstimateIds({
        organizationId: 'org-1',
        salesUserId: 'sales-1',
        startUtc: range.startUtc,
        endUtc: range.endUtc,
      });

      expect(ids).toEqual(['est-v2']);
      const allAndWheres = estQb.andWhere.mock.calls.map((c) => c[0]).join('\n');
      expect(allAndWheres).toContain('latest.version_no DESC');
      expect(allAndWheres).toContain('dossier.salesUserId = :salesUserId');
      expect(allAndWheres).toContain('estimate.approvedAt BETWEEN :startUtc AND :endUtc');
      expect(estQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('estimate.approvedAt BETWEEN :startUtc AND :endUtc'),
        expect.objectContaining({
          startUtc: range.startUtc,
          endUtc: range.endUtc,
        }),
      );
    });
  });

  describe('getValuedTotalsForEstimates', () => {
    it('returns zero totals without querying DB when estimateIds is empty', async () => {
      const totals = await service.getValuedTotalsForEstimates('org-1', []);
      expect(totals).toEqual({
        revenueGross: 0,
        revenueNet: 0,
        costGross: 0,
        costNet: 0,
        profit: 0,
        marginPercent: 0,
      });
      expect(revenueLineRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(costLineRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('computes canonical valued totals matching EstimateValuation 1:1', async () => {
      const revQb = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({
          revenueGross: '108000000',
          revenueNet: '100000000',
        }),
      });
      const costQb = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({
          costGross: '91400000',
          costNet: '85000000',
        }),
      });
      revenueLineRepository.createQueryBuilder.mockReturnValue(revQb);
      costLineRepository.createQueryBuilder.mockReturnValue(costQb);

      const totals = await service.getValuedTotalsForEstimates('org-1', ['est-1']);
      expect(totals).toEqual({
        revenueGross: 108_000_000,
        revenueNet: 100_000_000,
        costGross: 91_400_000,
        costNet: 85_000_000,
        profit: 15_000_000,
        marginPercent: 15,
      });
    });
  });

  describe('getMonthlyFinancialTrend', () => {
    it('buckets by Asia/Ho_Chi_Minh month and reconciles monthly profit sum with headline profit', async () => {
      const revQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { monthKey: '2026-10', revenue: '60000000' },
          { monthKey: '2026-11', revenue: '40000000' },
        ]),
      });
      const costQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { monthKey: '2026-10', cost: '50000000' },
          { monthKey: '2026-11', cost: '35000000' },
        ]),
      });
      revenueLineRepository.createQueryBuilder.mockReturnValue(revQb);
      costLineRepository.createQueryBuilder.mockReturnValue(costQb);

      const points = await service.getMonthlyFinancialTrend({
        organizationId: 'org-1',
        year: 2026,
      });

      const sumProfit = points.reduce((acc, p) => acc + p.profit, 0);
      expect(sumProfit).toBe(15_000_000);
      expect(revQb.select).toHaveBeenCalledWith(
        expect.stringContaining("AT TIME ZONE 'Asia/Ho_Chi_Minh'"),
        'monthKey',
      );
      const revAndWheres = revQb.andWhere.mock.calls.map((c) => c[0]).join('\n');
      expect(revAndWheres).toContain('latest.version_no DESC');
    });
  });

  describe('getSupplierSpendSummary', () => {
    it('applies latest-approved-estimate dedupe and computes top-N + long-tail share accurately', async () => {
      const topQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          {
            supplierId: 'sup-1',
            supplierCode: 'NCC-01',
            supplierName: 'Hotel A',
            amount: '60000000',
            grossAmount: '64800000',
            dossierCount: '2',
          },
        ]),
      });
      const overallQb = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({
          totalSpend: '80000000',
          totalGrossSpend: '86400000',
          totalSuppliers: '3',
        }),
      });
      costLineRepository.createQueryBuilder
        .mockReturnValueOnce(topQb)
        .mockReturnValueOnce(overallQb);

      const summary = await service.getSupplierSpendSummary({
        organizationId: 'org-1',
        allTime: true,
        topLimit: 6,
      });

      expect(summary.totalSupplierSpend).toBe(80_000_000);
      expect(summary.topSuppliersSpend).toBe(60_000_000);
      expect(summary.otherSuppliersSpend).toBe(20_000_000);
      expect(summary.otherSuppliersCount).toBe(2);
      expect(summary.topSuppliers[0].sharePercentage).toBe(75);

      const topAndWheres = topQb.andWhere.mock.calls.map((c) => c[0]).join('\n');
      expect(topAndWheres).toContain('latest.version_no DESC');
      expect(topAndWheres).toContain('estimate.status = :approvedEstimateStatus');
    });
  });

  describe('getSupplierTotalsByIds', () => {
    it('enforces latest-approved-estimate filter and countable dossier statuses', async () => {
      const qb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { supplierId: 'sup-1', totalAmount: '25000000' },
        ]),
      });
      costLineRepository.createQueryBuilder.mockReturnValue(qb);

      const map = await service.getSupplierTotalsByIds('org-1', ['sup-1']);
      expect(map.get('sup-1')).toBe(25_000_000);

      const andWheres = qb.andWhere.mock.calls.map((c) => c[0]).join('\n');
      expect(andWheres).toContain('latest.version_no DESC');
      expect(qb.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          approvedEstimateStatus: EstimateStatus.APPROVED,
          countableStatuses: [DossierStatus.COMPLETED, DossierStatus.LOCKED],
        }),
      );
    });
  });

  describe('valuateLoadedEstimate', () => {
    it('delegates directly to EstimateValuation with 1:1 parity', () => {
      const revLines = [
        { quantity: 10, multiplier: 2, unitPrice: 5_400_000, vatRate: 8 },
      ];
      const costLines = [
        { quantity: 10, multiplier: 1, unitPrice: 8_640_000, vatRate: 8 },
        { quantity: 1, multiplier: 1, unitPrice: 5_000_000, vatRate: 0 },
      ];

      const expected = valuateEstimate(revLines, costLines);
      const actual = service.valuateLoadedEstimate(revLines, costLines);

      expect(actual).toEqual({
        revenueGross: expected.revenueGross,
        revenueNet: Math.round(expected.revenueNet),
        costGross: expected.costGross,
        costNet: Math.round(expected.costNet),
        profit: expected.profit,
        marginPercent: expected.marginPercent,
      });
    });
  });

  describe('additional seams & edge cases', () => {
    it('sanitizes timezone in zonedMonthKeySql and supports custom aliases in latestApprovedEstimateJoinCondition', () => {
      expect(zonedMonthKeySql('estimate.approved_at', "'; DROP TABLE users;--")).toContain(
        "AT TIME ZONE 'Asia/Ho_Chi_Minh'",
      );
      const joinSql = latestApprovedEstimateJoinCondition('d', 'e');
      expect(joinSql).toContain('e.status = :approvedEstimateStatus');
      expect(joinSql).toContain('latest.dossier_id = d.id');
    });

    it('selectLatestApprovedEstimate ranks strictly non-deleted APPROVED by versionNo, approvedAt, createdAt', () => {
      const winner = service.selectLatestApprovedEstimate([
        { id: 'v1', status: EstimateStatus.APPROVED, versionNo: 1, approvedAt: '2026-11-01T00:00:00Z' },
        { id: 'v2-del', status: EstimateStatus.APPROVED, versionNo: 2, deletedAt: new Date() },
        { id: 'v2-draft', status: EstimateStatus.DRAFT, versionNo: 2 },
        { id: 'v2-early', status: EstimateStatus.APPROVED, versionNo: 2, approvedAt: '2026-11-02T00:00:00Z' },
        { id: 'v2-late', status: EstimateStatus.APPROVED, versionNo: 2, approvedAt: '2026-11-03T00:00:00Z' },
      ]);
      expect(winner?.id).toBe('v2-late');
    });

    it('getValuedTotalsByEstimateIds maps per-estimate canonical revenue, cost, profit, and margin', async () => {
      const revQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { estimateId: 'e1', revenueGross: '108000000', revenueNet: '100000000' },
        ]),
      });
      const costQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { estimateId: 'e1', costGross: '91400000', costNet: '85000000' },
        ]),
      });
      revenueLineRepository.createQueryBuilder.mockReturnValue(revQb);
      costLineRepository.createQueryBuilder.mockReturnValue(costQb);

      const map = await service.getValuedTotalsByEstimateIds('org-1', ['e1', 'e2']);
      expect(map.get('e1')).toEqual({
        revenueGross: 108_000_000,
        revenueNet: 100_000_000,
        costGross: 91_400_000,
        costNet: 85_000_000,
        profit: 15_000_000,
        marginPercent: 15,
      });
      expect(map.get('e2')?.profit).toBe(0);
    });

    it('getSalesFinancialPerformance and getTopCustomerRevenue enforce latest-approved dedupe', async () => {
      const revQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { salesUserId: 's1', totalRevenue: '100000000' },
        ]),
      });
      const costQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { salesUserId: 's1', totalCost: '85000000' },
        ]),
      });
      revenueLineRepository.createQueryBuilder.mockReturnValueOnce(revQb);
      costLineRepository.createQueryBuilder.mockReturnValueOnce(costQb);

      const salesMap = await service.getSalesFinancialPerformance('org-1');
      expect(salesMap.get('s1')).toEqual({
        totalRevenue: 100_000_000,
        totalCost: 85_000_000,
        totalProfit: 15_000_000,
      });

      const custQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { customerId: 'c1', customerName: 'VIP Corp', spend: '100000000.4' },
        ]),
      });
      revenueLineRepository.createQueryBuilder.mockReturnValueOnce(custQb);

      const customers = await service.getTopCustomerRevenue({
        organizationId: 'org-1',
        allTime: true,
        limit: 5,
      });
      expect(customers).toEqual([
        { customerId: 'c1', customerName: 'VIP Corp', spend: 100_000_000 },
      ]);
      expect(custQb.groupBy).toHaveBeenCalledWith('customer.id');
    });

    it('zeros otherSuppliersSpend cleanly when otherSuppliersCount is 0 (no rounding residual)', async () => {
      const topQb = createMockQueryBuilder({
        getRawMany: jest.fn().mockResolvedValue([
          { supplierId: 's1', supplierCode: 'N1', supplierName: 'A', amount: '33333333.33', grossAmount: '36000000', dossierCount: '1' },
          { supplierId: 's2', supplierCode: 'N2', supplierName: 'B', amount: '33333333.33', grossAmount: '36000000', dossierCount: '1' },
        ]),
      });
      const overallQb = createMockQueryBuilder({
        getRawOne: jest.fn().mockResolvedValue({
          totalSpend: '66666666.67',
          totalGrossSpend: '72000000',
          totalSuppliers: '2',
        }),
      });
      costLineRepository.createQueryBuilder
        .mockReturnValueOnce(topQb)
        .mockReturnValueOnce(overallQb);

      const summary = await service.getSupplierSpendSummary({
        organizationId: 'org-1',
        allTime: true,
      });
      expect(summary.otherSuppliersCount).toBe(0);
      expect(summary.otherSuppliersSpend).toBe(0);
    });
  });
});
