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

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 30,
    default: 'DIRECT',
    transformer: {
      to: (value: boolean | undefined) => (value ? 'GROUP' : 'DIRECT'),
      from: (value: string) => value === 'GROUP',
    },
  })
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

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date;

  @OneToMany(() => ConversationMember, (member) => member.conversation, {
    cascade: true,
  })
  members: ConversationMember[];

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];
}
