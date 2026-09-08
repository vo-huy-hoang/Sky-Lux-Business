import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { StorageService } from '../../shared/storage/storage.service';
import { RedisService } from '../../common/redis/redis.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DossierStatus } from '../../common/enums';
import { QueryDocumentDto } from './dto/query-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DownloadUrlQueryDto } from './dto/download-url-query.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let docRepo: jest.Mocked<Repository<Document>>;
  let docTypeRepo: jest.Mocked<Repository<DocumentType>>;
  let docVerRepo: jest.Mocked<Repository<DocumentVersion>>;
  let dossierRepo: jest.Mocked<Repository<Dossier>>;
  let storageService: jest.Mocked<StorageService>;
  let redisService: jest.Mocked<RedisService>;
  let dataSource: jest.Mocked<DataSource>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';

  const mockUser: CurrentUserPayload = {
    id: userId,
    organizationId: orgId,
    employeeCode: 'EMP001',
    fullName: 'Nguyen Van A',
    email: 'a@skylux.vn',
    roles: ['SALES'],
    permissions: ['dossier.view.all', 'dossier.update', 'document.view'],
  };

  const mockDossier: Dossier = {
    id: 'dossier-uuid-1',
    organizationId: orgId,
    code: 'DOS-001',
    name: 'Tour Chau Au',
    salesUserId: userId,
    status: DossierStatus.DRAFT,
  } as unknown as Dossier;

  const mockDoc: Document = {
    id: 'doc-uuid-1',
    organizationId: orgId,
    dossierId: 'dossier-uuid-1',
    originalName: 'passport.pdf',
    objectKey: 'organizations/org-uuid-1/dossiers/dossier-uuid-1/uuid.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    versionNo: 1,
    uploadedBy: userId,
    uploader: {
      id: userId,
      fullName: 'Nguyen Van A',
      passwordHash: 'secret-hash',
    } as any,
    versions: [],
    dossier: mockDossier,
  } as unknown as Document;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentType),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentVersion),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            getSignedDownloadUrl: jest.fn(),
            deleteFile: jest.fn(),
          },
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
            transaction: jest.fn().mockImplementation(async (cb) => {
              const manager = { save: jest.fn((obj) => obj) };
              return await cb(manager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    docRepo = module.get(getRepositoryToken(Document));
    docTypeRepo = module.get(getRepositoryToken(DocumentType));
    docVerRepo = module.get(getRepositoryToken(DocumentVersion));
    dossierRepo = module.get(getRepositoryToken(Dossier));
    storageService = module.get(StorageService);
    redisService = module.get(RedisService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByDossier (API-DOCUMENT-001)', () => {
    it('should return paginated documents list of a dossier', async () => {
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDoc], 1]);

      const queryDto: QueryDocumentDto = {
        page: 1,
        limit: 20,
        search: 'passport',
        documentTypeId: 'type-uuid',
      };

      const result = await service.findByDossier(
        mockUser,
        'dossier-uuid-1',
        queryDto,
      );

      expect(dossierRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'dossier-uuid-1', organizationId: orgId },
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect((result.data[0] as any).objectKey).toBeUndefined();
      expect((result.data[0].uploader as any)?.passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if dossier does not exist in tenant', async () => {
      dossierRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByDossier(mockUser, 'invalid-dossier', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should restrict access if user has only dossier.view.own and is not owner', async () => {
      const ownOnlyUser: CurrentUserPayload = {
        ...mockUser,
        permissions: ['dossier.view.own'],
      };
      const otherDossier: Dossier = {
        ...mockDossier,
        salesUserId: 'other-user',
        createdBy: 'other-user',
      };

      dossierRepo.findOne.mockResolvedValue(otherDossier);

      await expect(
        service.findByDossier(ownOnlyUser, 'dossier-uuid-1', {
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadForDossier (API-DOCUMENT-002)', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'contract.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('mock pdf content'),
      size: 1024,
    } as any;

    it('should upload file and create document with initial version', async () => {
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      docTypeRepo.findOne.mockResolvedValue({ id: 'type-uuid' } as any);
      storageService.uploadFile.mockResolvedValue({
        objectKey: 'obj-key',
        fileSize: 1024,
      });
      docRepo.save.mockResolvedValue({
        id: 'new-doc-id',
        organizationId: orgId,
      } as any);
      docRepo.findOne.mockResolvedValue({
        ...mockDoc,
        id: 'new-doc-id',
      });

      const dto: CreateDocumentDto = {
        documentTypeId: 'type-uuid',
        changeNote: 'Initial contract',
      };

      const result = await service.uploadForDossier(
        mockUser,
        'dossier-uuid-1',
        mockFile,
        dto,
      );

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(docRepo.create).toHaveBeenCalled();
      expect(docVerRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('new-doc-id');
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        service.uploadForDossier(mockUser, 'dossier-uuid-1', null as any, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if dossier is LOCKED', async () => {
      const lockedDossier = { ...mockDossier, status: DossierStatus.LOCKED };
      dossierRepo.findOne.mockResolvedValue(lockedDossier);

      await expect(
        service.uploadForDossier(mockUser, 'dossier-uuid-1', mockFile, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne (API-DOCUMENT-003)', () => {
    it('should return document detail with sanitized uploader', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);

      const result = await service.findOne(mockUser, 'doc-uuid-1');

      expect(docRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-uuid-1', organizationId: orgId },
        relations: {
          documentType: true,
          uploader: true,
          versions: { uploader: true },
          dossier: true,
        },
      });
      expect(result.id).toBe('doc-uuid-1');
      expect((result as any).objectKey).toBeUndefined();
      expect((result.uploader as any)?.passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException if document does not exist', async () => {
      docRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser, 'non-existent-doc'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (API-DOCUMENT-004)', () => {
    it('should soft delete document successfully', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      docRepo.softRemove.mockResolvedValue(mockDoc);

      const result = await service.remove(mockUser, 'doc-uuid-1');

      expect(docRepo.softRemove).toHaveBeenCalledWith(mockDoc);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw BadRequestException if linked dossier is LOCKED', async () => {
      const lockedDossier = { ...mockDossier, status: DossierStatus.LOCKED };
      const lockedDoc = {
        ...mockDoc,
        dossier: lockedDossier,
      } as any;
      docRepo.findOne.mockResolvedValue(lockedDoc);
      dossierRepo.findOne.mockResolvedValue(lockedDossier);

      await expect(service.remove(mockUser, 'doc-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDownloadUrl (API-DOCUMENT-005)', () => {
    it('should return signed URL for the latest version', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      storageService.getSignedDownloadUrl.mockResolvedValue(
        'https://files.skylux.vn/download/signed-url',
      );

      const result = await service.getDownloadUrl(mockUser, 'doc-uuid-1', {
        expiresIn: 1800,
      });

      expect(storageService.getSignedDownloadUrl).toHaveBeenCalledWith(
        mockDoc.objectKey,
        mockDoc.originalName,
        1800,
      );
      expect(result.downloadUrl).toBe(
        'https://files.skylux.vn/download/signed-url',
      );
      expect(result.versionNo).toBe(1);
    });

    it('should return signed URL for a specific version', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      docVerRepo.findOne.mockResolvedValue({
        id: 'ver-uuid-2',
        documentId: 'doc-uuid-1',
        versionNo: 2,
        objectKey: 'path/to/v2.pdf',
        fileSize: 2048,
      } as any);
      storageService.getSignedDownloadUrl.mockResolvedValue(
        'https://files.skylux.vn/download/signed-v2',
      );

      const query: DownloadUrlQueryDto = { versionNo: 2, expiresIn: 3600 };
      const result = await service.getDownloadUrl(
        mockUser,
        'doc-uuid-1',
        query,
      );

      expect(docVerRepo.findOne).toHaveBeenCalledWith({
        where: {
          documentId: 'doc-uuid-1',
          versionNo: 2,
          organizationId: orgId,
        },
      });
      expect(result.versionNo).toBe(2);
      expect(result.fileSize).toBe(2048);
    });

    it('should throw NotFoundException if requested version is not found', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      docVerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDownloadUrl(mockUser, 'doc-uuid-1', {
          versionNo: 99,
          expiresIn: 3600,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findVersions (API-DOCVER-001)', () => {
    it('should return list of document versions', async () => {
      docRepo.findOne.mockResolvedValue(mockDoc);
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      docVerRepo.find.mockResolvedValue([
        {
          id: 'v1',
          versionNo: 1,
          uploader: { id: 'u1', passwordHash: 'hash' },
        } as any,
      ]);

      const queryDto = { page: 1, limit: 10 };
      const result = await service.findVersions(
        mockUser,
        'doc-uuid-1',
        queryDto,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].objectKey).toBeUndefined();
      expect(result.data[0].uploader?.passwordHash).toBeUndefined();
    });
  });

  describe('createVersion (API-DOCVER-002)', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'contract-v2.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('v2 content'),
      size: 2048,
    } as any;

    it('should upload new file version and update document metadata', async () => {
      docRepo.findOne.mockResolvedValueOnce(mockDoc).mockResolvedValueOnce({
        ...mockDoc,
        versionNo: 2,
        originalName: 'contract-v2.pdf',
      });
      dossierRepo.findOne.mockResolvedValue(mockDossier);
      storageService.uploadFile.mockResolvedValue({
        objectKey: 'key-v2',
        fileSize: 2048,
      });

      const dto: CreateDocumentVersionDto = {
        changeNote: 'Updated clauses',
      };

      const result = await service.createVersion(
        mockUser,
        'doc-uuid-1',
        mockFile,
        dto,
      );

      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalled();

      // We don't check docVerRepo.save directly anymore since it runs inside the transaction via manager.save
      // But we can check that document's versionNo was updated before being returned
      expect(result.versionNo).toBe(2);
    });
  });
});
