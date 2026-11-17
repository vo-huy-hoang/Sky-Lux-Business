import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DataSource,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { DossiersService } from './dossiers.service';
import { Dossier } from './entities/dossier.entity';
import { Comment } from './entities/comment.entity';
import { Payment } from './entities/payment.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { DossierStatus, PaymentStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/audit-event.constants';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { DossierAccessPolicyService } from './dossier-access-policy.service';
import { QueryArchivedDossierDto } from './dto/query-archived-dossier.dto';

describe('DossiersService', () => {
  let service: DossiersService;
  let repository: jest.Mocked<Repository<Dossier>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;
  let customerRepository: jest.Mocked<Repository<Customer>>;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['dossier.view.all', 'dossier.create', 'dossier.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockDossier = {
    id: 'dossier-uuid',
    code: 'HS001',
    name: 'VIP Tour',
    organizationId: 'org-uuid',
    salesUserId: 'user-uuid',
    status: DossierStatus.DRAFT,
  } as unknown as Dossier;

  const mockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockCommentRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  const mockCustomerRepository = {
    findOne: jest.fn(),
  };

  const mockPaymentRepository = {
    find: jest.fn(),
  };

  const mockAuditLogRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockEntityManager = {
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
    recover: jest.fn(async (entityOrTarget, entities) => entities || entityOrTarget),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    getRepository: jest.fn(() => mockDossierRepository),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb: any) => cb(mockEntityManager)),
    getRepository: jest.fn((entity: any) => {
      if (entity === Payment) return mockPaymentRepository;
      if (entity === AuditLog) return mockAuditLogRepository;
      return mockDossierRepository;
    }),
  };

  const mockAuditLogsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockCustomerRepository.findOne.mockResolvedValue({
      id: 'cust-uuid',
      organizationId: 'org-uuid',
    });
    mockQueryBuilder.getOne.mockImplementation(async () =>
      mockDossierRepository.findOne(),
    );
    mockEntityManager.find.mockResolvedValue([]);
    mockEntityManager.softRemove.mockImplementation(async (entityOrTarget, entities) => entities || entityOrTarget);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiersService,
        DossierAccessPolicyService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn().mockResolvedValue([{ id: mockUserPayload.id }]),
          },
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<DossiersService>(DossiersService);
    repository = module.get(getRepositoryToken(Dossier));
    commentRepository = module.get(getRepositoryToken(Comment));
    customerRepository = module.get(getRepositoryToken(Customer));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of dossiers', async () => {
      const mockDossiers = [mockDossier];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockDossiers, 1]);

      const queryDto: QueryDossierDto = {
        page: 1,
        limit: 20,
        search: 'VIP',
        status: DossierStatus.DRAFT,
      };

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('dossier');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(dossier.code ILIKE :search OR dossier.name ILIKE :search OR dossier.route ILIKE :search OR dossier.customerName ILIKE :search OR customer.code ILIKE :search OR customer.displayName ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search)',
        { search: '%VIP%' },
      );
      expect(result).toEqual({
        data: mockDossiers,
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
    });

    it('should combine own and team visibility filters for a team-scoped user', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const teamUser = {
        ...mockUserPayload,
        id: 'team-user-uuid',
        departmentId: 'department-uuid',
        permissions: ['dossier.view.team'],
      } as unknown as CurrentUserPayload;

      await service.findAll(teamUser, { page: 1, limit: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('salesUser.departmentId'),
        { departmentId: 'department-uuid' },
      );
    });
  });

  describe('findOne', () => {
    it('should return dossier detail when found and authorized', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      const result = await service.findOne(mockUserPayload, 'dossier-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'dossier-uuid', organizationId: 'org-uuid' },
        relations: {
          customer: true,
          businessLine: true,
          marketType: true,
          salesUser: true,
          operatorUser: true,
          passengers: true,
          estimates: true,
        },
      });
      expect(result).toEqual(mockDossier);
    });

    it('should remove passwordHash from assigned users in the response', async () => {
      const dossierWithUsers = {
        ...mockDossier,
        salesUser: {
          id: 'sales-id',
          organizationId: 'org-uuid',
          fullName: 'Sales',
          passwordHash: 'secret',
        },
        operatorUser: {
          id: 'operator-id',
          organizationId: 'org-uuid',
          fullName: 'Operator',
          passwordHash: 'secret',
        },
      } as unknown as Dossier;
      repository.findOne.mockResolvedValue(dossierWithUsers);

      const result = await service.findOne(mockUserPayload, 'dossier-uuid');

      expect((result.salesUser as any).passwordHash).toBeUndefined();
      expect((result.operatorUser as any).passwordHash).toBeUndefined();
    });

    it('should reject a user who has update permission but no dossier view scope', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const updateOnlyUser = {
        ...mockUserPayload,
        permissions: ['dossier.update'],
      };

      await expect(
        service.findOne(updateOnlyUser, 'dossier-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if dossier is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new dossier with status DRAFT', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'VIP Tour',
        customerId: 'cust-uuid',
        customerName: 'Nguyễn Văn A',
        businessLineName: 'VÉ LẺ',
        marketTypeName: 'INBOUND',
      };

      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue({
        id: 'new-uuid',
        ...createDto,
        status: DossierStatus.DRAFT,
      } as any);

      const result = await service.create(mockUserPayload, createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'HS001', organizationId: 'org-uuid' },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Nguyễn Văn A',
          businessLineName: 'VÉ LẺ',
          marketTypeName: 'INBOUND',
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toEqual(DossierStatus.DRAFT);
    });

    it('should throw ConflictException if dossier code already exists', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'VIP Tour',
        customerId: 'cust-uuid',
      };

      repository.findOne.mockResolvedValue(mockDossier);

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if customerId does not belong to organization on create', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS002',
        name: 'Another Tour',
        customerId: 'cross-org-customer-id',
      };

      repository.findOne.mockResolvedValue(null);
      mockCustomerRepository.findOne.mockResolvedValue(null); // not found in org

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cross-org-customer-id', organizationId: 'org-uuid' },
      });
    });
  });

  describe('update', () => {
    it('should throw ConflictException if code is changed to an existing code', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockDossier) // findOne by ID
        .mockResolvedValueOnce({ id: 'other-id' } as any); // code existence check
      mockQueryBuilder.getOne.mockResolvedValueOnce({ ...mockDossier });

      const updateDto: UpdateDossierDto = { code: 'HS_DUPLICATE' };

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if updated customerId does not belong to organization', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      mockCustomerRepository.findOne.mockResolvedValue(null);

      const updateDto: UpdateDossierDto = {
        customerId: 'cross-org-customer-id',
      };

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cross-org-customer-id', organizationId: 'org-uuid' },
      });
    });

    it('should throw BadRequestException if transitioning status illegally', async () => {
      repository.findOne.mockResolvedValue(mockDossier); // starts in DRAFT

      const updateDto: UpdateDossierDto = { status: DossierStatus.APPROVED }; // DRAFT to APPROVED is illegal

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update properties and transition status legally', async () => {
      const activeDossier = {
        ...mockDossier,
        status: DossierStatus.DRAFT,
      };

      repository.findOne.mockResolvedValue(activeDossier);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateDossierDto = {
        name: 'VIP Tour Updated',
        businessLineName: 'SỰ KIỆN',
        marketTypeName: 'INBOUND',
        status: DossierStatus.SUBMITTED, // DRAFT to SUBMITTED is legal
      };

      const result = await service.update(
        mockUserPayload,
        'dossier-uuid',
        updateDto,
      );

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toEqual('VIP Tour Updated');
      expect(result.businessLineName).toEqual('SỰ KIỆN');
      expect(result.marketTypeName).toEqual('INBOUND');
      expect(result.status).toEqual(DossierStatus.SUBMITTED);
    });

    it('throws 409 ConflictException when update submits a stale version', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        version: 4,
      } as Dossier);

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', {
          name: 'Stale Name',
          version: 3,
        } as UpdateDossierDto),
      ).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('maps OptimisticLockVersionMismatchError on save to 409 ConflictException', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        version: 2,
      } as Dossier);
      repository.save.mockRejectedValue(
        new OptimisticLockVersionMismatchError('Dossier', 2, 3),
      );

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', {
          name: 'Concurrent Name',
          version: 2,
        } as UpdateDossierDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should allow owner to delete draft dossier and record audit log', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: mockUserPayload.id,
      });

      await service.remove(mockUserPayload, 'dossier-uuid', 'Xóa nháp');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOSSIER_DELETED,
          entityId: 'dossier-uuid',
          beforeData: expect.objectContaining({
            deletionReason: 'Xóa nháp',
          }),
        }),
      );
    });

    it('should allow owner or operator to delete NEED_CHANGES dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.NEED_CHANGES,
        salesUserId: mockUserPayload.id,
      });

      await service.remove(mockUserPayload, 'dossier-uuid', 'Xóa hồ sơ cần chỉnh sửa');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should allow owner to delete CANCELLED dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.CANCELLED,
        salesUserId: mockUserPayload.id,
      });

      await service.remove(mockUserPayload, 'dossier-uuid', 'Xóa hồ sơ đã hủy');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should allow operator to delete draft dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: 'another-sales-id',
      });
      const operatorPayload = {
        ...mockUserPayload,
        id: 'operator-user-id',
        roles: ['OPERATOR'],
      };

      await service.remove(operatorPayload, 'dossier-uuid', 'Điều hành dọn dẹp nháp');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should block deletion and throw ConflictException if dossier has actual collected payments', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: mockUserPayload.id,
      });
      mockEntityManager.find.mockResolvedValueOnce([
        {
          id: 'pay-1',
          dossierId: 'dossier-uuid',
          amount: 5000000,
          status: PaymentStatus.PAID,
        },
      ]);

      await expect(
        service.remove(mockUserPayload, 'dossier-uuid'),
      ).rejects.toThrow(ConflictException);
      expect(mockEntityManager.softRemove).not.toHaveBeenCalled();
    });

    it('should allow deletion if existing payments are CANCELLED', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: mockUserPayload.id,
      });
      mockEntityManager.find.mockImplementation(async (entity) => {
        if (entity === Payment) {
          return [
            {
              id: 'pay-cancelled',
              dossierId: 'dossier-uuid',
              amount: 5000000,
              status: PaymentStatus.CANCELLED,
            },
          ];
        }
        return [];
      });

      await service.remove(mockUserPayload, 'dossier-uuid');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should throw BadRequestException if non-admin tries to delete APPROVED dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.APPROVED,
        salesUserId: mockUserPayload.id,
      });

      await expect(
        service.remove(
          { ...mockUserPayload, roles: ['SALES'] },
          'dossier-uuid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if non-admin tries to delete COMPLETED dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.COMPLETED,
        salesUserId: mockUserPayload.id,
      });

      await expect(
        service.remove(
          { ...mockUserPayload, roles: ['OPERATOR'] },
          'dossier-uuid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow CEO_ADMIN to delete APPROVED or COMPLETED dossier when no payments exist', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.COMPLETED,
        salesUserId: 'another-user',
      });
      const ceoPayload = {
        ...mockUserPayload,
        id: 'ceo-user',
        roles: ['CEO_ADMIN'],
      };

      await service.remove(ceoPayload, 'dossier-uuid', 'Dọn dẹp hồ sơ test');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should throw BadRequestException if non-superadmin tries to delete LOCKED dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.LOCKED,
        salesUserId: mockUserPayload.id,
      });

      await expect(
        service.remove(
          { ...mockUserPayload, roles: ['CEO_ADMIN'] },
          'dossier-uuid',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow SUPER_ADMIN to delete LOCKED dossier when no payments exist', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.LOCKED,
        salesUserId: 'another-user',
      });
      const superAdminPayload = {
        ...mockUserPayload,
        id: 'super-admin',
        roles: ['SUPER_ADMIN'],
      };

      await service.remove(superAdminPayload, 'dossier-uuid');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });

    it('should throw ForbiddenException if regular sales user tries to delete another sales user draft dossier', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: 'other-sales-user',
        createdBy: 'other-sales-user',
      });

      await expect(
        service.remove(
          { ...mockUserPayload, id: 'different-sales-user', roles: ['SALES'] },
          'dossier-uuid',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should cascade softRemove to associated child estimates within the database transaction', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.DRAFT,
        salesUserId: mockUserPayload.id,
      });
      const mockEstimates = [
        { id: 'est-1', dossierId: 'dossier-uuid', versionNo: 1 },
        { id: 'est-2', dossierId: 'dossier-uuid', versionNo: 2 },
      ];
      mockEntityManager.find.mockImplementation(async (entity) => {
        if (entity === Estimate) {
          return mockEstimates;
        }
        if (entity === Payment) {
          return [];
        }
        return [];
      });

      await service.remove(mockUserPayload, 'dossier-uuid');

      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Estimate,
        mockEstimates,
      );
      expect(mockEntityManager.softRemove).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-uuid' }),
      );
    });
  });

  describe('findComments (API-COMMENT-001)', () => {
    it('should return comments with sanitized user details', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Hello, this is a note.',
          user: { id: 'u1', fullName: 'Nguyen A', passwordHash: 'secret' },
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockComments);

      const result = await service.findComments(
        mockUserPayload,
        'dossier-uuid',
      );

      expect(commentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'comment',
      );
      expect(result.data).toHaveLength(1);
      expect((result.data[0].user as any).passwordHash).toBeUndefined();
    });

    it('should apply pagination and search when queryDto is provided', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Hello search',
          user: { id: 'u1', fullName: 'Nguyen A' },
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockComments, 1]);

      const queryDto: QueryCommentDto = {
        page: 1,
        pageSize: 10,
        search: 'Hello',
      };

      const result = await service.findComments(
        mockUserPayload,
        'dossier-uuid',
        queryDto,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'comment.content ILIKE :search',
        { search: '%Hello%' },
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('createComment (API-COMMENT-002)', () => {
    it('should create and return comment with sanitized user details', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const savedComment = {
        id: 'new-comm-uuid',
        content: 'Bình luận thử nghiệm',
        dossierId: 'dossier-uuid',
        organizationId: 'org-uuid',
      };
      commentRepository.save.mockResolvedValue(savedComment as any);
      commentRepository.findOne.mockResolvedValue({
        ...savedComment,
        user: {
          id: 'user-uuid',
          fullName: 'Test User',
          passwordHash: 'secret123',
          refreshTokenHash: 'refreshSecret',
        },
      } as any);

      const createDto: CreateCommentDto = {
        content: 'Bình luận thử nghiệm',
      };

      const result = await service.createComment(
        mockUserPayload,
        'dossier-uuid',
        createDto,
      );

      expect(commentRepository.create).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalled();
      expect(result.data.id).toEqual('new-comm-uuid');
      expect((result.data.user as any).passwordHash).toBeUndefined();
      expect((result.data.user as any).refreshTokenHash).toBeUndefined();
    });

    it('should create reply comment when valid parentId is provided', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const parentComment = {
        id: 'parent-comm-uuid',
        content: 'Parent comment',
        dossierId: 'dossier-uuid',
        organizationId: 'org-uuid',
      };
      commentRepository.findOne
        .mockResolvedValueOnce(parentComment as any) // check parentId
        .mockResolvedValueOnce({
          id: 'child-comm-uuid',
          content: 'Child comment',
          parentId: 'parent-comm-uuid',
        } as any); // fetch with user

      commentRepository.save.mockResolvedValue({
        id: 'child-comm-uuid',
        parentId: 'parent-comm-uuid',
      } as any);

      const createDto: CreateCommentDto = {
        content: 'Child comment',
        parentId: 'parent-comm-uuid',
      };

      const result = await service.createComment(
        mockUserPayload,
        'dossier-uuid',
        createDto,
      );

      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'parent-comm-uuid',
          dossierId: 'dossier-uuid',
          organizationId: 'org-uuid',
        },
      });
      expect(result.data.id).toEqual('child-comm-uuid');
    });

    it('should throw BadRequestException if dossier is LOCKED', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.LOCKED,
      });

      const createDto: CreateCommentDto = {
        content: 'Test on locked dossier',
      };

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if parent comment is not found', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      commentRepository.findOne.mockResolvedValue(null);

      const createDto: CreateCommentDto = {
        content: 'Test reply',
        parentId: 'non-existent-parent',
      };

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject a comment containing only whitespace', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', {
          content: '   ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(commentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findArchived', () => {
    it('should return paginated archived dossiers enriched with deletedByUser and deletionReason', async () => {
      const archivedDossier = {
        ...mockDossier,
        id: 'archived-id-1',
        deletedAt: new Date(),
      };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[archivedDossier], 1]);
      mockAuditLogRepository.find.mockResolvedValue([
        {
          entityId: 'archived-id-1',
          actor: { id: 'admin-id', fullName: 'Admin User', employeeCode: 'EMP001' },
          beforeData: { deletionReason: 'Hủy kế hoạch đoàn' },
        },
      ]);

      const result = await service.findArchived(mockUserPayload, new QueryArchivedDossierDto());

      expect(mockQueryBuilder.withDeleted).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'dossier.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('dossier.deletedAt IS NOT NULL');
      expect(result.data).toHaveLength(1);
      expect((result.data[0] as any).deletionReason).toBe('Hủy kế hoạch đoàn');
      expect((result.data[0] as any).deletedByUser.fullName).toBe('Admin User');
    });

    it('should strictly limit Sales user to only their own deleted dossiers', async () => {
      const salesUser = {
        id: 'sales-1',
        organizationId: 'org-uuid',
        roles: ['SALES'],
        permissions: ['dossier.view.own'],
      } as unknown as CurrentUserPayload;
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findArchived(salesUser, new QueryArchivedDossierDto());

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(dossier.salesUserId = :currentUserId OR dossier.createdBy = :currentUserId)',
        { currentUserId: 'sales-1' },
      );
    });

    it('should apply status, salesUserId and search filters when provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const queryDto: QueryArchivedDossierDto = {
        page: 1,
        limit: 10,
        status: DossierStatus.DRAFT,
        salesUserId: 'sales-uuid',
        search: 'Hà Nội',
      };

      await service.findArchived(mockUserPayload, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'dossier.status = :status',
        { status: DossierStatus.DRAFT },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'dossier.salesUserId = :salesUserId',
        { salesUserId: 'sales-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('dossier.code ILIKE :search'),
        { search: '%Hà Nội%' },
      );
    });
  });

  describe('restore', () => {
    it('should throw NotFoundException if deleted dossier is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.restore(mockUserPayload, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if Sales tries to restore another sales user dossier', async () => {
      const salesUser = {
        id: 'sales-user-1',
        organizationId: 'org-uuid',
        roles: ['SALES'],
        permissions: ['dossier.update'],
      } as unknown as CurrentUserPayload;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockDossier,
        id: 'dossier-other-sales',
        salesUserId: 'sales-user-2',
        createdBy: 'sales-user-2',
        deletedAt: new Date(),
        status: DossierStatus.DRAFT,
      });

      await expect(
        service.restore(salesUser, 'dossier-other-sales'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if Sales tries to restore non-DRAFT dossier', async () => {
      const salesUser = {
        id: 'sales-user-1',
        organizationId: 'org-uuid',
        roles: ['SALES'],
        permissions: ['dossier.update'],
      } as unknown as CurrentUserPayload;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockDossier,
        id: 'dossier-approved',
        salesUserId: 'sales-user-1',
        createdBy: 'sales-user-1',
        deletedAt: new Date(),
        status: DossierStatus.APPROVED,
      });

      await expect(
        service.restore(salesUser, 'dossier-approved'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Sales to restore own draft dossier and cascade recover child estimates', async () => {
      const salesUser = {
        id: 'sales-user-1',
        organizationId: 'org-uuid',
        roles: ['SALES'],
        permissions: ['dossier.update', 'dossier.view.own'],
      } as unknown as CurrentUserPayload;
      const softDeletedDossier = {
        ...mockDossier,
        id: 'dossier-to-restore',
        code: 'TOUR-SG-01',
        salesUserId: 'sales-user-1',
        createdBy: 'sales-user-1',
        deletedAt: new Date(),
        status: DossierStatus.DRAFT,
      };
      mockQueryBuilder.getOne.mockResolvedValue(softDeletedDossier);
      mockEntityManager.findOne.mockResolvedValue(null); // No collision
      mockQueryBuilder.getMany.mockResolvedValue([{ id: 'est-1', deletedAt: new Date() }]);
      repository.findOne.mockResolvedValue(softDeletedDossier);

      const result = await service.restore(salesUser, 'dossier-to-restore');

      expect(mockEntityManager.recover).toHaveBeenCalledWith(
        Estimate,
        expect.arrayContaining([expect.objectContaining({ id: 'est-1' })]),
      );
      expect(mockEntityManager.recover).toHaveBeenCalledWith(
        Dossier,
        softDeletedDossier,
      );
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOSSIER_RESTORED,
          entityId: 'dossier-to-restore',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should resolve code collision by appending -RESTORED suffix if code is occupied by an active dossier', async () => {
      const adminUser = {
        id: 'ceo-user-1',
        organizationId: 'org-uuid',
        roles: ['CEO_ADMIN'],
        permissions: ['*'],
      } as unknown as CurrentUserPayload;
      const softDeletedDossier = {
        ...mockDossier,
        id: 'dossier-colliding',
        code: 'TOUR-HA-NOI',
        deletedAt: new Date(),
        status: DossierStatus.APPROVED,
      };
      mockQueryBuilder.getOne.mockResolvedValue(softDeletedDossier);
      mockEntityManager.findOne
        .mockResolvedValueOnce({ id: 'active-other-id', code: 'TOUR-HA-NOI' })
        .mockResolvedValueOnce(null);

      mockQueryBuilder.getMany.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(softDeletedDossier);

      await service.restore(adminUser, 'dossier-colliding');

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        Dossier,
        { id: 'dossier-colliding' },
        { code: 'TOUR-HA-NOI-RESTORED' },
      );
    });
  });

  describe('purge', () => {
    it('should throw NotFoundException if dossier not found in trash', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.purge(mockUserPayload, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if non-admin user attempts to purge', async () => {
      const operatorUser = {
        id: 'op-1',
        organizationId: 'org-uuid',
        roles: ['OPERATOR'],
        permissions: ['dossier.delete'],
      } as unknown as CurrentUserPayload;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockDossier,
        id: 'dossier-trash-1',
        deletedAt: new Date(),
      });

      await expect(
        service.purge(operatorUser, 'dossier-trash-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if dossier has real non-cancelled payments', async () => {
      const adminUser = {
        id: 'admin-1',
        organizationId: 'org-uuid',
        roles: ['CEO_ADMIN'],
        permissions: ['*'],
      } as unknown as CurrentUserPayload;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockDossier,
        id: 'dossier-with-payment',
        deletedAt: new Date(),
      });
      mockPaymentRepository.find.mockResolvedValue([
        { id: 'pay-1', status: PaymentStatus.PAID, amount: 5000000 },
      ]);

      await expect(
        service.purge(adminUser, 'dossier-with-payment'),
      ).rejects.toThrow(ConflictException);
    });

    it('should permanently hard-delete dossier and child records when user is CEO_ADMIN', async () => {
      const adminUser = {
        id: 'admin-1',
        organizationId: 'org-uuid',
        roles: ['CEO_ADMIN'],
        permissions: ['*'],
      } as unknown as CurrentUserPayload;
      const dossierToPurge = {
        ...mockDossier,
        id: 'dossier-clean-purge',
        deletedAt: new Date(),
      };
      mockQueryBuilder.getOne.mockResolvedValue(dossierToPurge);
      mockPaymentRepository.find.mockResolvedValue([]);

      await service.purge(adminUser, 'dossier-clean-purge');

      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        Dossier,
        { id: 'dossier-clean-purge', organizationId: 'org-uuid' },
      );
      expect(mockEntityManager.delete).toHaveBeenCalledWith(
        Estimate,
        { dossierId: 'dossier-clean-purge', organizationId: 'org-uuid' },
      );
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOSSIER_PURGED,
          entityId: 'dossier-clean-purge',
        }),
      );
    });
  });
});
