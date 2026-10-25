import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('import_templates')
export class ImportTemplate extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    name: 'template_type',
    type: 'varchar',
    length: 50,
    default: 'ESTIMATE',
  })
  templateType: string;

  @Column({ name: 'mapping_config', type: 'jsonb', default: {} })
  mappingConfig: Record<string, any>;

  @Column({ name: 'sample_file_url', type: 'text', nullable: true })
  sampleFileUrl?: string;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
