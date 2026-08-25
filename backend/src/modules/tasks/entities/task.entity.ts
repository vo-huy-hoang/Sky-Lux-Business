import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { User } from '../../users/entities/user.entity';
import { TaskChecklistItem } from './task-checklist-item.entity';
import { TaskStatus, PriorityLevel } from '../../../common/enums';

@Entity('tasks')
@Index('idx_tasks_assignee_status_due', ['organizationId', 'assignedTo', 'status', 'dueAt'])
export class Task extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid', nullable: true })
  dossierId?: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo?: string;

  @Column({
    type: 'enum',
    enum: PriorityLevel,
    default: PriorityLevel.MEDIUM,
  })
  priority: PriorityLevel;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({ name: 'start_at', type: 'timestamptz', nullable: true })
  startAt?: Date;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dossier_id' })
  dossier?: Dossier;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee?: User;

  @OneToMany(() => TaskChecklistItem, (item) => item.task, { cascade: true })
  checklistItems: TaskChecklistItem[];
}
