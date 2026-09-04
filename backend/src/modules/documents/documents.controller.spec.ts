import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DownloadUrlQueryDto } from './dto/download-url-query.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import { PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  const mockUserPayload: CurrentUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    employeeCode: 'EMP001',
    fullName: 'Nguyen Van A',
    email: 'a@skylux.vn',
    permissions: [
      'dossier.view.all',
      'dossier.update',
      'document.view',
      'document.manage',
    ],
    roles: [],
  };

  const mockDocumentsService = {
    findOne: jest.fn(),
    remove: jest.fn(),
    getDownloadUrl: jest.fn(),
    findVersions: jest.fn(),
    createVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne (API-DOCUMENT-003)', () => {
    it('should require document.view permission', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne)).toEqual([
        'document.view',
      ]);
    });

    it('should return document detail by ID', async () => {
      const mockResult = { id: 'doc-uuid', originalName: 'passport.pdf' };
      mockDocumentsService.findOne.mockResolvedValue(mockResult);

      const result = await controller.findOne(mockUserPayload, 'doc-uuid');

      expect(service.findOne).toHaveBeenCalledWith(mockUserPayload, 'doc-uuid');
      expect(result).toEqual(mockResult);
    });
  });

  describe('remove (API-DOCUMENT-004)', () => {
    it('should require document.manage permission', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.remove)).toEqual([
        'document.manage',
      ]);
    });

    it('should delete document and return success', async () => {
      mockDocumentsService.remove.mockResolvedValue({ deleted: true });

      const result = await controller.remove(mockUserPayload, 'doc-uuid');

      expect(service.remove).toHaveBeenCalledWith(mockUserPayload, 'doc-uuid');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getDownloadUrl (API-DOCUMENT-005)', () => {
    it('should require document.view permission', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.getDownloadUrl),
      ).toEqual(['document.view']);
    });

    it('should return download url for document', async () => {
      const mockResult = {
        downloadUrl: 'https://files.skylux.vn/path/doc.pdf',
        originalName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        versionNo: 1,
        expiresIn: 3600,
      };
      mockDocumentsService.getDownloadUrl.mockResolvedValue(mockResult);

      const query: DownloadUrlQueryDto = { expiresIn: 3600 };
      const result = await controller.getDownloadUrl(
        mockUserPayload,
        'doc-uuid',
        query,
      );

      expect(service.getDownloadUrl).toHaveBeenCalledWith(
        mockUserPayload,
        'doc-uuid',
        query,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('findVersions (API-DOCVER-001)', () => {
    it('should return document version list', async () => {
      const mockResult = { data: [{ id: 'ver-1', versionNo: 1 }], meta: { page: 1, pageSize: 10, total: 1 } };
      mockDocumentsService.findVersions.mockResolvedValue(mockResult);

      const queryDto = { page: 1, limit: 10 };
      const result = await controller.findVersions(
        mockUserPayload,
        'doc-uuid',
        queryDto as any
      );

      expect(service.findVersions).toHaveBeenCalledWith(
        mockUserPayload,
        'doc-uuid',
        queryDto
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('createVersion (API-DOCVER-002)', () => {
    it('should upload a new document version', async () => {
      const mockFile = { originalname: 'doc-v2.pdf' } as any;
      const mockDto: CreateDocumentVersionDto = { changeNote: 'Updated' };
      const mockResult = { id: 'doc-uuid', versionNo: 2 };
      mockDocumentsService.createVersion.mockResolvedValue(mockResult);

      const result = await controller.createVersion(
        mockUserPayload,
        'doc-uuid',
        mockFile,
        mockDto,
      );

      expect(service.createVersion).toHaveBeenCalledWith(
        mockUserPayload,
        'doc-uuid',
        mockFile,
        mockDto,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
