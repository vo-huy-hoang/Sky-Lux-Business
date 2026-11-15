import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { getQueueToken } from '@nestjs/bullmq';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('Imports Module (Integration)', () => {
  let controller: ImportsController;
  let sessionRepository: jest.Mocked<Repository<ImportSession>>;
  let rowRepository: jest.Mocked<Repository<ImportRow>>;
  let errorRepository: jest.Mocked<Repository<ImportError>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';
  const importActor = {
    id: 'user-uuid',
    organizationId: orgA,
    employeeCode: 'EMP-001',
    fullName: 'Import Operator',
    email: 'operator@example.com',
    roles: [],
    permissions: [],
  } satisfies CurrentUserPayload;

  const mockSessionOfOrgB = {
    id: 'session-B-uuid',
    organizationId: orgB,
    errorRows: 0,
    validRows: 1,
    status: 'READY_FOR_REVIEW',
  } as unknown as ImportSession;

  const mockSessionRepository = {
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  const mockRowRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
  };

  const mockErrorRepository = {
    findAndCount: jest.fn(),
  };

  const mockTemplateRepository = {
    findOne: jest.fn(),
  };

  const mockDossierRepository = {
    create: jest.fn((dto) => dto),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => {
      const mockManager = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((entityClass, data) => data || {}),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        save: jest
          .fn()
          .mockImplementation((entityClass, data) => Promise.resolve(data)),
      };
      return cb(mockManager);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        ImportsService,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: mockSessionRepository,
        },
        {
          provide: getRepositoryToken(ImportRow),
          useValue: mockRowRepository,
        },
        {
          provide: getRepositoryToken(ImportError),
          useValue: mockErrorRepository,
        },
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
        {
          provide: getQueueToken('import-queue'),
          useValue: mockQueue,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<ImportsController>(ImportsController);
    sessionRepository = module.get<Repository<ImportSession>>(
      getRepositoryToken(ImportSession),
    ) as jest.Mocked<Repository<ImportSession>>;
    rowRepository = module.get<Repository<ImportRow>>(
      getRepositoryToken(ImportRow),
    ) as jest.Mocked<Repository<ImportRow>>;
    errorRepository = module.get<Repository<ImportError>>(
      getRepositoryToken(ImportError),
    ) as jest.Mocked<Repository<ImportError>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ xem trạng thái phiên nhập của Doanh nghiệp B (Trả về 404)', async () => {
      sessionRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'session-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockSessionOfOrgB);
      });

      await expect(controller.findOne(orgA, 'session-B-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Doanh nghiệp A KHÔNG THỂ sửa dòng staging của Doanh nghiệp B (Trả về 404)', async () => {
      sessionRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'session-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockSessionOfOrgB);
      });

      await expect(
        controller.updateRowStaging(orgA, 'session-B-uuid', 'row-uuid', {
          rawData: { name: 'Hack Name' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Kiểm soát điều kiện Đồng bộ dữ liệu (Confirm validation)', () => {
    it('KHÔNG THỂ confirm phiên nhập nếu phiên có chứa dòng bị lỗi (errorRows > 0)', async () => {
      const mockSessionWithError = {
        id: 'session-error-uuid',
        organizationId: orgA,
        errorRows: 2,
        validRows: 3,
        status: 'READY_FOR_REVIEW',
      } as unknown as ImportSession;

      sessionRepository.findOne.mockResolvedValue(mockSessionWithError);

      await expect(
        controller.confirm(importActor, 'session-error-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('Đồng bộ thành công và di chuyển dữ liệu sang bảng Dossier nếu hợp lệ', async () => {
      const mockSessionValid = {
        id: 'session-valid-uuid',
        organizationId: orgA,
        errorRows: 0,
        validRows: 1,
        status: 'READY_FOR_REVIEW',
        uploadedBy: 'user-uuid',
      } as unknown as ImportSession;

      sessionRepository.findOne.mockResolvedValue(mockSessionValid);

      const mockRows = [
        {
          id: 'row-1',
          sessionId: 'session-valid-uuid',
          status: 'VALID',
          normalizedData: { code: 'D-001', name: 'Valid Dossier' },
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows as any);

      const result = await controller.confirm(
        importActor,
        'session-valid-uuid',
      );

      expect(result).toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
    });
  });

  describe('3. Tách Import Validate (Read-Only) khỏi Confirm Commit (Ticket 07)', () => {
    it('Staged new customer is created atomically within transaction only upon confirm', async () => {
      const mockSessionValid = {
        id: 'session-ticket07-uuid',
        organizationId: orgA,
        errorRows: 0,
        validRows: 1,
        status: 'READY_FOR_REVIEW',
        uploadedBy: 'user-uuid',
      } as unknown as ImportSession;

      sessionRepository.findOne.mockResolvedValue(mockSessionValid);

      const mockRows = [
        {
          id: 'row-t07',
          sessionId: 'session-ticket07-uuid',
          status: 'VALID',
          normalizedData: {
            code: 'TOUR-T07-001',
            name: 'Tour Ha Long Bay',
            customerCode: 'KH-STAGED-NEW',
            customerName: 'Khach Hang Moi T07',
            customerStatus: 'NEW_TO_BE_CREATED',
            phone: '0988776655',
            email: 'newt07@example.com',
          },
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows as any);

      const createdCustomer = { id: 'cust-t07-id', code: 'KH-STAGED-NEW' };
      const txManager = {
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((entityClass, data) => ({ id: 'cust-t07-id', ...data })),
        save: jest.fn().mockImplementation((entityClass, data) => {
          if (entityClass === Customer) return Promise.resolve(createdCustomer);
          return Promise.resolve(data);
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockDataSource.transaction.mockImplementationOnce((cb) => cb(txManager));

      const result = await controller.confirm(
        importActor,
        'session-ticket07-uuid',
      );

      expect(result.importedRowsCount).toBe(1);
      // Verify atomic customer creation in transaction
      expect(txManager.create).toHaveBeenCalledWith(
        Customer,
        expect.objectContaining({
          organizationId: orgA,
          code: 'KH-STAGED-NEW',
          displayName: 'Khach Hang Moi T07',
        }),
      );
      expect(txManager.save).toHaveBeenCalledWith(
        Customer,
        expect.objectContaining({ code: 'KH-STAGED-NEW' }),
      );
      // Verify dossier created with resolved customerId
      expect(mockDossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-t07-id',
        }),
      );
    });

    it('Zero pre-confirm master mutations: Staging row updates and validation do not write to master tables', async () => {
      const mockSession = {
        id: 'session-zero-mutations',
        organizationId: orgA,
        status: 'READY_FOR_REVIEW',
      } as unknown as ImportSession;

      sessionRepository.findOne.mockResolvedValue(mockSession);
      const mockRow = {
        id: 'row-zero',
        sessionId: 'session-zero-mutations',
        rawData: { 'Mã khách hàng': 'KH-BRAND-NEW', 'Tên khách hàng': 'Khách Mới' },
        status: 'READY_FOR_REVIEW',
      } as unknown as ImportRow;
      rowRepository.findOne.mockResolvedValue(mockRow);
      rowRepository.save.mockResolvedValue({ ...mockRow, status: 'PENDING' } as any);

      await controller.updateRowStaging(orgA, 'session-zero-mutations', 'row-zero', {
        rawData: { 'Mã khách hàng': 'KH-EDITED', 'Tên khách hàng': 'Khách Mới Sửa' },
      });

      // Verify that master database transaction was NEVER called during staging edit
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      // Verify row status set to PENDING and validation queued asynchronously without master mutations
      expect(mockQueue.add).toHaveBeenCalledWith('validate-rows', {
        sessionId: 'session-zero-mutations',
      });
    });
  });
});
