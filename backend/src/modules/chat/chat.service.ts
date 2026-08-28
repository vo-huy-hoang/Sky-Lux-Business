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
  private readonly message$ = new Subject<Message>();

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
      throw new NotFoundException(
        `Không tìm thấy cuộc hội thoại với ID "${id}"`,
      );
    }

    const isMember = conversation.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không có quyền tham gia cuộc hội thoại này',
      );
    }

    return conversation;
  }

  /**
   * Lấy lịch sử tin nhắn của cuộc hội thoại
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

    const savedConv = await this.conversationRepository.save(conversation);

    // Gom nhóm danh sách thành viên (người tạo luôn luôn được thêm vào)
    const memberUserIds = Array.from(new Set([user.id, ...dto.userIds]));

    const members = memberUserIds.map((uid) =>
      this.memberRepository.create({
        organizationId: user.organizationId,
        conversationId: savedConv.id,
        userId: uid,
      }),
    );

    await this.memberRepository.save(members);

    return this.findConversation(user, savedConv.id);
  }

  /**
   * Lấy cuộc hội thoại gắn với hồ sơ tour
   */
  async findDossierConversation(
    user: CurrentUserPayload,
    dossierId: string,
  ): Promise<Conversation | null> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.members', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where('conversation.dossierId = :dossierId', { dossierId })
      .andWhere('conversation.organizationId = :organizationId', {
        organizationId: user.organizationId,
      })
      .getOne();
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
    this.message$.next(fullMessage);

    return fullMessage;
  }

  /**
   * Đăng ký luồng tin nhắn thời gian thực cho một User cụ thể
   */
  getMessagesStream(user: CurrentUserPayload): Observable<MessageEvent> {
    return this.message$.asObservable().pipe(
      filter((msg) => msg.organizationId === user.organizationId),
      mergeMap(async (msg) => {
        const isMember = await this.isMember(user.id, msg.conversationId);
        return { msg, isMember };
      }),
      filter(({ isMember }) => isMember),
      map(({ msg }) => ({
        data: msg,
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
