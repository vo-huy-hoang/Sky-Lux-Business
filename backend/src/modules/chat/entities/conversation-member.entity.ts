import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({
    name: 'joined_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  joinedAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
