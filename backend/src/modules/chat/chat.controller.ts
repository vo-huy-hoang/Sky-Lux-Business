import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Sse,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Public } from '../../common/decorators/public.decorator';
import { JwtQueryAuthGuard } from '../../common/guards/jwt-query-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@Controller()
@RequirePermissions('chat.access')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách các cuộc hội thoại (API-CHAT-001)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findConversations(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Conversation[]> {
    return this.chatService.findConversations(user);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo cuộc hội thoại mới (API-CHAT-002)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  createConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateConversationDto,
  ): Promise<Conversation> {
    return this.chatService.createConversation(user, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một cuộc hội thoại (API-CHAT-003)' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Conversation> {
    return this.chatService.findConversation(user, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({ status: 200, description: 'Lấy tin nhắn thành công' })
  findMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Message[]> {
    return this.chatService.findMessages(user, id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn vào cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({ status: 201, description: 'Gửi tin nhắn thành công' })
  sendMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ): Promise<Message> {
    return this.chatService.sendMessage(user, id, dto.content);
  }

  @Get('dossiers/:dossierId/conversation')
  @ApiOperation({ summary: 'Lấy hội thoại gắn liền với hồ sơ (API-CHAT-004)' })
  @ApiParam({ name: 'dossierId', description: 'ID Hồ sơ (UUID)' })
  @ApiResponse({ status: 200, description: 'Lấy hội thoại thành công' })
  findDossierConversation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('dossierId', ParseUUIDPipe) dossierId: string,
  ): Promise<Conversation | null> {
    return this.chatService.findDossierConversation(user, dossierId);
  }

  @Sse('conversations/stream')
  @Public()
  @UseGuards(JwtQueryAuthGuard)
  @ApiOperation({
    summary: 'Mở kết nối thời gian thực nhận tin nhắn mới (SSE)',
  })
  @ApiResponse({ status: 200, description: 'Luồng dữ liệu EventSource' })
  streamMessages(
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<MessageEvent> {
    return this.chatService.getMessagesStream(user);
  }
}
