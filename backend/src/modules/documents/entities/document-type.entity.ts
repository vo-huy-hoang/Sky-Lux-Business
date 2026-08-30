import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('document_types')
export class DocumentType extends BaseCatalogEntity {}
