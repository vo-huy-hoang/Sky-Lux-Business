import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { Estimate } from '../../estimates/entities/estimate.entity';
import { User } from '../../users/entities/user.entity';
import { ApprovalStatus } from '../../../common/enums';

@Entity('approval_requests')
@Index('idx_approvals_reviewer_status', ['organizationId', 'reviewerUserId', 'status'])
export class ApprovalRequest extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Column({ name: 'estimate_id', type: 'uuid' })
  estimateId: string;

  @Column({ name: 'step_no', type: 'int', default: 1 })
  stepNo: number;

  @Column({ name: 'step_code', type: 'varchar', length: 50 })
  stepCode: string;

  @Column({ name: 'reviewer_user_id', type: 'uuid', nullable: true })
  reviewerUserId?: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => Estimate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estimate_id' })
  estimate: Estimate;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewer_user_id' })
  reviewer?: User;
}
