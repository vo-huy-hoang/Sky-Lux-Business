import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('organization_settings')
export class OrganizationSetting extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index('idx_org_settings_key')
  @Column({ type: 'varchar', length: 150 })
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: any;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
