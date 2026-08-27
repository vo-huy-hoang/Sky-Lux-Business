import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('DossiersController', () => {
  let controller: DossiersController;
  let service: DossiersService;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['dossier.view.all', 'dossier.create', 'dossier.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockDossiersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findComments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossiersController],
      providers: [
        {
          provide: DossiersService,
          useValue: mockDossiersService,
        },
      ],
    }).compile();

    controller = module.get<DossiersController>(DossiersController);
    service = module.get<DossiersService>(DossiersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should throw ForbiddenException if user lacks view permission', () => {
      const badUser = { permissions: [], roles: [] } as any;
      const queryDto = new QueryDossierDto();

      expect(() => controller.findAll(badUser, queryDto)).toThrow(
        ForbiddenException,
      );
    });

    it('should call service.findAll and return pagination response', async () => {
      const queryDto = new QueryDossierDto();
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockDossiersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserPayload, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(mockUserPayload, queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single dossier details by ID', async () => {
      const mockDossier = { id: 'dossier-uuid', name: 'VIP Tour' };
      mockDossiersService.findOne.mockResolvedValue(mockDossier);

      const result = await controller.findOne(mockUserPayload, 'dossier-uuid');

      expect(service.findOne).toHaveBeenCalledWith(
        mockUserPayload,
        'dossier-uuid',
      );
      expect(result).toEqual(mockDossier);
    });
  });

  describe('create', () => {
    it('should call service.create and return the new dossier', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'New Dossier',
        customerId: 'cust-uuid',
      };
      const mockDossier = { id: 'dossier-uuid', ...createDto };
      mockDossiersService.create.mockResolvedValue(mockDossier);

      const result = await controller.create(mockUserPayload, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserPayload, createDto);
      expect(result).toEqual(mockDossier);
    });
  });

  describe('update', () => {
    it('should call service.update and return updated dossier', async () => {
      const updateDto: UpdateDossierDto = { name: 'Updated Name' };
      const mockDossier = { id: 'dossier-uuid', name: 'Updated Name' };
      mockDossiersService.update.mockResolvedValue(mockDossier);

      const result = await controller.update(
        mockUserPayload,
        'dossier-uuid',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUserPayload,
        'dossier-uuid',
        updateDto,
      );
      expect(result).toEqual(mockDossier);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockDossiersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUserPayload, 'dossier-uuid');

      expect(service.remove).toHaveBeenCalledWith(
        mockUserPayload,
        'dossier-uuid',
      );
    });
  });

  describe('findComments (API-COMMENT-001)', () => {
    it('should call service.findComments and return comments', async () => {
      const mockComments = { data: [{ id: 'comm-1', content: 'Test' }] };
      mockDossiersService.findComments.mockResolvedValue(mockComments);

      const result = await controller.findComments(
        mockUserPayload,
        'dossier-uuid',
      );

      expect(service.findComments).toHaveBeenCalledWith(
        mockUserPayload,
        'dossier-uuid',
      );
      expect(result).toEqual(mockComments);
    });
  });
});
