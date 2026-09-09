import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('service_categories')
export class ServiceCategory extends BaseCatalogEntity {}
