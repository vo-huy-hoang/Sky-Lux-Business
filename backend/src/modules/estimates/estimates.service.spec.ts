import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EstimatesService } from './estimates.service';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { EstimateStatus, DossierStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('EstimatesService', () => {
  let service: EstimatesService;
  let estimateRepository: jest.Mocked<Repository<Estimate>>;
  let revenueLineRepository: jest.Mocked<Repository<EstimateRevenueLine>>;
  let costLineRepository: jest.Mocked<Repository<EstimateCostLine>>;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;
  let dossiersService: jest.Mocked<DossiersService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockTransactionalEntityManager: any;

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

  const mockSupplierRepository = {
    count: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    mockSupplierRepository.count.mockResolvedValue(1);
    mockTransactionalEntityManager = {
      getRepository: jest.fn((entity: any) => {
        if (entity === EstimateRevenueLine) return revenueLineRepository;
        if (entity === EstimateCostLine) return costLineRepository;
        return estimateRepository;
      }),
      delete: jest.fn(),
      save: jest.fn((entity: any) => estimateRepository.save(entity)),
    };

    const mockDataSource = {
      transaction: jest.fn(async (cb: any) =>
        cb(mockTransactionalEntityManager),
      ),
    };

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
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
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
    supplierRepository = module.get(getRepositoryToken(Supplier));
    dossiersService = module.get(DossiersService);
    dataSource = module.get(DataSource);
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

    it('should throw BadRequestException if costLines contains supplierId from another organization', async () => {
      dossiersService.findOne.mockResolvedValue({ id: 'dossier-uuid' } as any);
      mockSupplierRepository.count.mockResolvedValue(0);

      await expect(
        service.create(mockUserPayload, {
          dossierId: 'dossier-uuid',
          costLines: [
            {
              description: 'Cost with invalid supplier',
              supplierId: 'cross-org-supplier-id',
              unitPrice: 100,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate from quantity, multiplier, and price even when an imported source amount exists', async () => {
      dossiersService.findOne.mockResolvedValue({ id: 'dossier-uuid' } as any);
      estimateRepository.count.mockResolvedValue(0);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const result = await service.create(mockUserPayload, {
        dossierId: 'dossier-uuid',
        costLines: [
          {
            description: 'Chi phí import',
            quantity: 2,
            multiplier: 3,
            unitPrice: 100,
            vatRate: 10,
            sourceAmount: 999,
          },
          {
            description: 'Dòng không phát sinh',
            quantity: 0,
            multiplier: 1,
            unitPrice: 500,
            vatRate: 10,
          },
        ],
      });

      expect(result.costLines[0]).toEqual(
        expect.objectContaining({
          sourceAmount: 999,
          netAmount: 600,
          grossAmount: 660,
        }),
      );
      expect(result.costLines[1]).toEqual(
        expect.objectContaining({ netAmount: 0, grossAmount: 0 }),
      );
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

    it('should throw BadRequestException if dossier is LOCKED', async () => {
      const lockedEstimate = {
        ...mockEstimate,
        status: EstimateStatus.APPROVED,
        dossier: { id: 'dossier-uuid', status: DossierStatus.LOCKED },
      };
      estimateRepository.findOne.mockResolvedValue(lockedEstimate as any);

      const updateDto: UpdateEstimateDto = { note: 'Try modify locked' };

      await expect(
        service.update(mockUserPayload, 'est-uuid', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow modifying estimate when dossier status is COMPLETED', async () => {
      const completedEstimate = {
        ...mockEstimate,
        status: EstimateStatus.APPROVED,
        dossier: { id: 'dossier-uuid', status: DossierStatus.COMPLETED },
        revenueLines: [],
        costLines: [],
      } as unknown as Estimate;

      estimateRepository.findOne.mockResolvedValue(completedEstimate);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateEstimateDto = { note: 'Updated note on completed dossier' };

      const result = await service.update(
        mockUserPayload,
        'est-uuid',
        updateDto,
      );

      expect(result.note).toEqual('Updated note on completed dossier');
      expect(result.status).toEqual(EstimateStatus.APPROVED);
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

      expect(dataSource.transaction).toHaveBeenCalled();
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

    it('should execute inside database transaction and propagate errors on rollback', async () => {
      const activeEstimate = {
        ...mockEstimate,
        status: EstimateStatus.DRAFT,
        revenueLines: [],
        costLines: [],
      } as unknown as Estimate;

      estimateRepository.findOne.mockResolvedValue(activeEstimate);
      estimateRepository.save.mockRejectedValue(
        new Error('Database disk write error'),
      );

      await expect(
        service.update(mockUserPayload, 'est-uuid', { note: 'Crash test' }),
      ).rejects.toThrow('Database disk write error');

      expect(dataSource.transaction).toHaveBeenCalled();
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

    it('should recalculate an imported cost line and clear its source marker after numeric edits', async () => {
      const activeEstimate = {
        ...mockEstimate,
        costLines: [
          {
            id: 'cost-imported',
            quantity: 1,
            multiplier: 1,
            unitPrice: 900,
            vatRate: 10,
            sourceAmount: 900,
            note: 'Số tiền nguồn: 900',
          },
        ],
      } as unknown as Estimate;
      estimateRepository.findOne.mockResolvedValue(activeEstimate);
      estimateRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const result = await service.update(mockUserPayload, 'est-uuid', {
        costLines: [
          {
            id: 'cost-imported',
            description: 'Chi phí import',
            quantity: 3,
            multiplier: 2,
            unitPrice: 100,
            vatRate: 10,
            sourceAmount: null,
            note: 'Số tiền nguồn: 900',
          },
        ],
      });

      expect(result.costLines[0]).toEqual(
        expect.objectContaining({
          sourceAmount: null,
          netAmount: 600,
          grossAmount: 660,
          note: undefined,
        }),
      );
    });

    it('should throw BadRequestException if updated costLines contains supplierId from another organization', async () => {
      estimateRepository.findOne.mockResolvedValue({
        ...mockEstimate,
        status: EstimateStatus.DRAFT,
      });
      mockSupplierRepository.count.mockResolvedValue(0);

      await expect(
        service.update(mockUserPayload, 'est-uuid', {
          costLines: [
            {
              description: 'Updated cost with invalid supplier',
              supplierId: 'cross-org-supplier-id',
              unitPrice: 200,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
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
