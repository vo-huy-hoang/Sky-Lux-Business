import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { SavedReport } from './entities/report.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { ReportExportDto } from './dto/report-export.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(SavedReport), useValue: {} },
        { provide: getRepositoryToken(Dossier), useValue: {} },
        { provide: getRepositoryToken(EstimateCostLine), useValue: {} },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects unsupported report types before querying the database', async () => {
    const request: ReportExportDto = {
      reportType: 'unknown',
      format: 'CSV',
    };

    await expect(
      service.exportReport('org-id', 'user-id', request),
    ).rejects.toThrow('reportType phải là revenue');
  });

  it('generates a CSV export from the report rows', async () => {
    jest
      .spyOn(service as never, 'buildRevenueReport' as never)
      .mockResolvedValue({
        data: [
          {
            dossierCode: 'DS-001',
            revenueNet: 1000000,
            costNet: 700000,
          },
        ],
      } as never);

    const result = await service.exportReport('org-id', 'user-id', {
      reportType: 'revenue',
      format: 'CSV',
    });

    expect(result.contentType).toBe('text/csv; charset=utf-8');
    expect(result.filename).toMatch(/^skylux-revenue-.*\.csv$/);
    expect(result.rowCount).toBe(1);
    expect(result.buffer.toString('utf8')).toContain('dossierCode');
    expect(result.buffer.toString('utf8')).toContain('DS-001');
  });

  it('validates export filters before executing a report query', async () => {
    const request: ReportExportDto = {
      reportType: 'revenue',
      format: 'CSV',
      filters: { pageSize: 101 },
    };

    await expect(
      service.exportReport('org-id', 'user-id', request),
    ).rejects.toThrow('Bộ lọc báo cáo không hợp lệ');
  });

  describe('QueryBuilder Isolation & Defensive Clearing', () => {
    it('getFinancialSummary clears orderBys and groupBys before querying raw aggregates', async () => {
      const qbMock: any = {
        expressionMap: {
          orderBys: { 'dossier.revenueRecognitionDate': 'DESC' },
          groupBys: ['salesUser.id'],
        },
        clone() {
          return { ...this, expressionMap: { ...this.expressionMap } };
        },
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockImplementation(function (gb?: string) {
          if (!gb) this.expressionMap.groupBys = [];
          return this;
        }),
        orderBy: jest.fn().mockImplementation(function (ob?: string) {
          if (!ob) this.expressionMap.orderBys = {};
          return this;
        }),
        getRawOne: jest.fn().mockResolvedValue({
          revenueGross: '1000',
          revenueNet: '900',
          costGross: '500',
          costNet: '400',
        }),
      };

      const result = await (service as any).getFinancialSummary(
        qbMock,
        'revGrossSql',
        'revNetSql',
        'costGrossSql',
        'costNetSql',
      );

      expect(qbMock.groupBy).toHaveBeenCalled();
      expect(qbMock.orderBy).toHaveBeenCalled();
      expect(result).toEqual({
        revenueGross: '1000',
        revenueNet: '900',
        costGross: '500',
        costNet: '400',
      });
    });

    it('countDistinct and countDossiers defensively clear orderBys and groupBys', async () => {
      const qbMock: any = {
        expressionMap: {
          orderBys: { 'dossier.createdAt': 'DESC' },
          groupBys: ['customer.id'],
        },
        clone() {
          return { ...this, expressionMap: { ...this.expressionMap } };
        },
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockImplementation(function (gb?: string) {
          if (!gb) this.expressionMap.groupBys = [];
          return this;
        }),
        orderBy: jest.fn().mockImplementation(function (ob?: string) {
          if (!ob) this.expressionMap.orderBys = {};
          return this;
        }),
        getRawOne: jest.fn().mockResolvedValue({ count: '42' }),
      };

      const countDossiers = await (service as any).countDossiers(qbMock);
      expect(countDossiers).toBe(42);
      expect(qbMock.groupBy).toHaveBeenCalled();
      expect(qbMock.orderBy).toHaveBeenCalled();

      const countDistinct = await (
        service as any
      ).countDistinct(qbMock, 'customer.id');
      expect(countDistinct).toBe(42);
    });

    it('getSupplierCostSummary defensively clears orderBys and groupBys', async () => {
      const qbMock: any = {
        expressionMap: {
          orderBys: { costNet: 'DESC' },
          groupBys: ['supplier.id'],
        },
        clone() {
          return { ...this, expressionMap: { ...this.expressionMap } };
        },
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockImplementation(function (gb?: string) {
          if (!gb) this.expressionMap.groupBys = [];
          return this;
        }),
        orderBy: jest.fn().mockImplementation(function (ob?: string) {
          if (!ob) this.expressionMap.orderBys = {};
          return this;
        }),
        getRawOne: jest
          .fn()
          .mockResolvedValue({ costGross: '500', costNet: '400' }),
      };

      const result = await (service as any).getSupplierCostSummary(qbMock);
      expect(result).toEqual({ costGross: '500', costNet: '400' });
      expect(qbMock.groupBy).toHaveBeenCalled();
      expect(qbMock.orderBy).toHaveBeenCalled();
    });
  });

  describe('Sargable Locked Date Filtering (No Fallback)', () => {
    it('applies sargable range comparison without wrapping column in DATE()', () => {
      const andWhereMock = jest.fn().mockReturnThis();
      const qbMock: any = {
        andWhere: andWhereMock,
      };

      const query: any = {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      };

      (service as any).applyDateFilter(qbMock, query);

      expect(andWhereMock).toHaveBeenCalledWith('dossier.lockedAt IS NOT NULL');
      expect(andWhereMock).toHaveBeenCalledWith(
        'dossier.lockedAt >= :periodStart AND dossier.lockedAt <= :periodEnd',
        {
          periodStart: '2026-01-01 00:00:00',
          periodEnd: '2026-01-31 23:59:59.999',
        },
      );

      // Verify no non-sargable DATE() function wrap and NO COALESCE fallback
      const calls = andWhereMock.mock.calls.map((c) => c[0]);
      for (const callArg of calls) {
        expect(callArg).not.toContain('DATE(dossier.lockedAt)');
        expect(callArg).not.toContain('COALESCE');
      }
    });

    it('skips applying date filter when period boundaries are missing', () => {
      const andWhereMock = jest.fn().mockReturnThis();
      const qbMock: any = {
        andWhere: andWhereMock,
      };

      (service as any).applyDateFilter(qbMock, {} as any);
      expect(andWhereMock).not.toHaveBeenCalled();
    });
  });
});
