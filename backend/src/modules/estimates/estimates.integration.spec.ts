import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { EstimateStatus } from '../../common/enums';

describe('Estimates Module (Integration)', () => {
  let controller: EstimatesController;
  let estimateRepository: jest.Mocked<Repository<Estimate>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgA = {
    id: 'user-A-uuid',
    organizationId: orgA,
    permissions: ['estimate.view', 'estimate.create', 'estimate.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockEstimateOrgB = {
    id: 'est-B-uuid',
    dossierId: 'dossier-B-uuid',
    organizationId: orgB,
    status: EstimateStatus.DRAFT,
    revenueLines: [],
    costLines: [],
  } as unknown as Estimate;

  const mockEstimateOrgA = {
    id: 'est-A-uuid',
    dossierId: 'dossier-A-uuid',
    organizationId: orgA,
    status: EstimateStatus.DRAFT,
    revenueLines: [],
    costLines: [],
  } as unknown as Estimate;

  const mockDossiersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EstimatesController],
      providers: [
        EstimatesService,
        {
          provide: getRepositoryToken(Estimate),
          useValue: {
            createQueryBuilder: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstimateRevenueLine),
          useValue: {
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: {
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: DossiersService,
          useValue: mockDossiersService,
        },
      ],
    }).compile();

    controller = module.get<EstimatesController>(EstimatesController);
    estimateRepository = module.get(getRepositoryToken(Estimate));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ xem báo giá của Doanh nghiệp B (Trả về 404)', async () => {
      estimateRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'est-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockEstimateOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgA, 'est-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa báo giá của Doanh nghiệp B (Trả về 404)', async () => {
      estimateRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'est-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockEstimateOrgB);
      });

      const updateDto: UpdateEstimateDto = { note: 'Hacked note' };

      await expect(
        controller.update(mockUserOrgA, 'est-B-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Khóa cập nhật dựa trên Máy trạng thái (Locked states enforcement)', () => {
    it('Báo giá đã APPROVED không thể bị chỉnh sửa (Trả về 400)', async () => {
      const approvedEst = {
        ...mockEstimateOrgA,
        status: EstimateStatus.APPROVED,
      };
      estimateRepository.findOne.mockResolvedValue(approvedEst);

      const updateDto: UpdateEstimateDto = { note: 'Change after approval' };

      await expect(
        controller.update(mockUserOrgA, 'est-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('Báo giá đã SUPERSEDED không thể bị chỉnh sửa (Trả về 400)', async () => {
      const supersededEst = {
        ...mockEstimateOrgA,
        status: EstimateStatus.SUPERSEDED,
      };
      estimateRepository.findOne.mockResolvedValue(supersededEst);

      const updateDto: UpdateEstimateDto = { note: 'Change after supersede' };

      await expect(
        controller.update(mockUserOrgA, 'est-A-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
