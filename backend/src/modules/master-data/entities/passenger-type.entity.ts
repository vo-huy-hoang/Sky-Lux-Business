import { Entity } from 'typeorm';
import { BaseCatalogEntity } from '../../../common/entities/catalog.entity';

@Entity('passenger_types')
export class PassengerType extends BaseCatalogEntity {}
