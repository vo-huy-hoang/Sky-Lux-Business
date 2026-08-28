import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  MessageEvent,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ChatService {
  private readonly chatEvent$ = new Subject<{
    type: 'message.created' | 'message.deleted';
    organizationId: string;
    conversationId: string;
    data: any;
  }>();

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepository: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  /**
   * Lấy danh sách cuộc hội thoại của user
   */
  async findConversations(user: CurrentUserPayload): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        'conversation.members',
        'm',
        'm.user_id = :userId AND m.organization_id = :organizationId',
        { userId: user.id, organizationId: user.organizationId },
      )
      .leftJoinAndSelect('conversation.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('conversation.dossier', 'dossier')
      .where('conversation.organizationId = :organizationId', {
        organizationId: user.organizationId,
      })
      .orderBy('conversation.updatedAt', 'DESC')
      .getMany();
  }

  /**
   * Lấy thông tin chi tiết một cuộc hội thoại (kiểm tra quyền truy cập)
   */
  async findConversation(
    user: CurrentUserPayload,
    id: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: {
        members: { user: true },
        dossier: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    const isMember = conversation.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không phải thành viên cuộc hội thoại này',
      );
    }

    return conversation;
  }

  /**
   * Tạo cuộc hội thoại mới
   */
  async createConversation(
    user: CurrentUserPayload,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      organizationId: user.organizationId,
      name: dto.name,
      isGroup: dto.isGroup ?? false,
      dossierId: dto.dossierId,
    });

    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Thêm các thành viên vào cuộc hội thoại
    const members = dto.userIds.map((userId) =>
      this.memberRepository.create({
        organizationId: user.organizationId,
        conversationId: savedConversation.id,
        userId,
      }),
    );

    // Luôn thêm chính người tạo phòng vào hội thoại nếu chưa có
    if (!dto.userIds.includes(user.id)) {
      members.push(
        this.memberRepository.create({
          organizationId: user.organizationId,
          conversationId: savedConversation.id,
          userId: user.id,
        }),
      );
    }

    await this.memberRepository.save(members);

    const result = await this.findConversation(user, savedConversation.id);
    return result;
  }

  /**
   * Lấy hội thoại liên kết với Dossier
   */
  async findDossierConversation(
    user: CurrentUserPayload,
    dossierId: string,
  ): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { dossierId, organizationId: user.organizationId },
      relations: {
        members: { user: true },
        dossier: true,
      },
    });

    if (!conversation) {
      return null;
    }

    const isMember = conversation.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không phải thành viên cuộc hội thoại này',
      );
    }

    return conversation;
  }

  /**
   * Lấy danh sách tin nhắn của một cuộc hội thoại
   */
  async findMessages(
    user: CurrentUserPayload,
    conversationId: string,
  ): Promise<Message[]> {
    // Xác thực quyền truy cập hội thoại trước
    await this.findConversation(user, conversationId);

    return this.messageRepository.find({
      where: { conversationId, organizationId: user.organizationId },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Gửi tin nhắn vào cuộc hội thoại
   */
  async sendMessage(
    user: CurrentUserPayload,
    conversationId: string,
    content: string,
  ): Promise<Message> {
    // Xác thực quyền truy cập hội thoại trước
    await this.findConversation(user, conversationId);

    const message = this.messageRepository.create({
      organizationId: user.organizationId,
      conversationId,
      senderId: user.id,
      content,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Cập nhật mốc thời gian hoạt động cuối cùng của phòng chat
    await this.conversationRepository.update(conversationId, {
      updatedAt: new Date(),
    });

    const fullMessage = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: { sender: true },
    });

    if (!fullMessage) {
      throw new NotFoundException('Không thể gửi tin nhắn');
    }

    // Đẩy sự kiện tin nhắn mới vào luồng SSE
    this.chatEvent$.next({
      type: 'message.created',
      organizationId: fullMessage.organizationId,
      conversationId: fullMessage.conversationId,
      data: fullMessage,
    });

    return fullMessage;
  }

  /**
   * Xóa/Thu hồi tin nhắn
   */
  async deleteMessage(user: CurrentUserPayload, id: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id, organizationId: user.organizationId },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn');
    }

    // Kiểm tra quyền: Chỉ người gửi mới được xóa tin nhắn của chính mình
    if (message.senderId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xóa tin nhắn này');
    }

    await this.messageRepository.delete(id);

    // Đẩy sự kiện xóa tin nhắn vào luồng SSE
    this.chatEvent$.next({
      type: 'message.deleted',
      organizationId: message.organizationId,
      conversationId: message.conversationId,
      data: { id: message.id, conversationId: message.conversationId },
    });
  }

  /**
   * Đăng ký luồng tin nhắn thời gian thực cho một User cụ thể
   */
  getMessagesStream(user: CurrentUserPayload): Observable<MessageEvent> {
    return this.chatEvent$.asObservable().pipe(
      filter((evt) => evt.organizationId === user.organizationId),
      mergeMap(async (evt) => {
        const isMember = await this.isMember(user.id, evt.conversationId);
        return { evt, isMember };
      }),
      filter(({ isMember }) => isMember),
      map(({ evt }) => ({
        data: {
          type: evt.type,
          payload: evt.data,
        },
      })),
    );
  }

  /**
   * Helper kiểm tra xem User có phải thành viên cuộc hội thoại không
   */
  async isMember(userId: string, conversationId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { userId, conversationId },
    });
    return !!member;
  }
}
