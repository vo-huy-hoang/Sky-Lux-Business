import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from './organization.entity';

@Entity('organization_settings')
export class OrganizationSetting extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, any>;

  @ManyToOne(() => Organization, (org) => org.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
