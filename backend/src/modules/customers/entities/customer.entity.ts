import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { CustomerContact } from './customer-contact.entity';
import { CustomerType } from '../../../common/enums';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.INDIVIDUAL,
  })
  customerType: CustomerType;

  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, nullable: true })
  taxCode?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ name: 'assigned_sales_id', type: 'uuid', nullable: true })
  assignedSalesId?: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_sales_id' })
  assignedSales?: User;

  @OneToMany(() => CustomerContact, (contact) => contact.customer, {
    cascade: true,
  })
  contacts: CustomerContact[];
}
