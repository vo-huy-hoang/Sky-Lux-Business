import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerContact } from './entities/customer-contact.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryDossierDto } from '../dossiers/dto/query-dossier.dto';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { toPublicUser } from '../../common/utils/public-user';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerContact)
    private readonly contactRepository: Repository<CustomerContact>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    organizationId: string,
    queryDto: QueryCustomerDto,
  ): Promise<PaginatedResponse<Customer>> {
    const { page, limit, search, customerType, status } = queryDto;
    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.assignedSales', 'assignedSales')
      .where('customer.organizationId = :organizationId', { organizationId });

    if (customerType) {
      queryBuilder.andWhere('customer.customerType = :customerType', {
        customerType,
      });
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(customer.code ILIKE :search OR customer.displayName ILIKE :search OR customer.phone ILIKE :search OR customer.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: items.map((customer) => {
        customer.assignedSales = toPublicUser(
          customer.assignedSales,
        ) as typeof customer.assignedSales;
        return customer;
      }),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    organizationId: string,
    id: string,
    actorUserId?: string,
  ): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, organizationId },
      relations: { contacts: true, assignedSales: true },
    });

    if (!customer) {
      throw new NotFoundException(
        `Không tìm thấy khách hàng với ID "${id}" trong doanh nghiệp của bạn`,
      );
    }

    customer.assignedSales = toPublicUser(
      customer.assignedSales,
    ) as typeof customer.assignedSales;
    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_VIEWED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: id,
        afterData: {
          fields: ['phone', 'email', 'address', 'dateOfBirth', 'contacts'],
        },
      });
    }
    return customer;
  }

  async create(
    organizationId: string,
    createCustomerDto: CreateCustomerDto,
    actorUserId?: string,
  ): Promise<Customer> {
    const { code, contacts, ...customerData } = createCustomerDto;

    // Check if customer code already exists within the organization
    const existingCustomer = await this.customerRepository.findOne({
      where: { code, organizationId },
    });
    if (existingCustomer) {
      throw new ConflictException(
        `Mã khách hàng "${code}" đã tồn tại trong doanh nghiệp của bạn`,
      );
    }

    // Map nested contacts
    let contactEntities: CustomerContact[] = [];
    if (contacts && contacts.length > 0) {
      contactEntities = contacts.map((c) => {
        const contact = this.contactRepository.create(c);
        contact.organizationId = organizationId;
        return contact;
      });
    }

    const customer = this.customerRepository.create({
      ...customerData,
      code,
      organizationId,
      contacts: contactEntities,
    });

    const savedCustomer = await this.customerRepository.save(customer);
    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_CREATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: savedCustomer.id,
        afterData: this.auditSnapshot(savedCustomer),
      });
    }
    return savedCustomer;
  }

  async update(
    organizationId: string,
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    actorUserId?: string,
  ): Promise<Customer> {
    const customer = await this.findOne(organizationId, id);
    const beforeData = this.auditSnapshot(customer);
    const previousStatus = customer.status;
    const previousAssignee = customer.assignedSalesId;

    const { code, contacts, ...customerData } = updateCustomerDto;

    // Check if code is updated and is unique
    if (code && code !== customer.code) {
      const existingCustomer = await this.customerRepository.findOne({
        where: { code, organizationId },
      });
      if (existingCustomer) {
        throw new ConflictException(
          `Mã khách hàng "${code}" đã tồn tại trong doanh nghiệp của bạn`,
        );
      }
      customer.code = code;
    }

    // Sync nested contacts
    if (contacts !== undefined) {
      const existingContacts = customer.contacts || [];
      const incomingIds = contacts.map((c) => c.id).filter(Boolean);

      // 1. Remove deleted contacts
      const contactsToDelete = existingContacts.filter(
        (c) => !incomingIds.includes(c.id),
      );
      if (contactsToDelete.length > 0) {
        await this.contactRepository.remove(contactsToDelete);
      }

      // 2. Upsert contacts
      const updatedContacts = contacts.map((incoming) => {
        const existing = existingContacts.find((c) => c.id === incoming.id);
        if (existing) {
          return Object.assign(existing, incoming);
        } else {
          const newContact = this.contactRepository.create({
            ...incoming,
            organizationId,
            customerId: id,
          });
          return newContact;
        }
      });

      customer.contacts = updatedContacts;
    }

    Object.assign(customer, customerData);

    const updatedCustomer = await this.customerRepository.save(customer);
    if (actorUserId) {
      const afterData = this.auditSnapshot(updatedCustomer);
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: id,
        beforeData,
        afterData,
      });
      if (previousStatus !== updatedCustomer.status) {
        await this.auditLogsService.record({
          organizationId,
          actorUserId,
          action: AuditAction.CUSTOMER_STATUS_CHANGED,
          entityType: AuditEntityType.CUSTOMER,
          entityId: id,
          beforeData: { status: previousStatus },
          afterData: { status: updatedCustomer.status },
        });
      }
      if (previousAssignee !== updatedCustomer.assignedSalesId) {
        await this.auditLogsService.record({
          organizationId,
          actorUserId,
          action: AuditAction.CUSTOMER_ASSIGNEE_CHANGED,
          entityType: AuditEntityType.CUSTOMER,
          entityId: id,
          beforeData: { assignedSalesId: previousAssignee ?? null },
          afterData: {
            assignedSalesId: updatedCustomer.assignedSalesId ?? null,
          },
        });
      }
    }
    return updatedCustomer;
  }

  async remove(
    organizationId: string,
    id: string,
    actorUserId?: string,
  ): Promise<void> {
    const customer = await this.findOne(organizationId, id);
    await this.customerRepository.softRemove(customer);
    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_DELETED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: id,
        beforeData: this.auditSnapshot(customer),
      });
    }
  }

  private auditSnapshot(customer: Customer): Record<string, unknown> {
    return {
      code: customer.code,
      customerType: customer.customerType,
      displayName: customer.displayName,
      taxCode: customer.taxCode,
      assignedSalesId: customer.assignedSalesId ?? null,
      status: customer.status,
      contactCount: customer.contacts?.length ?? undefined,
    };
  }

  private auditContactSnapshot(
    contact: CustomerContact,
  ): Record<string, unknown> {
    return {
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      position: contact.position ?? null,
      isPrimary: contact.isPrimary,
    };
  }

  /**
   * API-CONTACT-002: Tạo liên hệ mới cho khách hàng
   */
  async createContact(
    organizationId: string,
    customerId: string,
    createContactDto: CreateContactDto,
    actorUserId?: string,
  ) {
    // 1. Kiểm tra khách hàng tồn tại trong tổ chức
    await this.findOne(organizationId, customerId);

    // 2. Nếu contact này là primary, bỏ primary của các contact cũ
    if (createContactDto.isPrimary) {
      await this.contactRepository.update(
        { customerId, organizationId, isPrimary: true },
        { isPrimary: false },
      );
    }

    // 3. Tạo và lưu contact
    const contact = this.contactRepository.create({
      ...createContactDto,
      organizationId,
      customerId,
    });

    const savedContact = await this.contactRepository.save(contact);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: customerId,
        afterData: {
          contactId: savedContact.id,
          contact: this.auditContactSnapshot(savedContact),
        },
      });
    }

    return {
      data: savedContact,
    };
  }

  /**
   * API-CONTACT-003: Cập nhật thông tin người liên hệ
   */
  async updateContact(
    organizationId: string,
    customerId: string,
    contactId: string,
    updateContactDto: UpdateContactDto,
    actorUserId?: string,
  ) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, customerId, organizationId },
    });

    if (!contact) {
      throw new NotFoundException(
        `Không tìm thấy người liên hệ với ID "${contactId}" thuộc khách hàng`,
      );
    }

    // Nếu contact cập nhật thành primary, bỏ primary của các contact khác
    if (updateContactDto.isPrimary) {
      await this.contactRepository.update(
        { customerId, organizationId, isPrimary: true },
        { isPrimary: false },
      );
    }

    const beforeData = this.auditContactSnapshot(contact);
    Object.assign(contact, updateContactDto);
    const updatedContact = await this.contactRepository.save(contact);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: customerId,
        beforeData: { contactId, contact: beforeData },
        afterData: {
          contactId,
          contact: this.auditContactSnapshot(updatedContact),
        },
      });
    }

    return {
      data: updatedContact,
    };
  }

  /**
   * API-CONTACT-004: Xóa người liên hệ
   */
  async removeContact(
    organizationId: string,
    customerId: string,
    contactId: string,
    actorUserId?: string,
  ) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId, customerId, organizationId },
    });

    if (!contact) {
      throw new NotFoundException(
        `Không tìm thấy người liên hệ với ID "${contactId}" thuộc khách hàng`,
      );
    }

    const beforeData = this.auditContactSnapshot(contact);
    await this.contactRepository.softRemove(contact);

    if (actorUserId) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId,
        action: AuditAction.CUSTOMER_UPDATED,
        entityType: AuditEntityType.CUSTOMER,
        entityId: customerId,
        beforeData: { contactId, contact: beforeData },
        afterData: { contactId, deleted: true },
      });
    }

    return {
      message: 'Đã xóa người liên hệ thành công',
      data: { deleted: true },
    };
  }

  /**
   * API-CONTACT-005: Lấy danh sách hồ sơ tour (Dossiers) liên quan đến khách hàng
   */
  async findCustomerDossiers(
    organizationId: string,
    customerId: string,
    queryDto: QueryDossierDto,
  ) {
    // 1. Kiểm tra khách hàng tồn tại trong tổ chức
    await this.findOne(organizationId, customerId);

    const { page = 1, limit = 20, search, status, priority } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.dossierRepository
      .createQueryBuilder('dossier')
      .leftJoinAndSelect('dossier.salesUser', 'salesUser')
      .leftJoinAndSelect('dossier.operatorUser', 'operatorUser')
      .leftJoinAndSelect('dossier.businessLine', 'businessLine')
      .leftJoinAndSelect('dossier.marketType', 'marketType')
      .leftJoinAndSelect('dossier.estimates', 'estimates')
      .leftJoinAndSelect('estimates.revenueLines', 'revenueLines')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.customerId = :customerId', { customerId });

    if (status) {
      queryBuilder.andWhere('dossier.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('dossier.priority = :priority', { priority });
    }

    if (search && search.trim()) {
      const keyword = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(dossier.code ILIKE :keyword OR dossier.name ILIKE :keyword OR dossier.route ILIKE :keyword)',
        { keyword },
      );
    }

    queryBuilder.orderBy('dossier.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Compute totalRevenue for each estimate in dossiers
    const enrichedItems = items.map((item) => {
      if (item.estimates && item.estimates.length > 0) {
        const enrichedEstimates = item.estimates.map((est) => {
          const totalRev = (est.revenueLines || []).reduce((acc, line) => {
            const lineGross = Number(line.grossAmount) || 0;
            const lineSubtotal =
              (Number(line.quantity) || 0) *
              (Number(line.multiplier) || 1) *
              (Number(line.unitPrice) || 0);
            return acc + (lineGross > 0 ? lineGross : lineSubtotal);
          }, 0);
          return {
            ...est,
            totalRevenue: totalRev,
          };
        });
        return {
          ...item,
          estimates: enrichedEstimates,
        };
      }
      return item;
    });

    return {
      data: enrichedItems,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }
}
