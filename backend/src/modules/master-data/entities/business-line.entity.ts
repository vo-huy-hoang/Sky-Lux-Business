import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('business_lines')
export class BusinessLine extends BaseCatalogEntity {}
