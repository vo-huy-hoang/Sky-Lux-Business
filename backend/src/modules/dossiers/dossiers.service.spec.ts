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
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
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
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
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

    it('should combine own and team visibility filters for a team-scoped user', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const teamUser = {
        ...mockUserPayload,
        id: 'team-user-uuid',
        departmentId: 'department-uuid',
        permissions: ['dossier.view.team'],
      } as unknown as CurrentUserPayload;

      await service.findAll(teamUser, { page: 1, limit: 20 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('salesUser.departmentId'),
        { departmentId: 'department-uuid' },
      );
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

    it('should remove passwordHash from assigned users in the response', async () => {
      const dossierWithUsers = {
        ...mockDossier,
        salesUser: {
          id: 'sales-id',
          fullName: 'Sales',
          passwordHash: 'secret',
        },
        operatorUser: {
          id: 'operator-id',
          fullName: 'Operator',
          passwordHash: 'secret',
        },
      } as unknown as Dossier;
      repository.findOne.mockResolvedValue(dossierWithUsers);

      const result = await service.findOne(mockUserPayload, 'dossier-uuid');

      expect((result.salesUser as any).passwordHash).toBeUndefined();
      expect((result.operatorUser as any).passwordHash).toBeUndefined();
    });

    it('should reject a user who has update permission but no dossier view scope', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const updateOnlyUser = {
        ...mockUserPayload,
        permissions: ['dossier.update'],
      };

      await expect(
        service.findOne(updateOnlyUser, 'dossier-uuid'),
      ).rejects.toThrow(NotFoundException);
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

    it('should apply pagination and search when queryDto is provided', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Hello search',
          user: { id: 'u1', fullName: 'Nguyen A' },
        },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockComments, 1]);

      const queryDto: QueryCommentDto = {
        page: 1,
        pageSize: 10,
        search: 'Hello',
      };

      const result = await service.findComments(
        mockUserPayload,
        'dossier-uuid',
        queryDto,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'comment.content ILIKE :search',
        { search: '%Hello%' },
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('createComment (API-COMMENT-002)', () => {
    it('should create and return comment with sanitized user details', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const savedComment = {
        id: 'new-comm-uuid',
        content: 'Bình luận thử nghiệm',
        dossierId: 'dossier-uuid',
        organizationId: 'org-uuid',
      };
      commentRepository.save.mockResolvedValue(savedComment as any);
      commentRepository.findOne.mockResolvedValue({
        ...savedComment,
        user: {
          id: 'user-uuid',
          fullName: 'Test User',
          passwordHash: 'secret123',
          refreshTokenHash: 'refreshSecret',
        },
      } as any);

      const createDto: CreateCommentDto = {
        content: 'Bình luận thử nghiệm',
      };

      const result = await service.createComment(
        mockUserPayload,
        'dossier-uuid',
        createDto,
      );

      expect(commentRepository.create).toHaveBeenCalled();
      expect(commentRepository.save).toHaveBeenCalled();
      expect(result.data.id).toEqual('new-comm-uuid');
      expect((result.data.user as any).passwordHash).toBeUndefined();
      expect((result.data.user as any).refreshTokenHash).toBeUndefined();
    });

    it('should create reply comment when valid parentId is provided', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      const parentComment = {
        id: 'parent-comm-uuid',
        content: 'Parent comment',
        dossierId: 'dossier-uuid',
        organizationId: 'org-uuid',
      };
      commentRepository.findOne
        .mockResolvedValueOnce(parentComment as any) // check parentId
        .mockResolvedValueOnce({
          id: 'child-comm-uuid',
          content: 'Child comment',
          parentId: 'parent-comm-uuid',
        } as any); // fetch with user

      commentRepository.save.mockResolvedValue({
        id: 'child-comm-uuid',
        parentId: 'parent-comm-uuid',
      } as any);

      const createDto: CreateCommentDto = {
        content: 'Child comment',
        parentId: 'parent-comm-uuid',
      };

      const result = await service.createComment(
        mockUserPayload,
        'dossier-uuid',
        createDto,
      );

      expect(commentRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'parent-comm-uuid',
          dossierId: 'dossier-uuid',
          organizationId: 'org-uuid',
        },
      });
      expect(result.data.id).toEqual('child-comm-uuid');
    });

    it('should throw BadRequestException if dossier is LOCKED', async () => {
      repository.findOne.mockResolvedValue({
        ...mockDossier,
        status: DossierStatus.LOCKED,
      });

      const createDto: CreateCommentDto = {
        content: 'Test on locked dossier',
      };

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if parent comment is not found', async () => {
      repository.findOne.mockResolvedValue(mockDossier);
      commentRepository.findOne.mockResolvedValue(null);

      const createDto: CreateCommentDto = {
        content: 'Test reply',
        parentId: 'non-existent-parent',
      };

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject a comment containing only whitespace', async () => {
      repository.findOne.mockResolvedValue(mockDossier);

      await expect(
        service.createComment(mockUserPayload, 'dossier-uuid', {
          content: '   ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(commentRepository.create).not.toHaveBeenCalled();
    });
  });
});
