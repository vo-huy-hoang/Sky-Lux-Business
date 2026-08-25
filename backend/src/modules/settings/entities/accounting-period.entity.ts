import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { AccountingPeriodStatus, KpiPeriodType } from '../../../common/enums';

@Entity('accounting_periods')
export class AccountingPeriod extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'period_type',
    type: 'enum',
    enum: KpiPeriodType,
    default: KpiPeriodType.MONTHLY,
  })
  periodType: KpiPeriodType;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({
    type: 'enum',
    enum: AccountingPeriodStatus,
    default: AccountingPeriodStatus.OPEN,
  })
  status: AccountingPeriodStatus;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date;

  @Column({ name: 'locked_by', type: 'uuid', nullable: true })
  lockedBy?: string;

  @Column({ name: 'unlock_reason', type: 'text', nullable: true })
  unlockReason?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'locked_by' })
  locker?: User;
}
