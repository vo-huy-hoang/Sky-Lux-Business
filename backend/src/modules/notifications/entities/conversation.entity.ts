import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import { User } from '../../users/entities/user.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { Message } from './message.entity';
import { ConversationType } from '../../../common/enums';

@Entity('conversations')
@Index('idx_conversations_org_last_msg', ['organizationId', 'lastMessageAt'])
export class Conversation extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string;

  @Column({ name: 'dossier_id', type: 'uuid', nullable: true })
  dossierId?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt?: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Dossier, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'dossier_id' })
  dossier?: Dossier;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation, { cascade: true })
  participants: ConversationParticipant[];

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages: Message[];
}
