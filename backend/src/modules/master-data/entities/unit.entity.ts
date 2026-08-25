import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('units')
export class Unit extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol?: string;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVE' })
  status: string;
}
