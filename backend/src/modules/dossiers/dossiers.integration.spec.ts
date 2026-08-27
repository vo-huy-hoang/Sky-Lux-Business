import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';
import { Dossier } from './entities/dossier.entity';
import { Comment } from './entities/comment.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { DossierStatus } from '../../common/enums';

describe('Dossiers Module (Integration)', () => {
  let controller: DossiersController;
  let dossierRepository: jest.Mocked<Repository<Dossier>>;

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
      ],
    }).compile();

    controller = module.get<DossiersController>(DossiersController);
    dossierRepository = module.get<Repository<Dossier>>(
      getRepositoryToken(Dossier),
    ) as jest.Mocked<Repository<Dossier>>;
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
});
