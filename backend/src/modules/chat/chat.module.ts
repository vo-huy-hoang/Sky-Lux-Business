import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { ChatService } from './chat.service';
import { ChatPubSubService } from './chat-pubsub.service';
import { ChatController } from './chat.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMember,
      Message,
      User,
      Dossier,
    ]),
    AuthModule,
    StorageModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatPubSubService],
  exports: [ChatService, ChatPubSubService],
})
export class ChatModule {}
