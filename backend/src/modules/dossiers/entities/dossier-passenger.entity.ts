import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from './dossier.entity';
import { PassengerType } from '../../master-data/entities/passenger-type.entity';

@Entity('dossier_passengers')
export class DossierPassenger extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid' })
  dossierId: string;

  @Column({ name: 'passenger_type_id', type: 'uuid', nullable: true })
  passengerTypeId?: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender?: string;

  @Column({ name: 'passport_number', type: 'varchar', length: 50, nullable: true })
  passportNumber?: string;

  @Column({ name: 'passport_expiry', type: 'date', nullable: true })
  passportExpiry?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nationality?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, (dossier) => dossier.passengers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dossier_id' })
  dossier: Dossier;

  @ManyToOne(() => PassengerType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'passenger_type_id' })
  passengerType?: PassengerType;
}
