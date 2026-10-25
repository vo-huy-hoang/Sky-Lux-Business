import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('market_types')
export class MarketType extends BaseCatalogEntity {}
