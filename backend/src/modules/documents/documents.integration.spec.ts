import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { StorageService } from '../../shared/storage/storage.service';
import { RedisService } from '../../common/redis/redis.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DataSource } from 'typeorm';

describe('Documents Module (Integration)', () => {
  let controller: DocumentsController;
  let documentRepository: jest.Mocked<Repository<Document>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgA = {
    id: 'user-A-uuid',
    organizationId: orgA,
    employeeCode: 'EMP-A',
    fullName: 'User Org A',
    email: 'usera@skylux.vn',
    permissions: ['dossier.view.all', 'dossier.update', 'document.view'],
    roles: [],
  } as CurrentUserPayload;

  const mockDocOrgB = {
    id: 'doc-B-uuid',
    organizationId: orgB,
    originalName: 'secret-doc.pdf',
    objectKey: 'org-B/secret-doc.pdf',
    fileSize: 2048,
    versionNo: 1,
  } as unknown as Document;

  const mockDocRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockDocTypeRepo = {
    findOne: jest.fn(),
  };

  const mockDocVerRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  const mockDossierRepo = {
    findOne: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: mockDocRepo,
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: mockDocTypeRepo,
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: mockDocVerRepo,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepo,
        },
        {
          provide: getRepositoryToken(Estimate),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delByPattern: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation((cb) => cb({ save: jest.fn() })),
          },
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    documentRepository = module.get(getRepositoryToken(Document));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-tenancy isolation for Documents', () => {
    it('User from Org A CANNOT access documents belonging to Org B (Returns 404)', async () => {
      documentRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'doc-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDocOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgA, 'doc-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('User from Org A CANNOT get download url for documents of Org B (Returns 404)', async () => {
      documentRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'doc-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDocOrgB);
      });

      await expect(
        controller.getDownloadUrl(mockUserOrgA, 'doc-B-uuid', {
          expiresIn: 3600,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('User from Org A CANNOT delete documents of Org B (Returns 404)', async () => {
      documentRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'doc-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDocOrgB);
      });

      await expect(
        controller.remove(mockUserOrgA, 'doc-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
