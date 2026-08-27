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
import { Comment } from './entities/comment.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { DossierStatus } from '../../common/enums';

describe('DossiersService', () => {
  let service: DossiersService;
  let repository: jest.Mocked<Repository<Dossier>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;

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
    getMany: jest.fn(),
  };

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockCommentRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DossiersService,
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
      ],
    }).compile();

    service = module.get<DossiersService>(DossiersService);
    repository = module.get(getRepositoryToken(Dossier));
    commentRepository = module.get(getRepositoryToken(Comment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of dossiers', async () => {
      const mockDossiers = [mockDossier];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockDossiers, 1]);

      const queryDto: QueryDossierDto = {
        page: 1,
        limit: 20,
        search: 'VIP',
        status: DossierStatus.DRAFT,
      };

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('dossier');
      expect(result).toEqual({
        items: mockDossiers,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return dossier detail when found and authorized', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      const result = await service.findOne(mockUserPayload, 'dossier-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'dossier-uuid', organizationId: 'org-uuid' },
        relations: {
          customer: true,
          businessLine: true,
          marketType: true,
          salesUser: true,
          operatorUser: true,
          passengers: true,
          estimates: true,
        },
      });
      expect(result).toEqual(mockDossier);
    });

    it('should throw NotFoundException if dossier is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new dossier with status DRAFT', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'VIP Tour',
        customerId: 'cust-uuid',
      };

      repository.findOne.mockResolvedValue(null);
      repository.save.mockResolvedValue({
        id: 'new-uuid',
        ...createDto,
        status: DossierStatus.DRAFT,
      } as any);

      const result = await service.create(mockUserPayload, createDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'HS001', organizationId: 'org-uuid' },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toEqual(DossierStatus.DRAFT);
    });

    it('should throw ConflictException if dossier code already exists', async () => {
      const createDto: CreateDossierDto = {
        code: 'HS001',
        name: 'VIP Tour',
        customerId: 'cust-uuid',
      };

      repository.findOne.mockResolvedValue(mockDossier);

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should throw ConflictException if code is changed to an existing code', async () => {
      repository.findOne
        .mockResolvedValueOnce(mockDossier) // findOne by ID
        .mockResolvedValueOnce({ id: 'other-id' } as any); // code existence check

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
      };

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

  describe('findComments (API-COMMENT-001)', () => {
    it('should return comments with sanitized user details', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Hello, this is a note.',
          user: { id: 'u1', fullName: 'Nguyen A', passwordHash: 'secret' },
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockComments);

      const result = await service.findComments(
        mockUserPayload,
        'dossier-uuid',
      );

      expect(commentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'comment',
      );
      expect(result.data).toHaveLength(1);
      expect((result.data[0].user as any).passwordHash).toBeUndefined();
    });
  });
});
