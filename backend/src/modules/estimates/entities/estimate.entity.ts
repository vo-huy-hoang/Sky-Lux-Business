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
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { User } from '../../users/entities/user.entity';
import { EstimateRevenueLine } from './estimate-revenue-line.entity';
import { EstimateCostLine } from './estimate-cost-line.entity';
import { EstimateStatus } from '../../../common/enums';

@Entity('estimates')
export class Estimate extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Column({ name: 'version_no', type: 'int', default: 1 })
  versionNo: number;

  @Index()
  @Column({
    type: 'enum',
    enum: EstimateStatus,
    default: EstimateStatus.DRAFT,
  })
  status: EstimateStatus;

  @Column({ name: 'source_import_session_id', type: 'uuid', nullable: true })
  sourceImportSessionId?: string;

  @Column({ name: 'parent_estimate_id', type: 'uuid', nullable: true })
  parentEstimateId?: string;

  @Column({ type: 'varchar', length: 10, default: 'VND' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy?: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, (dossier) => dossier.estimates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'submitted_by' })
  submitter?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @OneToMany(() => EstimateRevenueLine, (line) => line.estimate, {
    cascade: true,
  })
  revenueLines: EstimateRevenueLine[];

  @OneToMany(() => EstimateCostLine, (line) => line.estimate, { cascade: true })
  costLines: EstimateCostLine[];
}
