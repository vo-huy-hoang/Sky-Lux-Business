import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { SupplierType } from './supplier-type.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'supplier_type_id', type: 'uuid', nullable: true })
  supplierTypeId?: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'tax_code', type: 'varchar', length: 50, nullable: true })
  taxCode?: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 255, nullable: true })
  contactName?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms?: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => SupplierType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplier_type_id' })
  supplierType?: SupplierType;
}
