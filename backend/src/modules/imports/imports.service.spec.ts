import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { ImportSessionStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CUSTOMER_BUDGET_FORMAT } from './customer-budget.parser';

describe('ImportsService', () => {
  let service: ImportsService;
  let sessionRepository: any;
  let rowRepository: any;
  let errorRepository: any;
  let templateRepository: any;
  let dossierRepository: any;
  let queue: any;
  let dataSource: any;

  beforeEach(async () => {
    sessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    rowRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    errorRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    templateRepository = {
      findOne: jest.fn(),
    };

    dossierRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    queue = {
      add: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((cb) => {
        const mockManager = {
          find: jest.fn().mockResolvedValue([]),
          save: jest
            .fn()
            .mockImplementation((entityClass, data) => Promise.resolve(data)),
        };
        return cb(mockManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        {
          provide: getRepositoryToken(ImportSession),
          useValue: sessionRepository,
        },
        {
          provide: getRepositoryToken(ImportRow),
          useValue: rowRepository,
        },
        {
          provide: getRepositoryToken(ImportError),
          useValue: errorRepository,
        },
        {
          provide: getRepositoryToken(ImportTemplate),
          useValue: templateRepository,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: dossierRepository,
        },
        {
          provide: getQueueToken('import-queue'),
          useValue: queue,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
  });

  describe('upload', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(
        service.upload('org-id', 'user-id', null, {
          templateType: 'ESTIMATE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if templateId is provided but not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);
      await expect(
        service.upload(
          'org-id',
          'user-id',
          { originalname: 'file.xlsx', size: 100, buffer: Buffer.from('') },
          {
            templateType: 'ESTIMATE',
            templateId: 'cb5a125a-45c1-4df2-a9b0-13f56b3e34b9',
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return session if found', async () => {
      const mockSession = { id: 'session-id', organizationId: 'org-id' };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const result = await service.findOne('org-id', 'session-id');
      expect(result).toEqual(mockSession);
      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'session-id', organizationId: 'org-id' },
        relations: { template: true, uploader: true },
      });
    });

    it('should throw NotFoundException if session is not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('org-id', 'session-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('preview', () => {
    it('should return paginated preview rows', async () => {
      const mockSession = { id: 'session-id', organizationId: 'org-id' };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [{ id: 'row-1', sessionId: 'session-id' }];
      rowRepository.findAndCount.mockResolvedValue([mockRows, 1]);

      const result = await service.preview('org-id', 'session-id', {
        page: 1,
        limit: 10,
        status: 'VALID',
      });

      expect(result).toEqual({
        data: mockRows,
        meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });
      expect(rowRepository.findAndCount).toHaveBeenCalledWith({
        where: { sessionId: 'session-id', status: 'VALID' },
        order: { rowNumber: 'ASC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('errors', () => {
    it('should return paginated errors', async () => {
      const mockSession = { id: 'session-id', organizationId: 'org-id' };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockErrors = [{ id: 'err-1', sessionId: 'session-id' }];
      errorRepository.findAndCount.mockResolvedValue([mockErrors, 1]);

      const result = await service.errors('org-id', 'session-id', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        data: mockErrors,
        meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      });
    });
  });

  describe('updateRowStaging', () => {
    it('should update row raw data and trigger re-validation', async () => {
      const mockSession = { id: 'session-id', organizationId: 'org-id' };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRow = {
        id: 'row-id',
        sessionId: 'session-id',
        rawData: {},
        status: 'ERROR',
      };
      rowRepository.findOne.mockResolvedValue(mockRow);
      rowRepository.save.mockResolvedValue(mockRow);

      const result = await service.updateRowStaging(
        'org-id',
        'session-id',
        'row-id',
        {
          rawData: { name: 'Fixed Name' },
        },
      );

      expect(result.rawData).toEqual({ name: 'Fixed Name' });
      expect(result.status).toBe('PENDING');
      expect(queue.add).toHaveBeenCalledWith('validate-rows', {
        sessionId: 'session-id',
      });
    });
  });

  describe('confirm', () => {
    it('should throw BadRequestException if session has error rows', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 5,
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      await expect(service.confirm('org-id', 'session-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should migrate valid rows to Dossier table inside transaction', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);

      const mockRows = [
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: { code: 'D-001', name: 'Dossier 1' },
        },
      ];
      rowRepository.find.mockResolvedValue(mockRows);
      dossierRepository.create.mockImplementation((data) => data);

      const result = await service.confirm('org-id', 'session-id');

      expect(result).toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(dossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: expect.stringMatching(/^\d{6}-DOSSIER-1$/),
          createdBy: 'user-id',
          salesUserId: 'user-id',
        }),
      );
    });

    it('should store imported classification names when master data is unavailable', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      rowRepository.find.mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: {
            code: 'D-001',
            name: 'Dossier 1',
            businessLineCode: 'MISSING_LINE',
            businessLineName: 'VÉ LẺ',
            marketTypeCode: 'MISSING_TYPE',
            marketTypeName: 'INBOUND',
          },
        },
      ]);

      const transactionManager = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation((_entity, data) => data),
      };
      dataSource.transaction.mockImplementationOnce((callback: any) =>
        callback(transactionManager),
      );

      await expect(service.confirm('org-id', 'session-id')).resolves.toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
      expect(dossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          businessLineName: 'VÉ LẺ',
          marketTypeName: 'INBOUND',
        }),
      );
      expect(dossierRepository.create.mock.calls[0][0]).not.toHaveProperty(
        'businessLineId',
      );
      expect(dossierRepository.create.mock.calls[0][0]).not.toHaveProperty(
        'marketTypeId',
      );
      expect(transactionManager.save).toHaveBeenCalled();
    });

    it('should snapshot the imported customer name without renaming the shared customer', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      rowRepository.find.mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: {
            code: 'D-001',
            name: 'Dossier 1',
            customerId: 'customer-1',
            customerName: 'Nguyễn Văn D',
            phone: '0900000000',
          },
        },
      ]);
      dossierRepository.create.mockImplementation((data) => data);

      const transactionManager = {
        update: jest.fn(),
        save: jest.fn().mockImplementation((_entity, data) => data),
      };
      dataSource.transaction.mockImplementationOnce((callback: any) =>
        callback(transactionManager),
      );

      await expect(service.confirm('org-id', 'session-id')).resolves.toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
      expect(dossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerName: 'Nguyễn Văn D' }),
      );
      expect(transactionManager.update).toHaveBeenCalledWith(
        expect.anything(),
        { id: 'customer-1', organizationId: 'org-id' },
        expect.not.objectContaining({ displayName: expect.anything() }),
      );
    });

    it('should create a new customer for each valid customer-budget dossier', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      rowRepository.find.mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: {
            code: 'D-001',
            name: 'Dossier 1',
            importFormat: CUSTOMER_BUDGET_FORMAT,
            customerName: 'Nguyễn Văn D',
            phone: '0900000000',
            email: 'nguyenvand@example.com',
          },
        },
      ]);
      dossierRepository.create.mockImplementation((data) => data);

      const transactionManager = {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((_entity, data) => ({ id: 'new-customer', ...data })),
        save: jest.fn().mockImplementation((_entity, data) => data),
        update: jest.fn(),
      };
      dataSource.transaction.mockImplementationOnce((callback: any) =>
        callback(transactionManager),
      );

      await expect(service.confirm('org-id', 'session-id')).resolves.toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
      expect(dossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'new-customer',
          customerName: 'Nguyễn Văn D',
        }),
      );
    });

    it('should reuse a customer when imported phone or email matches', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      rowRepository.find.mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: {
            code: 'D-002',
            name: 'Dossier 2',
            importFormat: CUSTOMER_BUDGET_FORMAT,
            customerName: 'Nguyễn Văn Hùng',
            phone: '097 423 1563',
            email: 'CUSTOMER@EXAMPLE.COM',
          },
        },
      ]);
      dossierRepository.create.mockImplementation((data) => data);

      const transactionManager = {
        find: jest.fn().mockResolvedValue([
          {
            id: 'existing-customer',
            organizationId: 'org-id',
            phone: '0974231563',
            email: 'customer@example.com',
          },
        ]),
        create: jest.fn(),
        save: jest.fn().mockImplementation((_entity, data) => data),
        update: jest.fn(),
      };
      dataSource.transaction.mockImplementationOnce((callback: any) =>
        callback(transactionManager),
      );

      await expect(service.confirm('org-id', 'session-id')).resolves.toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });

      expect(dossierRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'existing-customer' }),
      );
    });

    it('should create suppliers and supplier types from imported cost lines', async () => {
      const mockSession = {
        id: 'session-id',
        organizationId: 'org-id',
        errorRows: 0,
        uploadedBy: 'user-id',
        fileName: 'budget.xlsx',
      };
      sessionRepository.findOne.mockResolvedValue(mockSession);
      rowRepository.find.mockResolvedValue([
        {
          id: 'row-1',
          sessionId: 'session-id',
          status: 'VALID',
          normalizedData: {
            code: 'D-001',
            name: 'Dossier 1',
            importFormat: CUSTOMER_BUDGET_FORMAT,
            customerName: 'Nguyễn Văn D',
            costLines: [
              {
                description: 'Vé Hội An',
                categoryName: 'VÉ THAM QUAN',
                supplierName: 'Công ty Vé Hội An',
                serviceCategoryCode: 'ENTRANCE_FEE',
                quantity: 2,
                multiplier: 1,
                unitPrice: 100000,
                vatRate: 10,
                sourceAmount: 200000,
                sortOrder: 0,
              },
            ],
          },
        },
      ]);
      dossierRepository.create.mockImplementation((data) => data);

      const transactionManager = {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((_entity, data) => data),
        save: jest.fn().mockImplementation((entity, data) => {
          const idByEntity = new Map([
            ['Customer', 'customer-id'],
            ['Dossier', 'dossier-id'],
            ['SupplierType', 'supplier-type-id'],
            ['Supplier', 'supplier-id'],
            ['Estimate', 'estimate-id'],
          ]);
          const entityName = entity?.name || 'Entity';
          return Promise.resolve({
            id: idByEntity.get(entityName) || `${entityName.toLowerCase()}-id`,
            ...data,
          });
        }),
        update: jest.fn(),
      };
      dataSource.transaction.mockImplementationOnce((callback: any) =>
        callback(transactionManager),
      );

      await expect(service.confirm('org-id', 'session-id')).resolves.toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });

      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'VÉ THAM QUAN' }),
      );
      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Công ty Vé Hội An',
          supplierTypeId: 'supplier-type-id',
        }),
      );
      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          supplierId: 'supplier-id',
          categoryTitle: 'VÉ THAM QUAN',
        }),
      );
    });
  });
});
