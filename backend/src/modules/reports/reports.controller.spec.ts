import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportExportDto } from './dto/report-export.dto';
import { ReportQueryDto } from './dto/report-query.dto';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: {
    getRevenueReport: jest.Mock;
    getSalesPerformanceReport: jest.Mock;
    getCustomerReport: jest.Mock;
    getSupplierReport: jest.Mock;
    exportReport: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getRevenueReport: jest.fn(),
      getSalesPerformanceReport: jest.fn(),
      getCustomerReport: jest.fn(),
      getSupplierReport: jest.fn(),
      exportReport: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: service }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each([
    ['getRevenue', 'getRevenueReport'],
    ['getSalesPerformance', 'getSalesPerformanceReport'],
    ['getCustomer', 'getCustomerReport'],
    ['getSupplier', 'getSupplierReport'],
  ])('%s delegates to the matching report service', async (method, target) => {
    const query = new ReportQueryDto();
    const expected = { data: [], meta: {} };
    service[target as keyof typeof service].mockResolvedValue(expected);
    type ReportHandler = (
      organizationId: string,
      userId: string,
      departmentId: string,
      roles: string[],
      permissions: string[],
      queryDto: ReportQueryDto,
    ) => unknown;
    const handlers: Record<string, ReportHandler> = {
      getRevenue: controller.getRevenue.bind(controller),
      getSalesPerformance: controller.getSalesPerformance.bind(controller),
      getCustomer: controller.getCustomer.bind(controller),
      getSupplier: controller.getSupplier.bind(controller),
    };

    const result = await handlers[method](
      'org-id',
      'user-id',
      'department-id',
      ['SALES'],
      ['report.view'],
      query,
    );

    expect(result).toBe(expected);
    expect(service[target as keyof typeof service]).toHaveBeenCalledWith(
      'org-id',
      query,
      {
        userId: 'user-id',
        departmentId: 'department-id',
        roles: ['SALES'],
        permissions: ['report.view'],
      },
    );
  });

  it('exports the generated report as a download', async () => {
    const request: ReportExportDto = {
      reportType: 'revenue',
      format: 'CSV',
    };
    const buffer = Buffer.from('csv');
    service.exportReport.mockResolvedValue({
      buffer,
      contentType: 'text/csv; charset=utf-8',
      filename: 'report.csv',
      rowCount: 1,
    });
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await controller.export(
      'org-id',
      'user-id',
      'department-id',
      ['ACCOUNTANT'],
      ['report.export'],
      request,
      response as never,
    );

    expect(service.exportReport).toHaveBeenCalledWith(
      'org-id',
      'user-id',
      request,
      {
        userId: 'user-id',
        departmentId: 'department-id',
        roles: ['ACCOUNTANT'],
        permissions: ['report.export'],
      },
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(response.send).toHaveBeenCalledWith(buffer);
  });
});
