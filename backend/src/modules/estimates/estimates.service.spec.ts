import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EstimatesService } from './estimates.service';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { EstimateStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('EstimatesService', () => {
  let service: EstimatesService;
  let estimateRepository: jest.Mocked<Repository<Estimate>>;
  let revenueLineRepository: jest.Mocked<Repository<EstimateRevenueLine>>;
  let costLineRepository: jest.Mocked<Repository<EstimateCostLine>>;
  let dossiersService: jest.Mocked<DossiersService>;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['estimate.view', 'estimate.create', 'estimate.update'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockEstimate = {
    id: 'est-uuid',
    dossierId: 'dossier-uuid',
    organizationId: 'org-uuid',
    versionNo: 1,
    status: EstimateStatus.DRAFT,
    revenueLines: [],
    costLines: [],
  } as unknown as Estimate;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockDossiersService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimatesService,
        {
          provide: getRepositoryToken(Estimate),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            })),
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },

        {
          provide: DossiersService,
          useValue: mockDossiersService,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<EstimatesService>(EstimatesService);
    estimateRepository = module.get(getRepositoryToken(Estimate));
    revenueLineRepository = module.get(getRepositoryToken(EstimateRevenueLine));
    costLineRepository = module.get(getRepositoryToken(EstimateCostLine));
    dossiersService = module.get(DossiersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated estimates filtered by tenant', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockEstimate], 1]);

      const result = await service.findAll(
        mockUserPayload,
        new QueryEstimateDto(),
      );

      expect(estimateRepository.createQueryBuilder).toHaveBeenCalledWith(
        'estimate',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'estimate.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result).toEqual({
        data: [mockEstimate],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('should return estimate details if found and authorized', async () => {
      estimateRepository.findOne.mockResolvedValue(mockEstimate);

      const result = await service.findOne(mockUserPayload, 'est-uuid');

      expect(estimateRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'est-uuid', organizationId: 'org-uuid' },
        relations: {
          dossier: true,
          revenueLines: { unit: true, passengerType: true },
          costLines: { unit: true, serviceCategory: true, supplier: true },
        },
        order: {
          revenueLines: { sortOrder: 'ASC' },
          costLines: { sortOrder: 'ASC' },
        },
      });
      expect(result).toEqual(mockEstimate);
    });

    it('should throw NotFoundException if not found', async () => {
      estimateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should verify dossier ownership and calculate financial lines gross/net amounts', async () => {
      dossiersService.findOne.mockResolvedValue({ id: 'dossier-uuid' } as any);
      estimateRepository.count.mockResolvedValue(2);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const createDto: CreateEstimateDto = {
        dossierId: 'dossier-uuid',
        currency: 'VND',
        revenueLines: [
          {
            description: 'Item 1',
            quantity: 2,
            multiplier: 3,
            unitPrice: 100,
            vatRate: 10,
            sortOrder: 1,
          },
        ],
        costLines: [
          {
            description: 'Cost 1',
            quantity: 1,
            multiplier: 1,
            unitPrice: 500,
            vatRate: 0,
            sortOrder: 1,
          },
        ],
      };

      const result = await service.create(mockUserPayload, createDto);

      expect(dossiersService.findOne).toHaveBeenCalledWith(
        mockUserPayload,
        'dossier-uuid',
      );
      expect(estimateRepository.count).toHaveBeenCalled();
      expect(result.versionNo).toEqual(3);

      expect(result.revenueLines[0].netAmount).toEqual(600); // 2 * 3 * 100
      expect(result.revenueLines[0].grossAmount).toEqual(660); // 600 * 1.1

      expect(result.costLines[0].netAmount).toEqual(500); // 1 * 1 * 500
      expect(result.costLines[0].grossAmount).toEqual(500); // 500 * 1.0
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if estimate is already APPROVED', async () => {
      const approvedEstimate = {
        ...mockEstimate,
        status: EstimateStatus.APPROVED,
      };
      estimateRepository.findOne.mockResolvedValue(approvedEstimate);

      const updateDto: UpdateEstimateDto = { note: 'Try modify' };

      await expect(
        service.update(mockUserPayload, 'est-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate status machine transitions and sync nested lines', async () => {
      const activeEstimate = {
        ...mockEstimate,
        status: EstimateStatus.DRAFT,
        revenueLines: [{ id: 'rev-line-1', quantity: 1 } as any],
        costLines: [],
      } as unknown as Estimate;

      estimateRepository.findOne.mockResolvedValue(activeEstimate);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateEstimateDto = {
        status: EstimateStatus.SUBMITTED,
        revenueLines: [
          {
            description: 'Revenue line 2 (New)',
            quantity: 5,
            unitPrice: 10,
          },
        ], // Omits rev-line-1, so it should be deleted
      };

      const result = await service.update(
        mockUserPayload,
        'est-uuid',
        updateDto,
      );

      expect(revenueLineRepository.delete).toHaveBeenCalledWith(['rev-line-1']);
      expect(estimateRepository.save).toHaveBeenCalled();
      expect(result.status).toEqual(EstimateStatus.SUBMITTED);
      expect(result.revenueLines[0].description).toEqual(
        'Revenue line 2 (New)',
      );
      expect(revenueLineRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ estimateId: 'est-uuid' }),
      );
    });

    it('should attach newly added cost lines to the estimate before saving', async () => {
      const activeEstimate = {
        ...mockEstimate,
        costLines: [],
      } as unknown as Estimate;
      estimateRepository.findOne.mockResolvedValue(activeEstimate);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      await service.update(mockUserPayload, 'est-uuid', {
        costLines: [
          {
            description: 'Chi phí mới',
            quantity: 1,
            multiplier: 1,
            unitPrice: 100,
            vatRate: 10,
          },
        ],
      });

      expect(costLineRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-uuid',
          estimateId: 'est-uuid',
          description: 'Chi phí mới',
        }),
      );
    });
  });

  describe('remove', () => {
    it('should find and softRemove estimate', async () => {
      estimateRepository.findOne.mockResolvedValue(mockEstimate);
      estimateRepository.softRemove.mockResolvedValue(mockEstimate);

      await service.remove(mockUserPayload, 'est-uuid');

      expect(estimateRepository.findOne).toHaveBeenCalled();
      expect(estimateRepository.softRemove).toHaveBeenCalledWith(mockEstimate);
    });
  });
});
