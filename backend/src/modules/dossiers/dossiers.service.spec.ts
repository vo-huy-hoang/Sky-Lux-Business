import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { DossiersService } from './dossiers.service';
import { Dossier } from './entities/dossier.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { DossierStatus } from '../../common/enums';

describe('DossiersService', () => {
  let service: DossiersService;
  let repository: jest.Mocked<Repository<Dossier>>;

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
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiersService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
      ],
    }).compile();

    service = module.get<DossiersService>(DossiersService);
    repository = module.get<Repository<Dossier>>(
      getRepositoryToken(Dossier),
    ) as jest.Mocked<Repository<Dossier>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of dossiers', async () => {
      const queryDto = new QueryDossierDto();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDossier], 1]);

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('dossier');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'dossier.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result).toEqual({
        items: [mockDossier],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter own dossiers if lacking view.all but having view.own', async () => {
      const ownOnlyUser = {
        id: 'user-uuid',
        organizationId: 'org-uuid',
        permissions: ['dossier.view.own'],
        roles: [],
      } as unknown as CurrentUserPayload;

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockDossier], 1]);

      await service.findAll(ownOnlyUser, new QueryDossierDto());

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(dossier.salesUserId = :userId OR dossier.createdBy = :userId)',
        { userId: 'user-uuid' },
      );
    });
  });

  describe('findOne', () => {
    it('should return the dossier if found and authorized', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      const result = await service.findOne(mockUserPayload, 'dossier-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'dossier-uuid', organizationId: 'org-uuid' },
        relations: { customer: true, salesUser: true, passengers: true },
      });
      expect(result).toEqual(mockDossier);
    });

    it('should throw NotFoundException if dossier not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user has only view.own but dossier is not owned by them', async () => {
      const ownOnlyUser = {
        id: 'other-user-uuid',
        organizationId: 'org-uuid',
        permissions: ['dossier.view.own'],
        roles: [],
      } as unknown as CurrentUserPayload;

      repository.findOne.mockResolvedValue(mockDossier);

      await expect(
        service.findOne(ownOnlyUser, 'dossier-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if dossier code already exists', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'VIP Tour',
        customerId: 'cust-uuid',
      };

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and save a new dossier with default DRAFT status', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const createDto: CreateDossierDto = {
        code: 'HS002',
        name: 'VIP Tour 2',
        customerId: 'cust-uuid',
      };

      const result = await service.create(mockUserPayload, createDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toEqual(DossierStatus.DRAFT);
      expect(result.createdBy).toEqual(mockUserPayload.id);
    });
  });

  describe('update', () => {
    it('should throw ConflictException if updating to an already existing code', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      // Mock code search on repository.findOne to find a conflicting dossier
      repository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'dossier-uuid') return Promise.resolve(mockDossier);
        return Promise.resolve({ id: 'conflicting-uuid' } as any);
      });

      const updateDto: UpdateDossierDto = { code: 'HS_DUPLICATE' };

      await expect(
        service.update(mockUserPayload, 'dossier-uuid', updateDto),
      ).rejects.toThrow(ConflictException);
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
      } as unknown as Dossier;

      repository.findOne.mockResolvedValue(activeDossier);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateDossierDto = {
        name: 'VIP Tour Updated',
        status: DossierStatus.SUBMITTED, // DRAFT to SUBMITTED is legal
      };

      const result = await service.update(
        mockUserPayload,
        'dossier-uuid',
        updateDto,
      );

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toEqual('VIP Tour Updated');
      expect(result.status).toEqual(DossierStatus.SUBMITTED);
    });
  });

  describe('remove', () => {
    it('should load dossier and call softRemove', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      repository.softRemove.mockResolvedValue(mockDossier);

      await service.remove(mockUserPayload, 'dossier-uuid');

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.softRemove).toHaveBeenCalledWith(mockDossier);
    });
  });
});
