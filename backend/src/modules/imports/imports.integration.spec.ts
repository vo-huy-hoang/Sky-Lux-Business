import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { getQueueToken } from '@nestjs/bullmq';

describe('Imports Module (Integration)', () => {
  let controller: ImportsController;
  let sessionRepository: jest.Mocked<Repository<ImportSession>>;
  let rowRepository: jest.Mocked<Repository<ImportRow>>;
  let errorRepository: jest.Mocked<Repository<ImportError>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

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
        controller.confirm(orgA, 'session-error-uuid'),
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

      const result = await controller.confirm(orgA, 'session-valid-uuid');

      expect(result).toEqual({
        message: 'Nhập dữ liệu thành công',
        importedRowsCount: 1,
      });
    });
  });
});
