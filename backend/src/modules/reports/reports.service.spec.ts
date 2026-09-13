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
});
