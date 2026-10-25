import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { Dossier } from './entities/dossier.entity';
import { Comment } from './entities/comment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { User } from '../users/entities/user.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { DossierStatus } from '../../common/enums';
import { DossierWorkflowService } from '../approvals/dossier-workflow.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('Dossiers Module (Integration)', () => {
  let controller: DossiersController;
  let dossierRepository: jest.Mocked<Repository<Dossier>>;
  let commentRepository: jest.Mocked<Repository<Comment>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgAAll = {
    id: 'user-A-all-uuid',
    organizationId: orgA,
    permissions: ['dossier.view.all', 'dossier.create', 'dossier.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockUserOrgAOwn = {
    id: 'user-A-own-uuid',
    organizationId: orgA,
    permissions: ['dossier.view.own', 'dossier.create', 'dossier.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockDossierOfOrgB = {
    id: 'dossier-B-uuid',
    code: 'HS-B-001',
    name: 'Dossier of Org B',
    organizationId: orgB,
    salesUserId: 'user-B-uuid',
    status: DossierStatus.DRAFT,
  } as unknown as Dossier;

  const mockDossierOfOrgA = {
    id: 'dossier-A-uuid',
    code: 'HS-A-001',
    name: 'Dossier of Org A',
    organizationId: orgA,
    salesUserId: 'user-A-own-uuid',
    status: DossierStatus.DRAFT,
  } as unknown as Dossier;

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockCommentRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossiersController],
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
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'cust-uuid' }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest
              .fn()
              .mockImplementation(({ where }: any) =>
                Promise.resolve(where.map(({ id }: any) => ({ id }))),
              ),
          },
        },
        {
          provide: DossierWorkflowService,
          useValue: {},
        },
        {
          provide: DocumentsService,
          useValue: {
            findByDossier: jest.fn(),
            uploadForDossier: jest.fn(),
          },
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<DossiersController>(DossiersController);
    dossierRepository = module.get<Repository<Dossier>>(
      getRepositoryToken(Dossier),
    ) as jest.Mocked<Repository<Dossier>>;
    commentRepository = module.get<Repository<Comment>>(
      getRepositoryToken(Comment),
    ) as jest.Mocked<Repository<Comment>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ truy cập chi tiết hồ sơ của Doanh nghiệp B (Trả về 404)', async () => {
      dossierRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'dossier-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDossierOfOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgAAll, 'dossier-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa hồ sơ của Doanh nghiệp B (Trả về 404)', async () => {
      dossierRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'dossier-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDossierOfOrgB);
      });

      const updateDto: UpdateDossierDto = { name: 'Hacked Name' };

      await expect(
        controller.update(mockUserOrgAAll, 'dossier-B-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Phân quyền xem hồ sơ cá nhân (Own Record Isolation)', () => {
    it('Nhân viên có quyền view.own KHÔNG THỂ xem hồ sơ của đồng nghiệp khác cùng doanh nghiệp (Trả về 404)', async () => {
      const colleagueDossier = {
        ...mockDossierOfOrgA,
        salesUserId: 'colleague-uuid', // owned by colleague
        createdBy: 'colleague-uuid',
      } as unknown as Dossier;

      dossierRepository.findOne.mockResolvedValue(colleagueDossier);

      await expect(
        controller.findOne(mockUserOrgAOwn, 'dossier-A-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Nhân viên có quyền view.own ĐƯỢC PHÉP xem hồ sơ do mình quản lý', async () => {
      dossierRepository.findOne.mockResolvedValue(mockDossierOfOrgA); // owned by user-A-own-uuid

      const result = await controller.findOne(
        mockUserOrgAOwn,
        'dossier-A-uuid',
      );

      expect(result).toEqual(mockDossierOfOrgA);
    });

    it('Nhân viên quản trị có quyền view.all ĐƯỢC PHÉP xem tất cả hồ sơ trong tổ chức', async () => {
      const colleagueDossier = {
        ...mockDossierOfOrgA,
        salesUserId: 'colleague-uuid',
      } as unknown as Dossier;

      dossierRepository.findOne.mockResolvedValue(colleagueDossier);

      const result = await controller.findOne(
        mockUserOrgAAll,
        'dossier-A-uuid',
      );

      expect(result).toEqual(colleagueDossier);
    });

    it('Nhân viên có quyền view.team ĐƯỢC PHÉP xem hồ sơ cùng phòng ban', async () => {
      const teamUser = {
        id: 'user-team-uuid',
        organizationId: orgA,
        departmentId: 'dept-sales-uuid',
        permissions: ['dossier.view.team'],
        roles: [],
      } as unknown as CurrentUserPayload;
      const teamDossier = {
        ...mockDossierOfOrgA,
        salesUser: {
          organizationId: orgA,
          departmentId: 'dept-sales-uuid',
        },
        salesUserId: 'colleague-uuid',
      } as unknown as Dossier;

      dossierRepository.findOne.mockResolvedValue(teamDossier);

      const result = await controller.findOne(teamUser, 'dossier-A-uuid');

      expect(result).toEqual(teamDossier);
    });
  });

  describe('3. Ràng buộc Máy trạng thái Hồ sơ (Dossier Status State Machine)', () => {
    it('Chặn chuyển trạng thái sai luật (ví dụ: DRAFT trực tiếp sang APPROVED - Trả về 400)', async () => {
      dossierRepository.findOne.mockResolvedValue(mockDossierOfOrgA); // starts in DRAFT

      const updateDto: UpdateDossierDto = { status: DossierStatus.APPROVED };

      await expect(
        controller.update(mockUserOrgAAll, 'dossier-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('Chặn chỉnh sửa hồ sơ khi đã bị khóa (status = LOCKED - Trả về 400)', async () => {
      const lockedDossier = {
        ...mockDossierOfOrgA,
        status: DossierStatus.LOCKED,
      };

      dossierRepository.findOne.mockResolvedValue(lockedDossier);

      const updateDto: UpdateDossierDto = { name: 'New Name' };

      await expect(
        controller.update(mockUserOrgAAll, 'dossier-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('Cho phép chuyển trạng thái đúng luật (DRAFT -> SUBMITTED)', async () => {
      dossierRepository.findOne.mockResolvedValue(mockDossierOfOrgA); // starts in DRAFT
      dossierRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateDossierDto = { status: DossierStatus.SUBMITTED };

      const result = await controller.update(
        mockUserOrgAAll,
        'dossier-A-uuid',
        updateDto,
      );

      expect(dossierRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(DossierStatus.SUBMITTED);
    });
  });

  describe('4. Bình luận hồ sơ (Dossier Comments - API-COMMENT-001 & API-COMMENT-002)', () => {
    it('Doanh nghiệp A KHÔNG THỂ thêm bình luận vào hồ sơ của Doanh nghiệp B (Trả về 404)', async () => {
      dossierRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'dossier-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDossierOfOrgB);
      });

      const createDto: CreateCommentDto = {
        content: 'Bình luận trái phép sang Org B',
      };

      await expect(
        controller.createComment(mockUserOrgAAll, 'dossier-B-uuid', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ xem bình luận của hồ sơ thuộc Doanh nghiệp B (Trả về 404)', async () => {
      dossierRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'dossier-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockDossierOfOrgB);
      });

      await expect(
        controller.findComments(
          mockUserOrgAAll,
          'dossier-B-uuid',
          new QueryCommentDto(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('Chặn tạo bình luận khi hồ sơ đã bị khóa (status = LOCKED - Trả về 400)', async () => {
      const lockedDossier = {
        ...mockDossierOfOrgA,
        status: DossierStatus.LOCKED,
      };
      dossierRepository.findOne.mockResolvedValue(lockedDossier);

      const createDto: CreateCommentDto = {
        content: 'Bình luận trên hồ sơ đã khóa',
      };

      await expect(
        controller.createComment(mockUserOrgAAll, 'dossier-A-uuid', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('Cho phép tạo bình luận thành công trên hồ sơ hợp lệ và làm sạch thông tin nhạy cảm', async () => {
      dossierRepository.findOne.mockResolvedValue(mockDossierOfOrgA);
      const savedComment = {
        id: 'new-comm-uuid',
        content: 'Bình luận hợp lệ',
        dossierId: 'dossier-A-uuid',
        organizationId: orgA,
      };
      commentRepository.save.mockResolvedValue(savedComment as any);
      commentRepository.findOne.mockResolvedValue({
        ...savedComment,
        user: {
          id: 'user-A-all-uuid',
          fullName: 'Admin Org A',
          passwordHash: 'secret-hashed',
          refreshTokenHash: 'refresh-hashed',
        },
      } as any);

      const createDto: CreateCommentDto = {
        content: 'Bình luận hợp lệ',
      };

      const result = await controller.createComment(
        mockUserOrgAAll,
        'dossier-A-uuid',
        createDto,
      );

      expect(result.data.id).toEqual('new-comm-uuid');
      expect((result.data.user as any).passwordHash).toBeUndefined();
      expect((result.data.user as any).refreshTokenHash).toBeUndefined();
    });
  });
});
