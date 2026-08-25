import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ImportSession } from './import-session.entity';
import { ImportErrorSeverity } from '../../../common/enums';

@Entity('import_errors')
export class ImportError extends BaseEntity {
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'row_number', type: 'int' })
  rowNumber: number;

  @Column({ name: 'column_name', type: 'varchar', length: 100, nullable: true })
  columnName?: string;

  @Column({ name: 'error_code', type: 'varchar', length: 100 })
  errorCode: string;

  @Column({ name: 'error_message', type: 'text' })
  errorMessage: string;

  @Column({
    type: 'enum',
    enum: ImportErrorSeverity,
    default: ImportErrorSeverity.ERROR,
  })
  severity: ImportErrorSeverity;

  @ManyToOne(() => ImportSession, (session) => session.errors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ImportSession;
}
