import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

export abstract class BaseCatalogEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
