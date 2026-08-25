import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { KpiMetric, KpiPeriodType } from '../../../common/enums';

@Entity('kpi_results')
export class KpiResult extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'metric_code',
    type: 'enum',
    enum: KpiMetric,
  })
  metricCode: KpiMetric;

  @Column({
    name: 'period_type',
    type: 'enum',
    enum: KpiPeriodType,
    default: KpiPeriodType.MONTHLY,
  })
  periodType: KpiPeriodType;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: string;

  @Column({ name: 'actual_value', type: 'numeric', precision: 18, scale: 2, default: 0 })
  actualValue: number;

  @Column({ name: 'achievement_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  achievementRate: number;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
