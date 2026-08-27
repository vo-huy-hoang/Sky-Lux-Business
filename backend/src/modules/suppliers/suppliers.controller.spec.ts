import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: SuppliersService;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['supplier.manage'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockSuppliersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll and return paginated suppliers', async () => {
      const queryDto = new QuerySupplierDto();
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockSuppliersService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserPayload, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(mockUserPayload, queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return supplier details', async () => {
      const mockSupplier = { id: 'sup-uuid', name: 'ABC Supplier' };
      mockSuppliersService.findOne.mockResolvedValue(mockSupplier);

      const result = await controller.findOne(mockUserPayload, 'sup-uuid');

      expect(service.findOne).toHaveBeenCalledWith(mockUserPayload, 'sup-uuid');
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('create', () => {
    it('should call service.create and return created supplier', async () => {
      const createDto: CreateSupplierDto = {
        code: 'SUP-001',
        name: 'ABC Supplier',
      };
      const mockSupplier = { id: 'sup-uuid', ...createDto };
      mockSuppliersService.create.mockResolvedValue(mockSupplier);

      const result = await controller.create(mockUserPayload, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserPayload, createDto);
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('update', () => {
    it('should call service.update and return updated supplier', async () => {
      const updateDto: UpdateSupplierDto = { name: 'Updated Name' };
      const mockSupplier = { id: 'sup-uuid', name: 'Updated Name' };
      mockSuppliersService.update.mockResolvedValue(mockSupplier);

      const result = await controller.update(
        mockUserPayload,
        'sup-uuid',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUserPayload,
        'sup-uuid',
        updateDto,
      );
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockSuppliersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUserPayload, 'sup-uuid');

      expect(service.remove).toHaveBeenCalledWith(mockUserPayload, 'sup-uuid');
    });
  });
});
