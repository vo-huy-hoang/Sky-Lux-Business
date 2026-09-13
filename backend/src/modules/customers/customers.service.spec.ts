import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryDossierDto } from '../dossiers/dto/query-dossier.dto';
import { CustomerType } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('CustomersService', () => {
  let service: CustomersService;

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
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
  };

  const mockDossierRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepository,
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a paginated list of customers', async () => {
      const mockCustomers = [mockCustomer];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockCustomers, 1]);

      const queryDto: QueryCustomerDto = {
        page: 1,
        limit: 20,
        search: 'Customer',
        customerType: CustomerType.INDIVIDUAL,
        status: 'ACTIVE',
      };

      const result = await service.findAll('org-uuid', queryDto);

      expect(mockCustomerRepository.createQueryBuilder).toHaveBeenCalledWith(
        'customer',
      );
      expect(result).toEqual({
        data: mockCustomers,
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      });
    });
  });

  describe('findOne', () => {
    it('should return customer profile if found', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne('org-uuid', 'cust-uuid');

      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-uuid', organizationId: 'org-uuid' },
        relations: { contacts: true, assignedSales: true },
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('org-uuid', 'non-existent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and save a new customer successfully', async () => {
      const createDto: CreateCustomerDto = {
        code: 'KH001',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'New Customer',
        contacts: [{ name: 'Contact 1', isPrimary: true }],
      };

      mockCustomerRepository.findOne.mockResolvedValue(null);
      mockCustomerRepository.save.mockResolvedValue({
        id: 'new-uuid',
        ...createDto,
      });

      const result = await service.create('org-uuid', createDto);

      expect(mockCustomerRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'KH001', organizationId: 'org-uuid' },
      });
      expect(mockContactRepository.create).toHaveBeenCalled();
      expect(mockCustomerRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if customer code already exists', async () => {
      const createDto: CreateCustomerDto = {
        code: 'KH001',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'New Customer',
      };

      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);

      await expect(service.create('org-uuid', createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update customer profile successfully', async () => {
      const updateDto: UpdateCustomerDto = {
        displayName: 'Updated Name',
        contacts: [],
      };

      mockCustomerRepository.findOne.mockResolvedValue({ ...mockCustomer });
      mockCustomerRepository.save.mockResolvedValue({
        ...mockCustomer,
        displayName: 'Updated Name',
      });

      const result = await service.update('org-uuid', 'cust-uuid', updateDto);

      expect(mockCustomerRepository.save).toHaveBeenCalled();
      expect(result.displayName).toEqual('Updated Name');
    });
  });

  describe('remove', () => {
    it('should soft-remove the customer', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      mockCustomerRepository.softRemove.mockResolvedValue(mockCustomer);

      await service.remove('org-uuid', 'cust-uuid');

      expect(mockCustomerRepository.softRemove).toHaveBeenCalledWith(
        mockCustomer,
      );
    });
  });

  describe('createContact (API-CONTACT-002)', () => {
    it('should create new contact and reset other primary contacts if isPrimary is true', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      const dto: CreateContactDto = {
        name: 'Nguyen Van B',
        email: 'b@skylux.vn',
        isPrimary: true,
      };

      const savedContact = {
        id: 'contact-uuid',
        ...dto,
        organizationId: 'org-uuid',
        customerId: 'cust-uuid',
      };
      mockContactRepository.save.mockResolvedValue(savedContact);

      const result = await service.createContact('org-uuid', 'cust-uuid', dto);

      expect(mockContactRepository.update).toHaveBeenCalledWith(
        {
          customerId: 'cust-uuid',
          organizationId: 'org-uuid',
          isPrimary: true,
        },
        { isPrimary: false },
      );
      expect(mockContactRepository.create).toHaveBeenCalled();
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result.data).toEqual(savedContact);
    });
  });

  describe('updateContact (API-CONTACT-003)', () => {
    it('should update contact successfully', async () => {
      const existingContact = {
        id: 'contact-uuid',
        name: 'Old Name',
        isPrimary: false,
      };
      mockContactRepository.findOne.mockResolvedValue(existingContact);
      mockContactRepository.save.mockImplementation((c) => Promise.resolve(c));

      const dto: UpdateContactDto = { name: 'New Name', isPrimary: true };
      const result = await service.updateContact(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
        dto,
      );

      expect(mockContactRepository.update).toHaveBeenCalledWith(
        {
          customerId: 'cust-uuid',
          organizationId: 'org-uuid',
          isPrimary: true,
        },
        { isPrimary: false },
      );
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result.data.name).toBe('New Name');
    });

    it('should throw NotFoundException if contact does not exist', async () => {
      mockContactRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateContact('org-uuid', 'cust-uuid', 'non-existent', {
          name: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeContact (API-CONTACT-004)', () => {
    it('should soft-remove contact', async () => {
      const existingContact = { id: 'contact-uuid', name: 'Contact' };
      mockContactRepository.findOne.mockResolvedValue(existingContact);
      mockContactRepository.softRemove.mockResolvedValue(existingContact);

      const result = await service.removeContact(
        'org-uuid',
        'cust-uuid',
        'contact-uuid',
      );

      expect(mockContactRepository.softRemove).toHaveBeenCalledWith(
        existingContact,
      );
      expect(result.data.deleted).toBe(true);
    });

    it('should throw NotFoundException if contact does not exist for deletion', async () => {
      mockContactRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeContact('org-uuid', 'cust-uuid', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findCustomerDossiers (API-CONTACT-005)', () => {
    it('should return paginated list of dossiers related to customer', async () => {
      mockCustomerRepository.findOne.mockResolvedValue(mockCustomer);
      const mockDossiers = [
        { id: 'dossier-uuid', code: 'DOS001', name: 'Tour Han Quoc' },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockDossiers, 1]);

      const queryDto: QueryDossierDto = { page: 1, limit: 20 };
      const result = await service.findCustomerDossiers(
        'org-uuid',
        'cust-uuid',
        queryDto,
      );

      expect(mockDossierRepository.createQueryBuilder).toHaveBeenCalledWith(
        'dossier',
      );
      expect(result.data).toEqual(mockDossiers);
      expect(result.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
