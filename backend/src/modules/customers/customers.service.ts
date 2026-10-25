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

type CustomerGroup = {
  customer: Customer;
  customerIds: string[];
};

type CustomerListItem = Customer & {
  customerIds: string[];
  dossierCount: number;
};

function normalizePhone(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

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
  ): Promise<PaginatedResponse<CustomerListItem>> {
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

    // Direct database-level pagination to prevent RAM exhaustion (OOM)
    queryBuilder
      .orderBy('customer.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, total] = await queryBuilder.getManyAndCount();
    const pageCustomerIds = customers.map((c) => c.id);
    const dossierCounts = await this.getDossierCounts(
      organizationId,
      pageCustomerIds,
    );
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      data: customers.map((customer) => {
        customer.assignedSales = toPublicUser(
          customer.assignedSales,
        ) as typeof customer.assignedSales;
        return Object.assign(customer, {
          customerIds: [customer.id],
          dossierCount: dossierCounts.get(customer.id) || 0,
        });
      }),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  private groupCustomers(customers: Customer[]): CustomerGroup[] {
    const parent = new Map<string, string>();
    const phoneOwner = new Map<string, string>();
    const emailOwner = new Map<string, string>();

    const find = (id: string): string => {
      const current = parent.get(id);
      if (!current || current === id) return id;
      const root = find(current);
      parent.set(id, root);
      return root;
    };

    const union = (left: string, right: string) => {
      const leftRoot = find(left);
      const rightRoot = find(right);
      if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
    };

    customers.forEach((customer) => parent.set(customer.id, customer.id));
    customers.forEach((customer) => {
      const phone = normalizePhone(customer.phone);
      const email = normalizeEmail(customer.email);
      if (phone) {
        const previous = phoneOwner.get(phone);
        if (previous) union(customer.id, previous);
        else phoneOwner.set(phone, customer.id);
      }
      if (email) {
        const previous = emailOwner.get(email);
        if (previous) union(customer.id, previous);
        else emailOwner.set(email, customer.id);
      }
    });

    const grouped = new Map<string, Customer[]>();
    customers.forEach((customer) => {
      const root = find(customer.id);
      const group = grouped.get(root) || [];
      group.push(customer);
      grouped.set(root, group);
    });

    return [...grouped.values()].map((members) => {
      // The first record is the stable master record; later imports contribute
      // dossiers to it without creating another visible customer row.
      members.sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return left - right;
      });
      return {
        customer: members[0],
        customerIds: members.map((member) => member.id),
      };
    });
  }

  private async getDossierCounts(
    organizationId: string,
    customerIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (customerIds.length === 0) return counts;

    const rows = await this.dossierRepository
      .createQueryBuilder('dossier')
      .select('dossier.customerId', 'customerId')
      .addSelect('COUNT(dossier.id)', 'count')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.customerId IN (:...customerIds)', { customerIds })
      .groupBy('dossier.customerId')
      .getRawMany();

    rows.forEach((row: { customerId: string; count: string | number }) => {
      counts.set(row.customerId, Number(row.count) || 0);
    });
    return counts;
  }

  private async resolveCustomerGroupIds(customer: Customer): Promise<string[]> {
    const conditions: Array<Record<string, any>> = [{ id: customer.id }];
    if (customer.phone) {
      conditions.push({
        phone: customer.phone,
        organizationId: customer.organizationId,
      });
    }
    if (customer.email) {
      conditions.push({
        email: customer.email,
        organizationId: customer.organizationId,
      });
    }
    const matched = await this.customerRepository.find({
      where: conditions,
      select: { id: true },
    });
    return matched.map((c) => c.id);
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
    const customer = await this.findOne(organizationId, customerId);

    const { page = 1, limit = 20, search, status, priority } = queryDto;
    const skip = (page - 1) * limit;
    const customerIds = await this.resolveCustomerGroupIds(customer);

    const queryBuilder = this.dossierRepository
      .createQueryBuilder('dossier')
      .leftJoinAndSelect('dossier.salesUser', 'salesUser')
      .leftJoinAndSelect('dossier.operatorUser', 'operatorUser')
      .leftJoinAndSelect('dossier.businessLine', 'businessLine')
      .leftJoinAndSelect('dossier.marketType', 'marketType')
      .leftJoinAndSelect('dossier.estimates', 'estimates')
      .leftJoinAndSelect('estimates.revenueLines', 'revenueLines')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.customerId IN (:...customerIds)', { customerIds });

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
