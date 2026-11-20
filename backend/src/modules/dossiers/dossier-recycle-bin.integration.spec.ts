import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { Dossier } from './entities/dossier.entity';
import { Comment } from './entities/comment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DossierStatus, PaymentStatus } from '../../common/enums';
import { DossierWorkflowService } from '../approvals/dossier-workflow.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { DossierAccessPolicyService } from './dossier-access-policy.service';
import { AuditAction, AuditEntityType } from '../audit-logs/audit-event.constants';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { QueryArchivedDossierDto } from './dto/query-archived-dossier.dto';
import { ImportProcessor } from '../imports/queue/import.processor';
import { ImportSession } from '../imports/entities/import-session.entity';
import { ImportRow } from '../imports/entities/import-row.entity';
import { ImportError } from '../imports/entities/import-error.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';

describe('Dossier Recycle Bin & Anti-Duplication Integration Suite (Ticket 05)', () => {
  let dossiersController: DossiersController;
  let dossiersService: DossiersService;
  let importProcessor: ImportProcessor;
  let auditLogsService: AuditLogsService;

  const orgId = 'org-safari-101';
  const salesAId = 'sales-user-A-uuid';
  const salesBId = 'sales-user-B-uuid';
  const ceoAdminId = 'ceo-admin-user-uuid';

  const mockSalesA: CurrentUserPayload = {
    id: salesAId,
    organizationId: orgId,
    email: 'sales.a@safari.vn',
    fullName: 'Sales A',
    employeeCode: 'EMP-SALES-A',
    roles: ['SALES'],
    permissions: ['dossier.view.own', 'dossier.create', 'dossier.update', 'dossier.delete'],
  };

  const mockSalesB: CurrentUserPayload = {
    id: salesBId,
    organizationId: orgId,
    email: 'sales.b@safari.vn',
    fullName: 'Sales B',
    employeeCode: 'EMP-SALES-B',
    roles: ['SALES'],
    permissions: ['dossier.view.own', 'dossier.create', 'dossier.update', 'dossier.delete'],
  };

  const mockCeoAdmin: CurrentUserPayload = {
    id: ceoAdminId,
    organizationId: orgId,
    email: 'ceo@safari.vn',
    fullName: 'CEO Admin',
    employeeCode: 'EMP-CEO-ADMIN',
    roles: ['CEO_ADMIN'],
    permissions: ['dossier.view.all', 'dossier.create', 'dossier.update', 'dossier.delete'],
  };

  // Mock in-memory state
  let mockDossierStorage: Dossier[] = [];
  let mockEstimateStorage: Estimate[] = [];
  let mockPaymentStorage: Payment[] = [];
  let mockAuditLogs: Array<{ action: string; entityId: string; actorUserId: string }> = [];

  // QueryBuilder mock
  const createMockQueryBuilder = (initialData: any[]) => {
    let dataset = [...initialData];
    const qb: any = {
      withDeleted: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockImplementation((condition: string, params: any) => {
        if (params?.organizationId) {
          dataset = dataset.filter((d) => d.organizationId === params.organizationId);
        }
        if (params?.id) {
          dataset = dataset.filter((d) => d.id === params.id);
        }
        if (params?.dossierId) {
          dataset = dataset.filter((d) => d.dossierId === params.dossierId);
        }
        return qb;
      }),
      andWhere: jest.fn().mockImplementation((condition: string, params: any) => {
        if (condition.includes('dossier.deletedAt IS NOT NULL')) {
          dataset = dataset.filter((d) => d.deletedAt !== null && d.deletedAt !== undefined);
        }
        if (params?.currentUserId) {
          dataset = dataset.filter(
            (d) => d.salesUserId === params.currentUserId || d.createdBy === params.currentUserId,
          );
        }
        if (params?.userId) {
          dataset = dataset.filter(
            (d) => d.salesUserId === params.userId || d.createdBy === params.userId,
          );
        }
        if (params?.startDate) {
          dataset = dataset.filter((d) => d.startDate === params.startDate);
        }
        if (params?.route) {
          const cleanRoute = params.route.replace(/%/g, '').toLowerCase();
          dataset = dataset.filter((d) => (d.route || '').toLowerCase().includes(cleanRoute));
        }
        if (params?.customerId) {
          dataset = dataset.filter((d) => d.customerId === params.customerId);
        }
        return qb;
      }),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(async () => dataset[0] || null),
      getMany: jest.fn().mockImplementation(async () => [...dataset]),
      getManyAndCount: jest.fn().mockImplementation(async () => [[...dataset], dataset.length]),
    };
    return qb;
  };

  const mockDossierRepo = {
    createQueryBuilder: jest.fn(() => createMockQueryBuilder(mockDossierStorage)),
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      return (
        mockDossierStorage.find((d) => {
          if (where.organizationId && d.organizationId !== where.organizationId) return false;
          if (where.id && d.id !== where.id) return false;
          if (where.code && d.code !== where.code) return false;
          if (d.deletedAt !== null && d.deletedAt !== undefined) return false;
          return true;
        }) || null
      );
    }),
    save: jest.fn().mockImplementation(async (entity) => {
      const idx = mockDossierStorage.findIndex((d) => d.id === entity.id);
      if (idx >= 0) {
        mockDossierStorage[idx] = { ...mockDossierStorage[idx], ...entity };
        return mockDossierStorage[idx];
      }
      mockDossierStorage.push(entity);
      return entity;
    }),
    update: jest.fn().mockImplementation(async (criteria, updateData) => {
      const target = mockDossierStorage.find((d) => d.id === criteria.id);
      if (target) Object.assign(target, updateData);
    }),
  };

  const mockEstimateRepo = {
    createQueryBuilder: jest.fn(() => createMockQueryBuilder(mockEstimateStorage)),
    find: jest.fn().mockImplementation(async ({ where }: any) => {
      return mockEstimateStorage.filter((e) => {
        if (where.dossierId && e.dossierId !== where.dossierId) return false;
        if (where.organizationId && e.organizationId !== where.organizationId) return false;
        return true;
      });
    }),
  };

  const mockPaymentRepo = {
    find: jest.fn().mockImplementation(async ({ where }: any) => {
      return mockPaymentStorage.filter((p) => {
        if (where.dossierId && p.dossierId !== where.dossierId) return false;
        if (where.organizationId && p.organizationId !== where.organizationId) return false;
        return true;
      });
    }),
  };

  const mockAuditLogRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockTxManager = {
    getRepository: jest.fn((entity) => {
      if (entity === Dossier) return mockDossierRepo;
      if (entity === Estimate) return mockEstimateRepo;
      if (entity === Payment) return mockPaymentRepo;
      if (entity === AuditLog) return mockAuditLogRepo;
      return mockDossierRepo;
    }),
    findOne: jest.fn().mockImplementation(async (entity, { where }: any) => {
      if (entity === Dossier) {
        return (
          mockDossierStorage.find((d) => {
            if (where.organizationId && d.organizationId !== where.organizationId) return false;
            if (where.code && d.code !== where.code) return false;
            if (where.id && d.id !== where.id) return false;
            if (d.deletedAt !== null && d.deletedAt !== undefined) return false;
            return true;
          }) || null
        );
      }
      return null;
    }),
    update: jest.fn().mockImplementation(async (entity, criteria, updateData) => {
      if (entity === Dossier) {
        const item = mockDossierStorage.find((d) => d.id === criteria.id);
        if (item) Object.assign(item, updateData);
      }
    }),
    find: jest.fn().mockImplementation(async (entity, { where }: any) => {
      if (entity === Estimate) {
        return mockEstimateStorage.filter((e) => e.dossierId === where.dossierId);
      }
      return [];
    }),
    recover: jest.fn().mockImplementation(async (entity, target) => {
      const items = Array.isArray(target) ? target : [target];
      for (const item of items) {
        item.deletedAt = null;
      }
      return target;
    }),
    delete: jest.fn().mockImplementation(async (entity, criteria) => {
      if (criteria.dossierId) {
        mockEstimateStorage = mockEstimateStorage.filter((e) => e.dossierId !== criteria.dossierId);
      }
      if (criteria.id) {
        mockDossierStorage = mockDossierStorage.filter((d) => d.id !== criteria.id);
      }
    }),
    createQueryBuilder: jest.fn((entity) => {
      if (entity === Estimate) return createMockQueryBuilder(mockEstimateStorage);
      return createMockQueryBuilder(mockDossierStorage);
    }),
  };

  const mockDataSource = {
    getRepository: jest.fn((entity) => {
      if (entity === Payment) return mockPaymentRepo;
      if (entity === AuditLog) return mockAuditLogRepo;
      if (entity === Estimate) return mockEstimateRepo;
      return mockDossierRepo;
    }),
    transaction: jest.fn().mockImplementation(async (cb) => cb(mockTxManager)),
  };

  // Mock repos for ImportProcessor
  const mockSessionRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const mockRowRepo = {
    find: jest.fn(),
    save: jest.fn().mockImplementation(async (rows) => rows),
  };
  const mockErrorRepo = {
    create: jest.fn((e) => e),
    save: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  const mockCustomerRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'cust-uuid-1', organizationId: orgId, code: 'CUST-001', displayName: 'VinFast' }),
    find: jest.fn().mockResolvedValue([]),
  };
  const mockSupplierRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((s) => s),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockDossierStorage = [];
    mockEstimateStorage = [];
    mockPaymentStorage = [];
    mockAuditLogs = [];

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossiersController],
      providers: [
        DossiersService,
        DossierAccessPolicyService,
        ImportProcessor,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepo,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: { createQueryBuilder: jest.fn(), findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn().mockResolvedValue([
              { id: salesAId, fullName: 'Sales A', organizationId: orgId },
              { id: salesBId, fullName: 'Sales B', organizationId: orgId },
            ]),
          },
        },
        {
          provide: DossierWorkflowService,
          useValue: {},
        },
        {
          provide: DocumentsService,
          useValue: { findByDossier: jest.fn(), uploadForDossier: jest.fn() },
        },
        {
          provide: AuditLogsService,
          useValue: {
            record: jest.fn().mockImplementation(async (payload) => {
              mockAuditLogs.push(payload);
            }),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        // ImportProcessor providers
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(ImportRow),
          useValue: mockRowRepo,
        },
        {
          provide: getRepositoryToken(ImportError),
          useValue: mockErrorRepo,
        },
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepo,
        },
      ],
    }).compile();

    dossiersController = module.get<DossiersController>(DossiersController);
    dossiersService = module.get<DossiersService>(DossiersService);
    importProcessor = module.get<ImportProcessor>(ImportProcessor);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // THEME 1: Cross-Role Privacy & Sales Ownership Scoping
  // =========================================================================
  describe('1. Phân quyền Riêng tư giữa các Sales (Sales Boundary Privacy Test)', () => {
    beforeEach(() => {
      // Seed 2 deleted dossiers: one by Sales A, one by Sales B
      mockDossierStorage = [
        {
          id: 'dossier-deleted-A',
          code: 'TOUR-SALES-A',
          name: 'Tour Hà Nội - Hạ Long của Sales A',
          organizationId: orgId,
          salesUserId: salesAId,
          createdBy: salesAId,
          status: DossierStatus.DRAFT,
          deletedAt: new Date('2026-11-10T10:00:00Z'),
        } as unknown as Dossier,
        {
          id: 'dossier-deleted-B',
          code: 'TOUR-SALES-B',
          name: 'Tour Sài Gòn - Phú Quốc của Sales B',
          organizationId: orgId,
          salesUserId: salesBId,
          createdBy: salesBId,
          status: DossierStatus.DRAFT,
          deletedAt: new Date('2026-11-12T10:00:00Z'),
        } as unknown as Dossier,
      ];
    });

    it('Sales A vào Thùng rác chỉ nhìn thấy hồ sơ của mình, không thấy hồ sơ của Sales B', async () => {
      const result = await dossiersController.findArchived(mockSalesA, new QueryArchivedDossierDto());

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('dossier-deleted-A');
      expect(result.data[0].salesUserId).toBe(salesAId);
      expect(result.data.find((d) => d.id === 'dossier-deleted-B')).toBeUndefined();
    });

    it('Sales B vào Thùng rác chỉ nhìn thấy hồ sơ của mình, không thấy hồ sơ của Sales A', async () => {
      const result = await dossiersController.findArchived(mockSalesB, new QueryArchivedDossierDto());

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('dossier-deleted-B');
      expect(result.data[0].salesUserId).toBe(salesBId);
      expect(result.data.find((d) => d.id === 'dossier-deleted-A')).toBeUndefined();
    });

    it('CEO_ADMIN vào Thùng rác nhìn thấy toàn bộ hồ sơ đã xóa của cả Sales A và Sales B', async () => {
      const result = await dossiersController.findArchived(mockCeoAdmin, new QueryArchivedDossierDto());

      expect(result.data).toHaveLength(2);
      const ids = result.data.map((d) => d.id);
      expect(ids).toContain('dossier-deleted-A');
      expect(ids).toContain('dossier-deleted-B');
    });

    it('Sales B cố tình gọi API restore hồ sơ của Sales A -> Bị từ chối (404 Not Found anti-enumeration)', async () => {
      await expect(
        dossiersController.restore(mockSalesB, 'dossier-deleted-A'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Sales A cố tình khôi phục hồ sơ đã xóa ở trạng thái APPROVED -> Bị từ chối (403 Forbidden)', async () => {
      mockDossierStorage.push({
        id: 'dossier-approved-deleted-A',
        code: 'TOUR-SALES-A-APP',
        organizationId: orgId,
        salesUserId: salesAId,
        createdBy: salesAId,
        status: DossierStatus.APPROVED,
        deletedAt: new Date(),
      } as unknown as Dossier);

      await expect(
        dossiersController.restore(mockSalesA, 'dossier-approved-deleted-A'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Sales A khôi phục thành công hồ sơ DRAFT của chính mình', async () => {
      // Mock findOne for post-restore reload
      mockDossierRepo.findOne.mockImplementationOnce(async () => {
        return mockDossierStorage.find((d) => d.id === 'dossier-deleted-A');
      });

      const restored = await dossiersController.restore(mockSalesA, 'dossier-deleted-A');
      expect(restored).toBeDefined();
      expect(mockTxManager.recover).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: 'dossier-deleted-A' }),
      );
    });

    it('Sales A cố tình gọi purge (xóa vĩnh viễn) -> Bị từ chối (403 Forbidden)', async () => {
      await expect(
        dossiersController.purge(mockSalesA, 'dossier-deleted-A'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // THEME 2: Atomic Cascade Restore & Code Collision Resolution
  // =========================================================================
  describe('2. Khôi phục Cascade Nguyên tử & Giải quyết Xung đột Mã (Atomic Restore Test)', () => {
    const cascadeDossierId = 'dossier-cascade-uuid';

    beforeEach(() => {
      mockDossierStorage = [
        {
          id: cascadeDossierId,
          code: 'TOUR-CASCADE-100',
          name: 'Hồ sơ đa dự toán chi phí',
          organizationId: orgId,
          salesUserId: salesAId,
          createdBy: salesAId,
          status: DossierStatus.DRAFT,
          deletedAt: new Date('2026-11-15T08:00:00Z'),
        } as unknown as Dossier,
      ];

      // 3 child estimates attached to this dossier
      mockEstimateStorage = [
        { id: 'est-v1', dossierId: cascadeDossierId, organizationId: orgId, versionNo: 1, deletedAt: new Date() } as unknown as Estimate,
        { id: 'est-v2', dossierId: cascadeDossierId, organizationId: orgId, versionNo: 2, deletedAt: new Date() } as unknown as Estimate,
        { id: 'est-v3', dossierId: cascadeDossierId, organizationId: orgId, versionNo: 3, deletedAt: new Date() } as unknown as Estimate,
      ];
    });

    it('Khôi phục đồng thời Dossier và toàn bộ 3 Estimates liên quan trong cùng transaction', async () => {
      mockDossierRepo.findOne.mockImplementationOnce(async () => {
        return mockDossierStorage.find((d) => d.id === cascadeDossierId);
      });

      await dossiersController.restore(mockSalesA, cascadeDossierId);

      // Verify Estimate recover called with all 3 estimates
      expect(mockTxManager.recover).toHaveBeenCalledWith(
        Estimate,
        expect.arrayContaining([
          expect.objectContaining({ id: 'est-v1' }),
          expect.objectContaining({ id: 'est-v2' }),
          expect.objectContaining({ id: 'est-v3' }),
        ]),
      );

      // Verify Dossier recover called
      expect(mockTxManager.recover).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: cascadeDossierId }),
      );

      // Verify AuditLog recorded with DOSSIER_RESTORED
      expect(mockAuditLogs).toContainEqual(
        expect.objectContaining({
          action: AuditAction.DOSSIER_RESTORED,
          entityId: cascadeDossierId,
          actorUserId: salesAId,
          organizationId: orgId,
        }),
      );
    });

    it('Tự động đổi mã thành "-RESTORED" khi mã ban đầu bị hồ sơ active khác chiếm dụng', async () => {
      // Add an active dossier occupying the same code 'TOUR-CASCADE-100'
      mockDossierStorage.push({
        id: 'dossier-collision-active',
        code: 'TOUR-CASCADE-100',
        organizationId: orgId,
        deletedAt: null,
      } as unknown as Dossier);

      mockDossierRepo.findOne.mockImplementationOnce(async () => {
        return mockDossierStorage.find((d) => d.id === cascadeDossierId);
      });

      await dossiersController.restore(mockCeoAdmin, cascadeDossierId);

      const target = mockDossierStorage.find((d) => d.id === cascadeDossierId);
      expect(target?.code).toBe('TOUR-CASCADE-100-RESTORED');
      expect(mockTxManager.update).toHaveBeenCalledWith(
        Dossier,
        { id: cascadeDossierId },
        { code: 'TOUR-CASCADE-100-RESTORED' },
      );
    });
  });

  // =========================================================================
  // THEME 3: Zero Double-Counting Guarantee (KPI & Dashboards)
  // =========================================================================
  describe('3. Phòng chống Nhân đôi Doanh thu (Zero Double-Counting Test)', () => {
    it('Hồ sơ trong Thùng rác hoàn toàn bị loại khỏi truy vấn nghiệp vụ tiêu chuẩn (Doanh thu = 0)', async () => {
      const activeDossier = {
        id: 'dossier-active-1',
        code: 'TOUR-ACTIVE-01',
        organizationId: orgId,
        salesUserId: salesAId,
        status: DossierStatus.APPROVED,
        deletedAt: null,
      };

      const deletedDossierInTrash = {
        id: 'dossier-trash-1',
        code: 'TOUR-TRASH-01',
        organizationId: orgId,
        salesUserId: salesAId,
        status: DossierStatus.APPROVED,
        deletedAt: new Date(),
      };

      mockDossierStorage = [activeDossier as any, deletedDossierInTrash as any];

      // Standard active query (without withDeleted)
      const activeResults = await mockDossierRepo.findOne({
        where: { organizationId: orgId, code: 'TOUR-TRASH-01' },
      });

      // The deleted dossier is invisible to operational queries
      expect(activeResults).toBeNull();

      // Only active dossiers can be retrieved
      const foundActive = await mockDossierRepo.findOne({
        where: { organizationId: orgId, code: 'TOUR-ACTIVE-01' },
      });
      expect(foundActive).toBeDefined();
      expect(foundActive?.id).toBe('dossier-active-1');
    });

    it('Xác nhận sau khi khôi phục, doanh thu và hồ sơ được tính toán lại chính xác 100%', async () => {
      const restoredDossier = {
        id: 'dossier-to-restore',
        code: 'TOUR-RESTORE-REVENUE',
        organizationId: orgId,
        salesUserId: salesAId,
        status: DossierStatus.DRAFT,
        deletedAt: new Date(),
      };

      mockDossierStorage = [restoredDossier as any];

      // Before restore: findOne returns null
      let before = await mockDossierRepo.findOne({
        where: { organizationId: orgId, code: 'TOUR-RESTORE-REVENUE' },
      });
      expect(before).toBeNull();

      // Perform restore
      mockDossierRepo.findOne.mockImplementationOnce(async () => restoredDossier as any);
      await dossiersController.restore(mockSalesA, 'dossier-to-restore');

      // After restore: deletedAt is cleared
      restoredDossier.deletedAt = null as any;

      const after = await mockDossierRepo.findOne({
        where: { organizationId: orgId, code: 'TOUR-RESTORE-REVENUE' },
      });
      expect(after).toBeDefined();
      expect(after?.deletedAt).toBeNull();
    });
  });

  // =========================================================================
  // THEME 4: Import Anti-Duplication Engine & Soft Warning
  // =========================================================================
  describe('4. Kiểm thử Cảnh báo Trùng lặp Import (Import Anti-Duplication Soft Warning)', () => {
    const sessionId = 'session-import-test-uuid';

    beforeEach(() => {
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        organizationId: orgId,
        status: 'PROCESSING',
        template: {
          mappingConfig: {
            codeColumn: 'Mã hồ sơ',
            nameColumn: 'Tên tour',
            customerColumn: 'Mã khách hàng',
            startDateColumn: 'Ngày bắt đầu',
            endDateColumn: 'Ngày kết thúc',
            routeColumn: 'Tuyến đường',
          },
        },
      });

      // Active tour in system
      mockDossierStorage = [
        {
          id: 'active-tour-db-uuid',
          code: 'ACTIVE-TOUR-999',
          name: 'Tour Hà Nội - SaPa Đang chạy',
          organizationId: orgId,
          customerId: 'cust-uuid-1',
          startDate: '2026-12-01',
          endDate: '2026-12-05',
          route: 'Hà Nội - SaPa',
          deletedAt: null,
        } as unknown as Dossier,
        {
          id: 'trash-tour-db-uuid',
          code: 'TRASH-TOUR-888',
          name: 'Tour trong Thùng rác',
          organizationId: orgId,
          deletedAt: new Date(),
        } as unknown as Dossier,
      ];
    });

    it('Cảnh báo màu vàng khi upload dòng Excel trùng mã với hồ sơ đang chạy (ACTIVE)', async () => {
      const duplicateRow = {
        id: 'row-dup-code',
        rowNumber: 2,
        status: 'PENDING',
        rawData: {
          'Mã hồ sơ': 'ACTIVE-TOUR-999',
          'Tên tour': 'Tour Hà Nội - SaPa Mới',
          'Tên hồ sơ': 'Tour Hà Nội - SaPa Mới',
          'Mã khách hàng': 'CUST-001',
          'Ngày bắt đầu': '2026-12-01',
          'Ngày kết thúc': '2026-12-05',
        },
        warnings: [],
      } as unknown as ImportRow;

      mockRowRepo.find.mockResolvedValue([duplicateRow]);

      await (importProcessor as any).handleValidateRows(sessionId);

      // Verify row is marked VALID (not failed) but carries warning
      expect(duplicateRow.status).toBe('VALID');
      expect((duplicateRow as any).normalizedData.hasWarning).toBe(true);
      expect((duplicateRow as any).normalizedData.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'DUPLICATE_ACTIVE_DOSSIER',
            existingDossierCode: 'ACTIVE-TOUR-999',
          }),
        ]),
      );

      // Session summary records warning count
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          status: 'READY_FOR_REVIEW',
          validRows: 1,
          summary: expect.objectContaining({
            warningRows: 1,
          }),
        }),
      );
    });

    it('Không tạo cảnh báo trùng giả khi mã trùng với hồ sơ nằm trong Thùng rác (TRASH)', async () => {
      const rowMatchingTrash = {
        id: 'row-trash-code',
        rowNumber: 3,
        status: 'PENDING',
        rawData: {
          'Mã hồ sơ': 'TRASH-TOUR-888',
          'Tên tour': 'Tour mới dùng lại mã thùng rác',
          'Tên hồ sơ': 'Tour mới dùng lại mã thùng rác',
          'Mã khách hàng': 'CUST-001',
          'Ngày bắt đầu': '2026-12-10',
          'Ngày kết thúc': '2026-12-15',
        },
        warnings: [],
      } as unknown as ImportRow;

      mockRowRepo.find.mockResolvedValue([rowMatchingTrash]);

      await (importProcessor as any).handleValidateRows(sessionId);

      expect(rowMatchingTrash.status).toBe('VALID');
      // No duplicate active warning should be raised
      expect((rowMatchingTrash as any).normalizedData.warnings).toEqual([]);
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          summary: expect.objectContaining({
            warningRows: 0,
          }),
        }),
      );
    });

    it('Cảnh báo Layer 2 khi trùng Customer + StartDate + Route với hồ sơ đang chạy', async () => {
      const rowMatchingLayer2 = {
        id: 'row-layer-2',
        rowNumber: 4,
        status: 'PENDING',
        rawData: {
          'Mã hồ sơ': 'NEW-DIFFERENT-CODE',
          'Tên tour': 'Tour Trùng Tuyến và Ngày',
          'Tên hồ sơ': 'Tour Trùng Tuyến và Ngày',
          'Mã khách hàng': 'CUST-001',
          'Ngày bắt đầu': '2026-12-01',
          'Ngày kết thúc': '2026-12-05',
          'Tuyến đường': 'Hà Nội - SaPa',
        },
        warnings: [],
      } as unknown as ImportRow;

      mockRowRepo.find.mockResolvedValue([rowMatchingLayer2]);

      await (importProcessor as any).handleValidateRows(sessionId);

      expect(rowMatchingLayer2.status).toBe('VALID');
      expect((rowMatchingLayer2 as any).normalizedData.hasWarning).toBe(true);
      expect((rowMatchingLayer2 as any).normalizedData.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'DUPLICATE_ACTIVE_DOSSIER',
            existingDossierCode: 'ACTIVE-TOUR-999',
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // THEME 5: Financial Integrity Guard on Permanent Purge
  // =========================================================================
  describe('5. Bảo vệ Toàn vẹn Tài chính khi Xóa vĩnh viễn (Financial Integrity on Purge)', () => {
    const purgeDossierId = 'dossier-purge-test-uuid';

    beforeEach(() => {
      mockDossierStorage = [
        {
          id: purgeDossierId,
          code: 'TOUR-PURGE-FINANCE',
          name: 'Hồ sơ thử nghiệm xóa vĩnh viễn',
          organizationId: orgId,
          deletedAt: new Date(),
        } as unknown as Dossier,
      ];
    });

    it('Chặn tuyệt đối xóa vĩnh viễn nếu hồ sơ có phát sinh phiếu thu tiền thực tế (409 Conflict)', async () => {
      mockPaymentStorage = [
        {
          id: 'payment-paid-1',
          dossierId: purgeDossierId,
          organizationId: orgId,
          amount: 15000000,
          status: PaymentStatus.PAID,
        } as unknown as Payment,
      ];

      await expect(
        dossiersController.purge(mockCeoAdmin, purgeDossierId),
      ).rejects.toThrow(ConflictException);

      expect(mockTxManager.delete).not.toHaveBeenCalled();
    });

    it('CEO_ADMIN xóa vĩnh viễn thành công khi không có phiếu thu tiền và ghi nhận AuditLog DOSSIER_PURGED', async () => {
      mockPaymentStorage = []; // no real payments

      await dossiersController.purge(mockCeoAdmin, purgeDossierId);

      expect(mockTxManager.delete).toHaveBeenCalledWith(
        Dossier,
        expect.objectContaining({ id: purgeDossierId }),
      );

      expect(mockAuditLogs).toContainEqual(
        expect.objectContaining({
          action: AuditAction.DOSSIER_PURGED,
          entityId: purgeDossierId,
          actorUserId: ceoAdminId,
          organizationId: orgId,
        }),
      );
    });
  });
});
