import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('AuditLogs Module (Integration)', () => {
  let controller: AuditLogsController;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgA = {
    id: 'user-A-uuid',
    organizationId: orgA,
    permissions: ['audit.view'],
    roles: ['SUPER_ADMIN'],
  } as unknown as CurrentUserPayload;

  const mockLogOfOrgB = {
    id: 'log-B-uuid',
    organizationId: orgB,
    actorUserId: 'user-B-uuid',
    action: 'DELETE_CUSTOMER',
    entityType: 'customer',
    entityId: 'cust-B-uuid',
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
  } as unknown as AuditLog;

  const mockLogOfOrgA = {
    id: 'log-A-uuid',
    organizationId: orgA,
    actorUserId: 'user-A-uuid',
    action: 'CREATE_DOSSIER',
    entityType: 'dossier',
    entityId: 'dossier-A-uuid',
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
    actor: {
      id: 'user-A-uuid',
      fullName: 'Admin Org A',
      email: 'admin@orga.com',
      passwordHash: 'secret-hash-a',
      refreshTokenHash: 'refresh-hash-a',
    },
  } as unknown as AuditLog;

  const mockAuditLogRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ xem chi tiết audit log của Doanh nghiệp B (Trả về 404)', async () => {
      auditLogRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'log-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockLogOfOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgA, 'log-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A xem được audit log của chính doanh nghiệp mình và làm sạch thông tin nhạy cảm', async () => {
      auditLogRepository.findOne.mockResolvedValue(mockLogOfOrgA);

      const result = await controller.findOne(mockUserOrgA, 'log-A-uuid');

      expect(result.data.id).toEqual('log-A-uuid');
      expect(result.data.organizationId).toEqual(orgA);
      expect((result.data.actor as any).passwordHash).toBeUndefined();
      expect((result.data.actor as any).refreshTokenHash).toBeUndefined();
    });
  });

  describe('2. Truy vấn danh sách audit log theo tenant (API-AUDIT-001)', () => {
    it('Chỉ truy vấn audit logs trong phạm vi organizationId của user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockLogOfOrgA], 1]),
      };

      auditLogRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const queryDto = new QueryAuditLogDto();
      const result = await controller.findAll(mockUserOrgA, queryDto);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'auditLog.organizationId = :organizationId',
        { organizationId: orgA },
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toEqual(1);
    });
  });
});
