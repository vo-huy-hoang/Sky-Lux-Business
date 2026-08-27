import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let repository: jest.Mocked<Repository<Supplier>>;

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
  } as unknown as Supplier;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockSupplierRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    repository = module.get<Repository<Supplier>>(
      getRepositoryToken(Supplier),
    ) as jest.Mocked<Repository<Supplier>>;
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

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('supplier');
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
  });

  describe('findOne', () => {
    it('should return supplier if found and belongs to same organizationId', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne(mockUserPayload, 'sup-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'sup-uuid', organizationId: 'org-uuid' },
        relations: { supplierType: true },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ConflictException if supplier code already exists in organization', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);

      const createDto: CreateSupplierDto = {
        code: 'SUP001',
        name: 'ABC Supplier',
      };

      await expect(service.create(mockUserPayload, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create and save supplier successfully', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const createDto: CreateSupplierDto = {
        code: 'SUP002',
        name: 'XYZ Supplier',
      };

      const result = await service.create(mockUserPayload, createDto);

      expect(repository.save).toHaveBeenCalled();
      expect(result.status).toEqual('ACTIVE');
    });
  });

  describe('update', () => {
    it('should throw ConflictException if update code conflicts with another supplier in organization', async () => {
      repository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'sup-uuid') return Promise.resolve(mockSupplier);
        return Promise.resolve({ id: 'conflicting-uuid' } as any);
      });

      const updateDto: UpdateSupplierDto = { code: 'SUP_CONFLICT' };

      await expect(
        service.update(mockUserPayload, 'sup-uuid', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update properties successfully', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateSupplierDto = { name: 'XYZ Updated' };

      const result = await service.update(
        mockUserPayload,
        'sup-uuid',
        updateDto,
      );

      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toEqual('XYZ Updated');
    });
  });

  describe('remove', () => {
    it('should find supplier and call softRemove', async () => {
      repository.findOne.mockResolvedValue(mockSupplier);
      repository.softRemove.mockResolvedValue(mockSupplier);

      await service.remove(mockUserPayload, 'sup-uuid');

      expect(repository.findOne).toHaveBeenCalled();
      expect(repository.softRemove).toHaveBeenCalledWith(mockSupplier);
    });
  });
});
