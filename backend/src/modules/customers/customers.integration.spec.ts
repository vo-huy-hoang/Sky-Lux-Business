import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { CustomerType } from '../../common/enums';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

describe('Customers Module (Integration)', () => {
  let controller: CustomersController;
  let customerRepository: jest.Mocked<Repository<Customer>>;
  let contactRepository: jest.Mocked<Repository<CustomerContact>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockCustomerOfOrgB = {
    id: 'customer-B-uuid',
    code: 'KH001',
    displayName: 'Customer of B',
    organizationId: orgB,
    contacts: [],
  } as unknown as Customer;

  const mockCustomerRepository = {
    createQueryBuilder: jest.fn(),
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
      controllers: [CustomersController],
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

    controller = module.get<CustomersController>(CustomersController);
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    ) as jest.Mocked<Repository<Customer>>;
    contactRepository = module.get<Repository<CustomerContact>>(
      getRepositoryToken(CustomerContact),
    ) as jest.Mocked<Repository<CustomerContact>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ truy cập chi tiết khách hàng của Doanh nghiệp B (Trả về 404)', async () => {
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'customer-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockCustomerOfOrgB);
      });

      await expect(controller.findOne(orgA, 'customer-B-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa khách hàng của Doanh nghiệp B (Trả về 404)', async () => {
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'customer-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockCustomerOfOrgB);
      });

      const updateDto: UpdateCustomerDto = { displayName: 'Hacked Name' };

      await expect(
        controller.update(orgA, 'customer-B-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ xóa khách hàng của Doanh nghiệp B (Trả về 404)', async () => {
      customerRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'customer-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockCustomerOfOrgB);
      });

      await expect(controller.remove(orgA, 'customer-B-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('2. Ràng buộc độc nhất mã khách hàng trong tổ chức (Scoped Code Uniqueness)', () => {
    it('Doanh nghiệp A KHÔNG THỂ tạo khách hàng trùng mã code đã tồn tại trong doanh nghiệp mình (Trả về 409)', async () => {
      const existingCustomer = {
        id: 'cust-1',
        code: 'KH001',
        organizationId: orgA,
      } as Customer;

      customerRepository.findOne.mockResolvedValue(existingCustomer);

      const createDto: CreateCustomerDto = {
        code: 'KH001',
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'Customer 1 duplicate',
      };

      await expect(controller.create(orgA, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Doanh nghiệp A ĐƯỢC PHÉP tạo khách hàng trùng mã code với một doanh nghiệp khác', async () => {
      // customerRepository.findOne returns null for organization A
      customerRepository.findOne.mockResolvedValue(null);
      customerRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const createDto: CreateCustomerDto = {
        code: 'KH001', // KH001 already exists in org B, but not org A
        customerType: CustomerType.INDIVIDUAL,
        displayName: 'Customer 1 in Org A',
      };

      const result = await controller.create(orgA, createDto);

      expect(customerRepository.save).toHaveBeenCalled();
      expect(result.code).toEqual('KH001');
      expect(result.organizationId).toEqual(orgA);
    });
  });

  describe('3. Xử lý xóa mềm cascade đồng bộ (Cascade Soft Delete)', () => {
    it('Xóa khách hàng đồng thời gọi softRemove để xóa mềm toàn bộ liên hệ liên quan', async () => {
      const existingContact = {
        id: 'contact-uuid-1',
        name: 'Contact A',
      } as CustomerContact;

      const customerWithContacts = {
        id: 'cust-uuid',
        code: 'KH001',
        organizationId: orgA,
        contacts: [existingContact],
      } as unknown as Customer;

      customerRepository.findOne.mockResolvedValue(customerWithContacts);
      customerRepository.softRemove.mockResolvedValue(customerWithContacts);

      await controller.remove(orgA, 'cust-uuid');

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-uuid', organizationId: orgA },
        relations: { contacts: true, assignedSales: true },
      });
      expect(customerRepository.softRemove).toHaveBeenCalledWith(
        customerWithContacts,
      );
    });
  });
});
