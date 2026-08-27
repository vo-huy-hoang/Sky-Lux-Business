import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerType } from '../../common/enums';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of customers', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockCustomersService.findAll.mockResolvedValue(mockResult);

      const queryDto: QueryCustomerDto = { page: 1, limit: 20 };
      const result = await controller.findAll('org-uuid', queryDto);

      expect(service.findAll).toHaveBeenCalledWith('org-uuid', queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should return a single customer profile by ID', async () => {
      const mockCustomer = { id: 'cust-uuid', displayName: 'Customer A' };
      mockCustomersService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('org-uuid', 'cust-uuid');

      expect(service.findOne).toHaveBeenCalledWith('org-uuid', 'cust-uuid');
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('create', () => {
    it('should call service.create and return the new customer', async () => {
      const createDto: CreateCustomerDto = {
        code: 'KH001',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'New Customer',
      };
      const mockCustomer = { id: 'cust-uuid', ...createDto };
      mockCustomersService.create.mockResolvedValue(mockCustomer);

      const result = await controller.create('org-uuid', createDto);

      expect(service.create).toHaveBeenCalledWith('org-uuid', createDto);
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('update', () => {
    it('should call service.update and return the updated customer', async () => {
      const updateDto: UpdateCustomerDto = { displayName: 'Updated Name' };
      const mockCustomer = {
        id: 'cust-uuid',
        code: 'KH001',
        displayName: 'Updated Name',
      };
      mockCustomersService.update.mockResolvedValue(mockCustomer);

      const result = await controller.update(
        'org-uuid',
        'cust-uuid',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        'org-uuid',
        'cust-uuid',
        updateDto,
      );
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockCustomersService.remove.mockResolvedValue(undefined);

      await controller.remove('org-uuid', 'cust-uuid');

      expect(service.remove).toHaveBeenCalledWith('org-uuid', 'cust-uuid');
    });
  });
});
