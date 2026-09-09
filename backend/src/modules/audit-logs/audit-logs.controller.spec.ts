import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let service: AuditLogsService;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['audit.view'],
    roles: ['SUPER_ADMIN'],
  } as unknown as CurrentUserPayload;

  const mockAuditLogsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    service = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (API-AUDIT-001)', () => {
    it('should call service.findAll and return paginated audit logs', async () => {
      const queryDto = new QueryAuditLogDto();
      const mockResult = {
        data: [
          {
            id: 'log-uuid',
            action: 'CREATE',
            entityType: 'dossier',
            entityId: 'dossier-uuid',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockAuditLogsService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserPayload, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(mockUserPayload, queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne (API-AUDIT-002)', () => {
    it('should call service.findOne and return audit log detail', async () => {
      const mockResult = {
        data: {
          id: 'log-uuid',
          action: 'UPDATE',
          entityType: 'customer',
          entityId: 'cust-uuid',
        },
      };

      mockAuditLogsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(mockUserPayload, 'log-uuid');

      expect(service.findOne).toHaveBeenCalledWith(mockUserPayload, 'log-uuid');
      expect(result).toEqual(mockResult);
    });
  });
});
