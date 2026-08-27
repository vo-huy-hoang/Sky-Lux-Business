import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn().mockImplementation((indicators) => {
        // Thực thi các indicators để tăng test coverage và xác nhận không lỗi
        indicators.forEach((indicator: () => any) => indicator());
        return {
          status: 'ok',
          info: { database: { status: 'up' }, memory_heap: { status: 'up' } },
          error: {},
          details: {
            database: { status: 'up' },
            memory_heap: { status: 'up' },
          },
        };
      }),
    };

    const mockTypeOrmHealthIndicator = {
      pingCheck: jest.fn().mockReturnValue({ database: { status: 'up' } }),
    };

    const mockMemoryHealthIndicator = {
      checkHeap: jest.fn().mockReturnValue({ memory_heap: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should run health indicators and return status ok', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(healthCheckService.check).toHaveBeenCalled();
  });
});
