import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let repository: jest.Mocked<Repository<AuditLog>>;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['audit.view'],
    roles: ['SUPER_ADMIN'],
  } as unknown as CurrentUserPayload;

  const mockAuditLog = {
    id: 'log-uuid',
    organizationId: 'org-uuid',
    actorUserId: 'user-uuid',
    action: 'CREATE_DOSSIER',
    entityType: 'dossier',
    entityId: 'dossier-uuid-1',
    beforeData: null,
    afterData: {
      code: 'HS001',
      credentials: {
        password: 'should-not-leak',
        refreshTokenHash: 'should-not-leak-either',
      },
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    requestId: 'req-uuid-1',
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    updatedAt: new Date('2026-08-30T00:00:00.000Z'),
    actor: {
      id: 'user-uuid',
      fullName: 'Admin User',
      email: 'admin@skylux.vn',
      passwordHash: 'secret-hash',
      refreshTokenHash: 'refresh-hash',
    },
  } as unknown as AuditLog;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockAuditLogRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    repository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll (API-AUDIT-001)', () => {
    it('should return paginated audit logs with sanitized actor', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAuditLog], 1]);

      const queryDto: QueryAuditLogDto = {
        page: 1,
        pageSize: 20,
      };

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('auditLog');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'auditLog.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toEqual('log-uuid');
      expect((result.data[0].actor as any).passwordHash).toBeUndefined();
      expect(result.data[0].actor).toEqual({
        id: 'user-uuid',
        fullName: 'Admin User',
        email: 'admin@skylux.vn',
        avatarUrl: undefined,
      });
      expect(result.data[0].afterData).toEqual({
        code: 'HS001',
        credentials: '[REDACTED]',
      });
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply all filters when provided in queryDto', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const queryDto: QueryAuditLogDto = {
        actorUserId: 'actor-uuid',
        action: 'UPDATE',
        entityType: 'customer',
        entityId: 'cust-uuid',
        requestId: 'req-uuid',
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
        search: 'keyword',
        page: 2,
        pageSize: 10,
      };

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.actorUserId = :actorUserId',
        { actorUserId: 'actor-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.action ILIKE :action',
        { action: '%UPDATE%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.entityType = :entityType',
        { entityType: 'customer' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.entityId = :entityId',
        { entityId: 'cust-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.requestId = :requestId',
        { requestId: 'req-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.createdAt >= :from',
        { from: new Date('2026-08-01T00:00:00.000Z') },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'auditLog.createdAt <= :to',
        { to: new Date('2026-08-31T23:59:59.999Z') },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(auditLog.action ILIKE :search OR auditLog.entityType ILIKE :search OR auditLog.requestId ILIKE :search OR auditLog.ipAddress ILIKE :search)',
        { search: '%keyword%' },
      );
      expect(result.meta.page).toEqual(2);
      expect(result.meta.pageSize).toEqual(10);
    });

    it('should support the limit alias when pageSize is omitted', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(mockUserPayload, {
        limit: 5,
      });

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.meta.pageSize).toEqual(5);
    });

    it('should reject an inverted date range', async () => {
      await expect(
        service.findAll(mockUserPayload, {
          from: '2026-08-31T00:00:00.000Z',
          to: '2026-08-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findOne (API-AUDIT-002)', () => {
    it('should return audit log detail and sanitize actor', async () => {
      repository.findOne.mockResolvedValue(mockAuditLog);

      const result = await service.findOne(mockUserPayload, 'log-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'log-uuid', organizationId: 'org-uuid' },
        relations: { actor: true },
      });
      expect(result.data.id).toEqual('log-uuid');
      expect((result.data.actor as any).passwordHash).toBeUndefined();
      expect((result.data.actor as any).refreshTokenHash).toBeUndefined();
      expect(result.data.actor).toEqual({
        id: 'user-uuid',
        fullName: 'Admin User',
        email: 'admin@skylux.vn',
        avatarUrl: undefined,
      });
      expect(result.data.afterData).toEqual({
        code: 'HS001',
        credentials: '[REDACTED]',
      });
    });

    it('should throw NotFoundException if audit log not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('log (Internal helper)', () => {
    it('should create and save an audit log entry', async () => {
      const createDto: CreateAuditLogDto = {
        organizationId: 'org-uuid',
        actorUserId: 'user-uuid',
        action: 'UPDATE_ESTIMATE',
        entityType: 'estimate',
        entityId: 'est-uuid',
        afterData: { totalAmount: 10000000 },
      };

      repository.save.mockResolvedValue({
        id: 'new-log-uuid',
        ...createDto,
      } as any);

      const result = await service.log(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalled();
      expect(result.id).toEqual('new-log-uuid');
    });
  });
});
