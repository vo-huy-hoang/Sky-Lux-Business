import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('supplier_types')
@Index('uq_supplier_types_system_code', ['code'], {
  unique: true,
  where: 'organization_id IS NULL',
})
@Index('uq_supplier_types_org_code', ['organizationId', 'code'], {
  unique: true,
  where: 'organization_id IS NOT NULL',
})
export class SupplierType extends BaseCatalogEntity {
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization | null;
}
