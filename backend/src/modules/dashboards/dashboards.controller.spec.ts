import { Test, TestingModule } from '@nestjs/testing';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { KpiPeriodType } from '../../common/enums';

describe('DashboardsController', () => {
  let controller: DashboardsController;
  let service: jest.Mocked<DashboardsService>;

  beforeEach(async () => {
    const mockDashboardsService = {
      getSalesDashboard: jest.fn(),
      getOperatorDashboard: jest.fn(),
      getCeoDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardsController],
      providers: [
        {
          provide: DashboardsService,
          useValue: mockDashboardsService,
        },
      ],
    }).compile();

    controller = module.get<DashboardsController>(DashboardsController);
    service = module.get<DashboardsService>(
      DashboardsService,
    ) as jest.Mocked<DashboardsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSalesDashboard', () => {
    it('should delegate to service', async () => {
      const mockResult = { revenue: 100 } as any;
      service.getSalesDashboard.mockResolvedValue(mockResult);

      const result = await controller.getSalesDashboard('org-id', 'user-id', {
        periodType: KpiPeriodType.MONTHLY,
      });

      expect(result).toBe(mockResult);
      expect(service.getSalesDashboard).toHaveBeenCalledWith(
        'org-id',
        'user-id',
        {
          periodType: KpiPeriodType.MONTHLY,
        },
      );
    });
  });
});
