import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Estimate } from './estimate.entity';
import { PassengerType } from '../../master-data/entities/passenger-type.entity';
import { Unit } from '../../master-data/entities/unit.entity';

@Entity('estimate_revenue_lines')
@Index('idx_rev_lines_estimate_id', ['estimateId'])
export class EstimateRevenueLine extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'estimate_id', type: 'uuid' })
  estimateId: string;

  @Column({ name: 'passenger_type_id', type: 'uuid', nullable: true })
  passengerTypeId?: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  quantity: number;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId?: string;

  @Column({ type: 'numeric', precision: 12, scale: 3, default: 1 })
  multiplier: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  unitPrice: number;

  @Column({
    name: 'vat_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  vatRate: number;

  @Column({ name: 'price_basis', type: 'varchar', length: 50, nullable: true })
  priceBasis?: string;

  @Column({
    name: 'gross_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  grossAmount: number;

  @Column({
    name: 'net_amount',
    type: 'numeric',
    precision: 18,
    scale: 2,
    default: 0,
  })
  netAmount: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Estimate, (estimate) => estimate.revenueLines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'estimate_id' })
  estimate: Estimate;

  @ManyToOne(() => PassengerType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'passenger_type_id' })
  passengerType?: PassengerType;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit?: Unit;
}
