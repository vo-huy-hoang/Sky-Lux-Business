import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { SupplierType } from './entities/supplier-type.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;
  let supplierTypeRepository: jest.Mocked<Repository<SupplierType>>;
  let estimateCostLineRepository: jest.Mocked<Repository<EstimateCostLine>>;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['supplier.manage'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockSupplier = {
    id: 'sup-uuid',
    code: 'SUP001',
    name: 'ABC Supplier',
    organizationId: 'org-uuid',
    status: 'ACTIVE',
    supplierTypeId: 'st-uuid',
  } as unknown as Supplier;

  const mockSupplierType = {
    id: 'st-uuid',
    code: 'HOTEL',
    name: 'Khách sạn',
  } as unknown as SupplierType;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockSupplierRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockSupplierTypeRepository = {
    findOne: jest.fn(),
  };

  const mockEstimateCostLineRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
        {
          provide: getRepositoryToken(SupplierType),
          useValue: mockSupplierTypeRepository,
        },
        {
          provide: getRepositoryToken(EstimateCostLine),
          useValue: mockEstimateCostLineRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    supplierRepository = module.get(getRepositoryToken(Supplier));
    supplierTypeRepository = module.get(getRepositoryToken(SupplierType));
    estimateCostLineRepository = module.get(
      getRepositoryToken(EstimateCostLine),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of suppliers filtered by tenant', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSupplier], 1]);

      const result = await service.findAll(
        mockUserPayload,
        new QuerySupplierDto(),
      );

      expect(supplierRepository.createQueryBuilder).toHaveBeenCalledWith(
        'supplier',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'supplier.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result).toEqual({
        items: [mockSupplier],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search, status, and supplierTypeId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockSupplier], 1]);

      const queryDto: QuerySupplierDto = {
        page: 2,
        pageSize: 10,
        search: 'ABC',
        status: 'ACTIVE',
        supplierTypeId: 'st-uuid',
      };

      const result = await service.findAll(mockUserPayload, queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.status = :status',
        { status: 'ACTIVE' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.supplierTypeId = :supplierTypeId',
        { supplierTypeId: 'st-uuid' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(supplier.code ILIKE :keyword OR supplier.name ILIKE :keyword OR supplier.phone ILIKE :keyword OR supplier.email ILIKE :keyword OR supplier.taxCode ILIKE :keyword OR supplier.contactName ILIKE :keyword)',
        { keyword: '%ABC%' },
      );
      expect(result.page).toEqual(2);
      expect(result.limit).toEqual(10);
    });
  });

  describe('findOne', () => {
    it('should return supplier if found and belongs to same organizationId', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne(mockUserPayload, 'sup-uuid');

      expect(supplierRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sup-uuid', organizationId: 'org-uuid' },
        relations: { supplierType: true },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if not found', async () => {
      supplierRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if supplier code already exists in organization', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);

      const createDto: CreateSupplierDto = {
        code: 'SUP001',
        name: 'ABC Supplier',
      };

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if supplierTypeId does not exist', async () => {
      supplierRepository.findOne.mockResolvedValue(null);
      supplierTypeRepository.findOne.mockResolvedValue(null);

      const createDto: CreateSupplierDto = {
        code: 'SUP002',
        name: 'XYZ Supplier',
        supplierTypeId: 'invalid-st-uuid',
      };

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create and save supplier successfully', async () => {
      supplierRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockSupplier);
      supplierTypeRepository.findOne.mockResolvedValue(mockSupplierType);
      supplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        id: 'new-sup-uuid',
      });

      const createDto: CreateSupplierDto = {
        code: 'SUP002',
        name: 'XYZ Supplier',
        supplierTypeId: 'st-uuid',
      };

      const result = await service.create(mockUserPayload, createDto);

      expect(supplierRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('update', () => {
    it('should throw ConflictException if update code conflicts with another supplier in organization', async () => {
      supplierRepository.findOne.mockImplementation(
        ({ where }: { where: { id?: string; code?: string } }) => {
          if (where.id === 'sup-uuid') return Promise.resolve(mockSupplier);
          if (where.code === 'SUP_CONFLICT')
            return Promise.resolve({ id: 'other-uuid' } as Supplier);
          return Promise.resolve(null);
        },
      );

      const updateDto: UpdateSupplierDto = { code: 'SUP_CONFLICT' };

      await expect(
        service.update(mockUserPayload, 'sup-uuid', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if new supplierTypeId does not exist', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);
      supplierTypeRepository.findOne.mockResolvedValue(null);

      const updateDto: UpdateSupplierDto = {
        supplierTypeId: 'nonexistent-type',
      };

      await expect(
        service.update(mockUserPayload, 'sup-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update properties successfully', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);
      supplierRepository.save.mockResolvedValue({
        ...mockSupplier,
        name: 'XYZ Updated',
      });

      const updateDto: UpdateSupplierDto = { name: 'XYZ Updated' };

      const result = await service.update(
        mockUserPayload,
        'sup-uuid',
        updateDto,
      );

      expect(supplierRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if supplier is referenced in estimate cost lines', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);
      estimateCostLineRepository.count.mockResolvedValue(3);

      await expect(service.remove(mockUserPayload, 'sup-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should find supplier and call softRemove when no references exist', async () => {
      supplierRepository.findOne.mockResolvedValue(mockSupplier);
      estimateCostLineRepository.count.mockResolvedValue(0);
      supplierRepository.softRemove.mockResolvedValue(mockSupplier);

      await service.remove(mockUserPayload, 'sup-uuid');

      expect(supplierRepository.findOne).toHaveBeenCalled();
      expect(supplierRepository.softRemove).toHaveBeenCalledWith(mockSupplier);
    });
  });
});
