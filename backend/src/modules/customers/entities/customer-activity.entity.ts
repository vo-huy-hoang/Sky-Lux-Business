import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Customer } from './customer.entity';

@Entity('customer_activities')
@Index('idx_customer_activities_customer_time', [
  'organizationId',
  'customerId',
  'occurredAt',
])
@Index('idx_customer_activities_org_type_time', [
  'organizationId',
  'type',
  'occurredAt',
])
export class CustomerActivity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  /** Stable machine value used for filtering and icon presentation in clients. */
  @Column({ type: 'varchar', length: 50 })
  type: string;

  /** Human-readable title stored in the database, not generated only by the UI. */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** Human-readable business context stored in the database. */
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'occurred_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  occurredAt: Date;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User;
}
