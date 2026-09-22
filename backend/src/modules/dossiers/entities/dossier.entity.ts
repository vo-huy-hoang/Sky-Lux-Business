import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { BusinessLine } from '../../master-data/entities/business-line.entity';
import { MarketType } from '../../master-data/entities/market-type.entity';
import { User } from '../../users/entities/user.entity';
import { DossierPassenger } from './dossier-passenger.entity';
import { Estimate } from '../../estimates/entities/estimate.entity';
import { Conversation } from '../../chat/entities/conversation.entity';
import { DossierStatus, PriorityLevel } from '../../../common/enums';

@Entity('dossiers')
@Index('idx_dossiers_org_status', ['organizationId', 'status'])
@Index('idx_dossiers_org_sales_period', [
  'organizationId',
  'salesUserId',
  'revenueRecognitionDate',
])
@Index('idx_dossiers_org_created', ['organizationId', 'createdAt'])
@Index('idx_dossiers_org_sales_created', [
  'organizationId',
  'salesUserId',
  'createdAt',
])
export class Dossier extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  // Preserve the customer name from the source dossier/import. The related
  // customer is a shared master record and may be edited independently.
  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  customerName?: string;

  @Column({ name: 'business_line_id', type: 'uuid', nullable: true })
  businessLineId?: string;

  @Column({ name: 'market_type_id', type: 'uuid', nullable: true })
  marketTypeId?: string;

  // Snapshot the labels from the imported workbook. These values intentionally
  // do not depend on the optional master-data foreign keys above.
  @Column({
    name: 'business_line_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  businessLineName?: string;

  @Column({
    name: 'market_type_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  marketTypeName?: string;

  @Column({ name: 'sales_user_id', type: 'uuid', nullable: true })
  salesUserId?: string;

  @Column({ name: 'operator_user_id', type: 'uuid', nullable: true })
  operatorUserId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  route?: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({
    name: 'tour_duration',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  tourDuration?: string;

  @Column({ name: 'revenue_recognition_date', type: 'date', nullable: true })
  revenueRecognitionDate?: string;

  @Column({
    type: 'enum',
    enum: DossierStatus,
    default: DossierStatus.DRAFT,
  })
  status: DossierStatus;

  @Column({
    type: 'enum',
    enum: PriorityLevel,
    default: PriorityLevel.MEDIUM,
  })
  priority: PriorityLevel;

  @VersionColumn({ default: 1 })
  version: number;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date;

  @Column({ name: 'locked_by', type: 'uuid', nullable: true })
  lockedBy?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => BusinessLine, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'business_line_id' })
  businessLine?: BusinessLine;

  @ManyToOne(() => MarketType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'market_type_id' })
  marketType?: MarketType;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sales_user_id' })
  salesUser?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'operator_user_id' })
  operatorUser?: User;

  @OneToMany(() => DossierPassenger, (passenger) => passenger.dossier, {
    cascade: true,
  })
  passengers: DossierPassenger[];

  @OneToMany(() => Estimate, (estimate) => estimate.dossier)
  estimates: Estimate[];

  @OneToMany(() => Conversation, (conversation) => conversation.dossier)
  conversations: Conversation[];
}
