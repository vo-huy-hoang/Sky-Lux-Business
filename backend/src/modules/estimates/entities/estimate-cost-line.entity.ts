import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Estimate } from './estimate.entity';
import { ServiceCategory } from '../../master-data/entities/service-category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Unit } from '../../master-data/entities/unit.entity';

@Entity('estimate_cost_lines')
@Index('idx_cost_lines_supplier', ['organizationId', 'supplierId'])
export class EstimateCostLine extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'estimate_id', type: 'uuid' })
  estimateId: string;

  @Column({ name: 'service_category_id', type: 'uuid', nullable: true })
  serviceCategoryId?: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId?: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId?: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  multiplier: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'vat_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Column({ name: 'price_basis', type: 'varchar', length: 50, nullable: true })
  priceBasis?: string;

  @Column({ name: 'gross_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ name: 'net_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  netAmount: number;

  @Column({ name: 'validation_status', type: 'varchar', length: 30, default: 'VALID' })
  validationStatus: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Estimate, (estimate) => estimate.costLines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estimate_id' })
  estimate: Estimate;

  @ManyToOne(() => ServiceCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'service_category_id' })
  serviceCategory?: ServiceCategory;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit?: Unit;
}
