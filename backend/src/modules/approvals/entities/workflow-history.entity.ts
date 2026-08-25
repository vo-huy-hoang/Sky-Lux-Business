import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { Estimate } from '../../estimates/entities/estimate.entity';
import { User } from '../../users/entities/user.entity';

@Entity('workflow_history')
export class WorkflowHistory extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Column({ name: 'estimate_id', type: 'uuid', nullable: true })
  estimateId?: string;

  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true })
  fromStatus?: string;

  @Column({ name: 'to_status', type: 'varchar', length: 50 })
  toStatus: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId?: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => Estimate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'estimate_id' })
  estimate?: Estimate;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor?: User;
}
