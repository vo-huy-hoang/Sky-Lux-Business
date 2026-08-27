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
        items: mockRows,
        total: 1,
        page: 1,
        limit: 10,
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
        items: mockErrors,
        total: 1,
        page: 1,
        limit: 10,
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
    });
  });
});
