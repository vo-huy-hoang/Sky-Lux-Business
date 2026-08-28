import {
  Controller,
  Get,
  Post,
  Delete,
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
import { AddParticipantsDto } from './dto/add-participants.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationMember } from './entities/conversation-member.entity';

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

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Xóa/Thu hồi tin nhắn' })
  @ApiParam({ name: 'id', description: 'ID tin nhắn (UUID)' })
  @ApiResponse({ status: 200, description: 'Xóa tin nhắn thành công' })
  deleteMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.chatService.deleteMessage(user, id);
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

  @Post('conversations/:id/read')
  @ApiOperation({
    summary:
      'Đánh dấu đã đọc tin nhắn trong cuộc hội thoại (API-PARTICIPANT-001)',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({ status: 200, description: 'Đánh dấu đã đọc thành công' })
  markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkReadDto,
  ): Promise<any> {
    return this.chatService.markAsRead(id, dto, user);
  }

  @Get('conversations/:id/participants')
  @ApiOperation({
    summary:
      'Lấy danh sách thành viên trong cuộc hội thoại (API-PARTICIPANT-002)',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành viên thành công',
  })
  getParticipants(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationMember[]> {
    return this.chatService.getParticipants(id, user);
  }

  @Post('conversations/:id/participants')
  @ApiOperation({
    summary: 'Thêm thành viên vào cuộc hội thoại nhóm (API-PARTICIPANT-003)',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiResponse({ status: 200, description: 'Thêm thành viên thành công' })
  addParticipants(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParticipantsDto,
  ): Promise<any> {
    return this.chatService.addParticipants(id, dto, user);
  }

  @Delete('conversations/:id/participants/:userId')
  @ApiOperation({
    summary:
      'Xóa thành viên hoặc tự rời khỏi cuộc hội thoại (API-PARTICIPANT-004)',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại (UUID)' })
  @ApiParam({ name: 'userId', description: 'ID người dùng cần xóa (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Xóa/Rời khỏi thành viên thành công',
  })
  removeParticipant(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    return this.chatService.removeParticipant(id, userId, user);
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
