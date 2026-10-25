import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from './dossier.entity';
import { User } from '../../users/entities/user.entity';
import {
  PaymentDirection,
  PaymentStatus,
  PaymentMethod,
} from '../../../common/enums';

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Index()
  @Column({
    name: 'payment_direction',
    type: 'enum',
    enum: PaymentDirection,
  })
  paymentDirection: PaymentDirection;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: string;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.BANK_TRANSFER,
  })
  paymentMethod: PaymentMethod;

  @Column({
    name: 'reference_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  referenceCode?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;
}
