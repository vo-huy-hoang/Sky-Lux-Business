import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryDossierDto } from '../dossiers/dto/query-dossier.dto';
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
    createContact: jest.fn(),
    updateContact: jest.fn(),
    removeContact: jest.fn(),
    findCustomerDossiers: jest.fn(),
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

  describe('createContact (API-CONTACT-002)', () => {
    it('should call service.createContact', async () => {
      const dto: CreateContactDto = { name: 'Nguyen Van B' };
      const expectedResult = { data: { id: 'contact-uuid', ...dto } };
      mockCustomersService.createContact.mockResolvedValue(expectedResult);

      const result = await controller.createContact(
        'org-uuid',
        'cust-uuid',
        dto,
      );

      expect(service.createContact).toHaveBeenCalledWith(
        'org-uuid',
        'cust-uuid',
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateContact (API-CONTACT-003)', () => {
    it('should call service.updateContact', async () => {
      const dto: UpdateContactDto = { name: 'Updated Contact' };
      const expectedResult = { data: { id: 'contact-uuid', ...dto } };
      mockCustomersService.updateContact.mockResolvedValue(expectedResult);

      const result = await controller.updateContact(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
        dto,
      );

      expect(service.updateContact).toHaveBeenCalledWith(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('removeContact (API-CONTACT-004)', () => {
    it('should call service.removeContact', async () => {
      const expectedResult = { message: 'Success', data: { deleted: true } };
      mockCustomersService.removeContact.mockResolvedValue(expectedResult);

      const result = await controller.removeContact(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
      );

      expect(service.removeContact).toHaveBeenCalledWith(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findCustomerDossiers (API-CONTACT-005)', () => {
    it('should call service.findCustomerDossiers', async () => {
      const queryDto: QueryDossierDto = { page: 1, limit: 20 };
      const expectedResult = {
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
      mockCustomersService.findCustomerDossiers.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findCustomerDossiers(
        'org-uuid',
        'cust-uuid',
        queryDto,
      );

      expect(service.findCustomerDossiers).toHaveBeenCalledWith(
        'org-uuid',
        'cust-uuid',
        queryDto,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
