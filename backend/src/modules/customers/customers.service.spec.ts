import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerType } from '../../common/enums';

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<Repository<Customer>>;
  let contactRepository: jest.Mocked<Repository<CustomerContact>>;

  const mockCustomer = {
    id: 'cust-uuid',
    code: 'KH001',
    displayName: 'Customer A',
    organizationId: 'org-uuid',
    contacts: [],
  } as unknown as Customer;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockCustomerRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockContactRepository = {
    create: jest.fn((dto) => dto),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(CustomerContact),
          useValue: mockContactRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    ) as jest.Mocked<Repository<Customer>>;
    contactRepository = module.get<Repository<CustomerContact>>(
      getRepositoryToken(CustomerContact),
    ) as jest.Mocked<Repository<CustomerContact>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of customers', async () => {
      const queryDto: QueryCustomerDto = {
        page: 1,
        limit: 20,
        search: 'Customer',
      };
      const mockItems = [mockCustomer];
      const mockTotal = 1;

      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        mockItems,
        mockTotal,
      ]);

      const result = await service.findAll('org-uuid', queryDto);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('customer');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'customer.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result).toEqual({
        items: mockItems,
        total: mockTotal,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return the customer if found', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne('org-uuid', 'cust-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-uuid', organizationId: 'org-uuid' },
        relations: { contacts: true, assignedSales: true },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('org-uuid', 'invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should throw ConflictException if customer code already exists in organization', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);

      const dto: CreateCustomerDto = {
        code: 'KH001',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'New Customer',
      };

      await expect(service.create('org-uuid', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should successfully create and save a new customer', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const dto: CreateCustomerDto = {
        code: 'KH002',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'New Customer',
        contacts: [{ name: 'Contact A', isPrimary: true }],
      };

      const result = await service.create('org-uuid', dto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'KH002', organizationId: 'org-uuid' },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.code).toEqual('KH002');
      expect(result.contacts?.length).toEqual(1);
    });
  });

  describe('update', () => {
    it('should throw ConflictException if new code is already used by another customer', async () => {
      const existingCustomer = {
        id: 'cust-uuid-1',
        code: 'KH001',
        displayName: 'Customer 1',
        organizationId: 'org-uuid',
      } as Customer;

      const duplicateCustomer = {
        id: 'cust-uuid-2',
        code: 'KH002',
        displayName: 'Customer 2',
        organizationId: 'org-uuid',
      } as Customer;

      repository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'cust-uuid-1')
          return Promise.resolve(existingCustomer);
        if (where.code === 'KH002') return Promise.resolve(duplicateCustomer);
        return Promise.resolve(null);
      });

      const dto: UpdateCustomerDto = { code: 'KH002' };

      await expect(
        service.update('org-uuid', 'cust-uuid-1', dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update customer properties and sync nested contacts', async () => {
      const existingContact1 = {
        id: 'contact-uuid-1',
        name: 'Contact 1',
      } as CustomerContact;
      const existingCustomer = {
        id: 'cust-uuid',
        code: 'KH001',
        displayName: 'Customer 1',
        organizationId: 'org-uuid',
        contacts: [existingContact1],
      } as Customer;

      repository.findOne.mockResolvedValue(existingCustomer);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const dto: UpdateCustomerDto = {
        displayName: 'Updated Customer Name',
        contacts: [
          { id: 'contact-uuid-1', name: 'Contact 1 Updated' }, // update
          { name: 'Contact 2 New' }, // create
        ],
      };

      const result = await service.update('org-uuid', 'cust-uuid', dto);

      expect(contactRepository.remove).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result.displayName).toEqual('Updated Customer Name');
      expect(result.contacts?.length).toEqual(2);
      expect(result.contacts?.[0].name).toEqual('Contact 1 Updated');
      expect(result.contacts?.[1].name).toEqual('Contact 2 New');
    });

    it('should delete contacts that are not present in incoming list', async () => {
      const existingContact1 = {
        id: 'contact-uuid-1',
        name: 'Contact 1',
      } as CustomerContact;
      const existingContact2 = {
        id: 'contact-uuid-2',
        name: 'Contact 2',
      } as CustomerContact;
      const existingCustomer = {
        id: 'cust-uuid',
        code: 'KH001',
        displayName: 'Customer 1',
        organizationId: 'org-uuid',
        contacts: [existingContact1, existingContact2],
      } as Customer;

      repository.findOne.mockResolvedValue(existingCustomer);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const dto: UpdateCustomerDto = {
        contacts: [
          { id: 'contact-uuid-1', name: 'Contact 1' }, // keep contact 1
        ],
      };

      await service.update('org-uuid', 'cust-uuid', dto);

      expect(contactRepository.remove).toHaveBeenCalledWith([existingContact2]);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should load customer and soft remove it', async () => {
      repository.findOne.mockResolvedValue(mockCustomer);
      repository.softRemove.mockResolvedValue(mockCustomer);

      await service.remove('org-uuid', 'cust-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-uuid', organizationId: 'org-uuid' },
        relations: { contacts: true, assignedSales: true },
      });
      expect(repository.softRemove).toHaveBeenCalledWith(mockCustomer);
    });

    it('should throw NotFoundException if customer to remove is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('org-uuid', 'invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
