import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('supplier_types')
export class SupplierType extends BaseCatalogEntity {}
