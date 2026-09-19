import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { User } from '../../users/entities/user.entity';

export enum DossierChangeRequestStatus {
  OPEN = 'OPEN',
  RESPONDED = 'RESPONDED',
}

@Entity('dossier_change_requests')
@Index('idx_change_requests_dossier_status', [
  'organizationId',
  'dossierId',
  'status',
])
export class DossierChangeRequest extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ name: 'responded_by', type: 'uuid', nullable: true })
  respondedBy?: string;

  @Column({ name: 'request_text', type: 'text' })
  requestText: string;

  @Column({ name: 'response_text', type: 'text', nullable: true })
  responseText?: string;

  @Column({
    type: 'enum',
    enum: DossierChangeRequestStatus,
    default: DossierChangeRequestStatus.OPEN,
  })
  status: DossierChangeRequestStatus;

  @Column({
    name: 'requested_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  requestedAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt?: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_by' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'responded_by' })
  responder?: User;
}
