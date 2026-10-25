import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ImportSession } from './import-session.entity';

@Entity('import_rows')
export class ImportRow extends BaseEntity {
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({
    name: 'sheet_name',
    type: 'varchar',
    length: 100,
    default: 'Sheet1',
  })
  sheetName: string;

  @Index()
  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'raw_data', type: 'jsonb', default: {} })
  rawData: Record<string, any>;

  @Column({ name: 'normalized_data', type: 'jsonb', nullable: true })
  normalizedData?: Record<string, any>;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: string;

  @ManyToOne(() => ImportSession, (session) => session.rows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: ImportSession;
}
