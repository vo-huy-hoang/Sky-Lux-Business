import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'dossier_id', type: 'uuid', nullable: true })
  dossierId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({ name: 'is_group', type: 'boolean', default: false })
  isGroup: boolean;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'dossier_id' })
  dossier?: Dossier;

  @OneToMany(() => ConversationMember, (member) => member.conversation, {
    cascade: true,
  })
  members: ConversationMember[];

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];
}
