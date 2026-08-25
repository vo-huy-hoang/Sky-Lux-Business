import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { Estimate } from '../../estimates/entities/estimate.entity';
import { DocumentType } from './document-type.entity';
import { DocumentVersion } from './document-version.entity';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid', nullable: true })
  dossierId?: string;

  @Column({ name: 'estimate_id', type: 'uuid', nullable: true })
  estimateId?: string;

  @Column({ name: 'document_type_id', type: 'uuid', nullable: true })
  documentTypeId?: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'object_key', type: 'text' })
  objectKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  checksum?: string;

  @Column({ name: 'version_no', type: 'int', default: 1 })
  versionNo: number;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy?: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dossier_id' })
  dossier?: Dossier;

  @ManyToOne(() => Estimate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'estimate_id' })
  estimate?: Estimate;

  @ManyToOne(() => DocumentType, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'document_type_id' })
  documentType?: DocumentType;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User;

  @OneToMany(() => DocumentVersion, (ver) => ver.document, { cascade: true })
  versions: DocumentVersion[];
}
