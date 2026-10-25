import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  MessageEvent,
  Optional,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Not, MoreThan } from 'typeorm';
import * as path from 'path';
import * as crypto from 'crypto';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message, ChatAttachmentPayload } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

import { AddParticipantsDto } from './dto/add-participants.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { User } from '../users/entities/user.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { toPublicUser } from '../../common/utils/public-user';
import { RedisService } from '../../common/redis/redis.service';
import { StorageService } from '../../shared/storage/storage.service';
import { sanitizeFileName } from '../../common/utils/filename.util';
import { ChatPubSubService, ChatEventType } from './chat-pubsub.service';

@Injectable()
export class ChatService {
  private readonly memoryIdempotency = new Map<
    string,
    { message: Message; timestamp: number }
  >();

  private readonly membershipCache = new Map<
    string,
    { memberIds: Set<string>; expiresAt: number }
  >();

  private readonly chatEvent$ = new Subject<{
    type:
      | 'message.created'
      | 'message.deleted'
      | 'message.read'
      | 'member.joined'
      | 'member.left'
      | 'typing.start'
      | 'typing.stop'
      | 'unread_count'
      | 'conversation.updated';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @Optional()
    private readonly redisService?: RedisService,
    @Optional()
    private readonly storageService?: StorageService,
    @Optional()
    private readonly chatPubSubService?: ChatPubSubService,
  ) {}

  private emitChatEvent(event: {
    type: ChatEventType;
    organizationId: string;
    conversationId: string;
    data: any;
  }): void {
    if (this.chatPubSubService) {
      this.chatPubSubService.publish(event).catch(() => {});
    } else {
      this.chatEvent$.next(event);
    }
  }

  /**
   * Lấy danh sách cuộc hội thoại của user
   */
  async findConversations(user: CurrentUserPayload): Promise<Conversation[]> {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        'conversation.members',
        'm',
        'm.userId = :userId AND m.organizationId = :organizationId',
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

    return conversations.map((conversation) =>
      this.sanitizeConversation(conversation),
    );
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

    const isMember =
      conversation.members?.some((m) => m.userId === user.id) || false;
    if (!isMember) {
      throw new ForbiddenException(
        'Bạn không phải thành viên cuộc hội thoại này',
      );
    }

    return this.sanitizeConversation(conversation);
  }

  /**
   * Tạo cuộc hội thoại mới
   */
  async createConversation(
    user: CurrentUserPayload,
    dto: CreateConversationDto,
  ): Promise<Conversation> {
    const participantIds = [...new Set([...dto.userIds, user.id])];
    await this.ensureUsersInOrganization(participantIds, user.organizationId);

    if (dto.dossierId) {
      const dossier = await this.dossierRepository.findOne({
        where: { id: dto.dossierId, organizationId: user.organizationId },
      });
      if (!dossier) {
        throw new BadRequestException(
          'Hồ sơ tour không tồn tại hoặc không thuộc tổ chức của bạn',
        );
      }
    }

    const conversation = this.conversationRepository.create({
      organizationId: user.organizationId,
      name: dto.name,
      isGroup: dto.isGroup ?? false,
      dossierId: dto.dossierId,
      createdBy: user.id,
    });

    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Thêm các thành viên vào cuộc hội thoại
    const members = participantIds.map((userId) =>
      this.memberRepository.create({
        organizationId: user.organizationId,
        conversationId: savedConversation.id,
        userId,
      }),
    );

    await this.memberRepository.save(members);

    // Nạp sẵn danh sách thành viên vào bộ đệm O(1)
    this.membershipCache.set(`${user.organizationId}:${savedConversation.id}`, {
      memberIds: new Set(participantIds),
      expiresAt: Date.now() + 600000,
    });

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

    return this.sanitizeConversation(conversation);
  }

  /**
   * Lấy danh sách tin nhắn của một cuộc hội thoại (Hỗ trợ phân trang limit & before cursor)
   */
  async findMessages(
    user: CurrentUserPayload,
    conversationId: string,
    limit?: number,
    before?: string,
  ): Promise<Message[]> {
    // 1. Xác thực quyền truy cập hội thoại trước (sử dụng O(1) membership cache)
    const isAllowed = await this.isMember(
      user.id,
      conversationId,
      user.organizationId,
    );
    if (!isAllowed) {
      await this.findConversation(user, conversationId);
    }

    const safeLimit = Math.min(Math.max(Number(limit || 30), 1), 100);

    // Nếu TypeORM repository hỗ trợ createQueryBuilder
    if (typeof this.messageRepository.createQueryBuilder === 'function') {
      const qb = this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .where('message.conversationId = :conversationId', { conversationId })
        .andWhere('message.organizationId = :organizationId', {
          organizationId: user.organizationId,
        });

      if (before) {
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            before,
          );
        if (isUUID) {
          const refMessage = await this.messageRepository.findOne({
            where: {
              id: before,
              conversationId,
              organizationId: user.organizationId,
            },
            select: { id: true, createdAt: true },
          });
          if (refMessage) {
            qb.andWhere('message.createdAt < :beforeDate', {
              beforeDate: refMessage.createdAt,
            });
          }
        } else {
          const parsedDate = new Date(before);
          if (!isNaN(parsedDate.getTime())) {
            qb.andWhere('message.createdAt < :beforeDate', {
              beforeDate: parsedDate,
            });
          }
        }
      }

      const messages = await qb
        .orderBy('message.createdAt', 'DESC')
        .take(safeLimit)
        .getMany();

      messages.reverse();
      return (messages || []).map((message) => this.sanitizeMessage(message));
    }

    // Fallback cho môi trường test mock find() trực tiếp
    const messages = await this.messageRepository.find({
      where: { conversationId, organizationId: user.organizationId },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
      take: safeLimit,
    });

    return (messages || []).map((message) => this.sanitizeMessage(message));
  }

  /**
   * Tải lên tệp đính kèm / hình ảnh cho tin nhắn chat
   */
  async uploadAttachment(
    user: CurrentUserPayload,
    file: Express.Multer.File,
  ): Promise<ChatAttachmentPayload> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp đính kèm');
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Dung lượng tệp đính kèm không được vượt quá 15MB',
      );
    }

    const BLOCKED_EXTENSIONS = new Set([
      '.exe',
      '.bat',
      '.cmd',
      '.sh',
      '.ps1',
      '.msi',
      '.vbs',
      '.js',
      '.scr',
      '.jar',
      '.com',
      '.pif',
      '.dll',
      '.app',
      '.dmg',
      '.bin',
      '.iso',
      '.apk',
      '.htm',
      '.html',
      '.php',
      '.asp',
      '.aspx',
      '.cgi',
    ]);

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        'Định dạng tệp này không được phép tải lên vì lý do bảo mật',
      );
    }

    if (!this.storageService) {
      throw new BadRequestException('Dịch vụ lưu trữ chưa sẵn sàng');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeName = sanitizeFileName(file.originalname) || `file${ext}`;
    const uniqueFileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
    const objectKey = `chat/${user.organizationId}/${year}/${month}/${uniqueFileName}`;

    const result = await this.storageService.uploadFile(
      {
        buffer: file.buffer,
        originalname: safeName,
        mimetype: file.mimetype,
        size: file.size,
      },
      objectKey,
    );

    const fileUrl = result.publicUrl || `/uploads/${objectKey}`;
    const isImage = file.mimetype.startsWith('image/');

    return {
      url: fileUrl,
      originalName: safeName,
      fileSize: file.size,
      mimeType: file.mimetype,
      thumbnailUrl: isImage ? fileUrl : undefined,
    };
  }

  /**
   * Gửi tin nhắn vào cuộc hội thoại (Hỗ trợ Idempotency Key chống lưu trùng)
   */
  async sendMessage(
    user: CurrentUserPayload,
    conversationId: string,
    content: string,
    clientMessageId?: string,
    attachments?: ChatAttachmentPayload[],
  ): Promise<Message> {
    const trimmedContent = (content || '').trim();
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!trimmedContent && !hasAttachments) {
      throw new BadRequestException(
        'Tin nhắn phải có nội dung văn bản hoặc tệp đính kèm',
      );
    }

    // 1. Kiểm tra Idempotency Key chống gửi trùng tin nhắn
    if (clientMessageId) {
      const cacheKey = `idempotency:chat:${user.organizationId}:${clientMessageId}`;
      const memoryHit = this.memoryIdempotency.get(cacheKey);
      if (memoryHit && Date.now() - memoryHit.timestamp < 120000) {
        return memoryHit.message;
      }
      if (this.redisService) {
        const redisHit = await this.redisService.get<Message>(cacheKey);
        if (redisHit) {
          this.memoryIdempotency.set(cacheKey, {
            message: redisHit,
            timestamp: Date.now(),
          });
          return redisHit;
        }
      }
    }

    // Xác thực quyền truy cập hội thoại trước và lấy danh sách thành viên
    const conversation = await this.findConversation(user, conversationId);

    const message = this.messageRepository.create({
      organizationId: user.organizationId,
      conversationId,
      senderId: user.id,
      content: content || '',
      attachments: hasAttachments ? attachments : null,
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

    this.sanitizeMessage(fullMessage);

    // Lưu kết quả vào Idempotency Cache (120s)
    if (clientMessageId) {
      const cacheKey = `idempotency:chat:${user.organizationId}:${clientMessageId}`;
      this.memoryIdempotency.set(cacheKey, {
        message: fullMessage,
        timestamp: Date.now(),
      });
      if (this.redisService) {
        await this.redisService.set(cacheKey, fullMessage, 120);
      }
    }

    // Đẩy sự kiện tin nhắn mới vào luồng SSE (Đa máy chủ qua Redis Pub/Sub)
    this.emitChatEvent({
      type: 'message.created',
      organizationId: fullMessage.organizationId,
      conversationId: fullMessage.conversationId,
      data: fullMessage,
    });

    // Phát unread_count cho các thành viên khác trong cuộc hội thoại
    if (conversation && conversation.members) {
      for (const member of conversation.members) {
        if (member.userId !== user.id) {
          this.broadcastUnreadCount(member.userId, user.organizationId).catch(
            (err) => console.error('Lỗi khi gửi unread_count:', err),
          );
        }
      }
    }

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

    // Đẩy sự kiện xóa tin nhắn vào luồng SSE (Đa máy chủ qua Redis Pub/Sub)
    this.emitChatEvent({
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
    const source$ = this.chatPubSubService
      ? this.chatPubSubService.getEventStream()
      : this.chatEvent$.asObservable();

    return source$.pipe(
      filter((evt) => evt.organizationId === user.organizationId),
      mergeMap(async (evt) => {
        // Cho phép nhận unread_count nếu đúng là cho user này
        if (evt.type === 'unread_count' && evt.data?.userId === user.id) {
          return { evt, isAllowed: true };
        }
        // Kiểm tra xem có phải thành viên cuộc hội thoại không
        const isMember = await this.isMember(
          user.id,
          evt.conversationId,
          user.organizationId,
        );
        return { evt, isAllowed: isMember };
      }),
      filter(({ isAllowed }) => isAllowed),
      map(({ evt }) => ({
        data: {
          type: evt.type,
          payload: evt.data,
        },
      })),
    );
  }
  /**
   * Đánh dấu đã đọc tin nhắn
   */
  async markAsRead(
    conversationId: string,
    payload: MarkReadDto,
    user: CurrentUserPayload,
  ): Promise<any> {
    const member = await this.memberRepository.findOne({
      where: {
        userId: user.id,
        conversationId,
        organizationId: user.organizationId,
      },
    });
    if (!member) {
      throw new ForbiddenException(
        'Bạn không phải là thành viên hội thoại này',
      );
    }

    let lastReadMessageId = payload.messageId;
    if (!lastReadMessageId) {
      // Tìm tin nhắn mới nhất trong cuộc trò chuyện
      const latestMessage = await this.messageRepository.findOne({
        where: { conversationId, organizationId: user.organizationId },
        order: { createdAt: 'DESC' },
      });
      if (latestMessage) {
        lastReadMessageId = latestMessage.id;
      }
    }

    member.lastReadMessageId = lastReadMessageId;
    member.lastReadAt = new Date();
    await this.memberRepository.save(member);

    // Phát sự kiện SSE (Đa máy chủ qua Redis Pub/Sub)
    if (lastReadMessageId) {
      this.emitChatEvent({
        type: 'message.read',
        organizationId: user.organizationId,
        conversationId,
        data: {
          conversationId,
          userId: user.id,
          messageId: lastReadMessageId,
          readAt: member.lastReadAt,
        },
      });
    }

    // Đẩy unread_count mới của user
    this.broadcastUnreadCount(user.id, user.organizationId).catch((err) =>
      console.error('Lỗi khi gửi unread_count:', err),
    );

    return { success: true };
  }

  /**
   * Lấy danh sách thành viên trong cuộc hội thoại
   */
  async getParticipants(
    conversationId: string,
    user: CurrentUserPayload,
  ): Promise<ConversationMember[]> {
    const isMember = await this.isMember(
      user.id,
      conversationId,
      user.organizationId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
    }

    const participants = await this.memberRepository.find({
      where: { conversationId, organizationId: user.organizationId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
    });

    return participants.map((participant) => {
      participant.user = toPublicUser(
        participant.user,
      ) as typeof participant.user;
      return participant;
    });
  }

  /**
   * Thêm thành viên vào cuộc hội thoại
   */
  async addParticipants(
    conversationId: string,
    payload: AddParticipantsDto,
    user: CurrentUserPayload,
  ): Promise<any> {
    const isMember = await this.isMember(
      user.id,
      conversationId,
      user.organizationId,
    );
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
    }

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, organizationId: user.organizationId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    if (!conversation.isGroup) {
      throw new ForbiddenException(
        'Không thể thêm thành viên vào cuộc hội thoại cá nhân. Hãy tạo nhóm chat mới.',
      );
    }

    await this.ensureUsersInOrganization(payload.userIds, user.organizationId);

    const addedMembers: ConversationMember[] = [];
    for (const memberId of payload.userIds) {
      // Kiểm tra xem đã là thành viên chưa
      const existing = await this.memberRepository.findOne({
        where: {
          userId: memberId,
          conversationId,
          organizationId: user.organizationId,
        },
      });
      if (!existing) {
        const newMember = this.memberRepository.create({
          organizationId: user.organizationId,
          conversationId,
          userId: memberId,
          role: 'MEMBER',
        });
        const saved = await this.memberRepository.save(newMember);
        // Load relation user
        const memberWithUser = await this.memberRepository.findOne({
          where: { id: saved.id },
          relations: { user: true },
        });
        if (memberWithUser) {
          memberWithUser.user = toPublicUser(
            memberWithUser.user,
          ) as typeof memberWithUser.user;
          addedMembers.push(memberWithUser);
        }
      }
    }

    // Gửi sự kiện SSE cho mỗi thành viên mới gia nhập (Đa máy chủ qua Redis Pub/Sub)
    for (const member of addedMembers) {
      this.emitChatEvent({
        type: 'member.joined',
        organizationId: user.organizationId,
        conversationId,
        data: {
          conversationId,
          member,
        },
      });
    }

    // Làm mới bộ đệm thành viên phòng chat
    await this.invalidateMembershipCache(conversationId, user.organizationId);

    return { success: true, addedCount: addedMembers.length };
  }

  /**
   * Xóa hoặc rời khỏi cuộc hội thoại
   */
  async removeParticipant(
    conversationId: string,
    participantUserId: string,
    user: CurrentUserPayload,
  ): Promise<any> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, organizationId: user.organizationId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    // Lấy thông tin thành viên của người gửi yêu cầu
    const requesterMember = await this.memberRepository.findOne({
      where: {
        userId: user.id,
        conversationId,
        organizationId: user.organizationId,
      },
    });
    if (!requesterMember) {
      throw new ForbiddenException(
        'Bạn không phải là thành viên hội thoại này',
      );
    }

    const isSelfLeaving = participantUserId === user.id;
    // Lấy thông tin thành viên cần xóa (nếu tự rời thì dùng luôn thông tin requester)
    const targetMember = isSelfLeaving
      ? requesterMember
      : await this.memberRepository.findOne({
          where: {
            userId: participantUserId,
            conversationId,
            organizationId: user.organizationId,
          },
        });
    if (!targetMember) {
      throw new NotFoundException(
        'Không tìm thấy thành viên này trong hội thoại',
      );
    }
    const isRequesterAdmin = requesterMember.role === 'ADMIN';
    const isRequesterCreator = conversation.createdBy === user.id;

    if (!isSelfLeaving && !isRequesterAdmin && !isRequesterCreator) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thành viên khác khỏi phòng này',
      );
    }

    await this.memberRepository.remove(targetMember);

    // Làm mới bộ đệm thành viên phòng chat
    await this.invalidateMembershipCache(conversationId, user.organizationId);

    // Phát sự kiện SSE báo thành viên đã rời đi (Đa máy chủ qua Redis Pub/Sub)
    this.emitChatEvent({
      type: 'member.left',
      organizationId: user.organizationId,
      conversationId,
      data: {
        conversationId,
        userId: participantUserId,
      },
    });

    return { success: true };
  }

  /**
   * Lấy danh sách ID thành viên phòng chat từ bộ đệm O(1) hoặc nạp từ database
   */
  async getConversationMemberIds(
    conversationId: string,
    organizationId: string,
  ): Promise<Set<string>> {
    const now = Date.now();
    const cacheKey = `${organizationId}:${conversationId}`;

    // 1. Kiểm tra In-memory Set Cache (O(1))
    const memoryHit = this.membershipCache.get(cacheKey);
    if (memoryHit && now < memoryHit.expiresAt) {
      return memoryHit.memberIds;
    }

    // 2. Kiểm tra Redis Cache nếu khả dụng
    if (this.redisService) {
      const redisKey = `chat:members:${cacheKey}`;
      const cachedArray = await this.redisService.get<string[]>(redisKey);
      if (Array.isArray(cachedArray)) {
        const memberIds = new Set(cachedArray);
        this.membershipCache.set(cacheKey, {
          memberIds,
          expiresAt: now + 300000, // 5 phút
        });
        return memberIds;
      }
    }

    // 3. Cache miss: Truy vấn PostgreSQL và nạp vào bộ đệm
    const memberIds = new Set<string>();
    if (typeof this.memberRepository.find === 'function') {
      const members = await this.memberRepository.find({
        where: { conversationId, organizationId },
        select: { userId: true },
      });
      if (Array.isArray(members)) {
        for (const m of members) {
          if (m?.userId) memberIds.add(m.userId);
        }
      }
    }

    // Nạp vào Memory Set Cache (10 phút)
    if (memberIds.size > 0) {
      this.membershipCache.set(cacheKey, {
        memberIds,
        expiresAt: now + 600000,
      });

      // Nạp vào Redis (600s)
      if (this.redisService) {
        const redisKey = `chat:members:${cacheKey}`;
        await this.redisService.set(redisKey, Array.from(memberIds), 600);
      }
    }

    return memberIds;
  }

  /**
   * Helper kiểm tra xem User có phải thành viên cuộc hội thoại không (O(1) Memory Cache)
   */
  async isMember(
    userId: string,
    conversationId: string,
    organizationId: string,
  ): Promise<boolean> {
    const cacheKey = `${organizationId}:${conversationId}`;

    // 1. Kiểm tra In-memory Set Cache (O(1) - 0 Database Query)
    const memoryHit = this.membershipCache.get(cacheKey);
    if (memoryHit && Date.now() < memoryHit.expiresAt) {
      if (memoryHit.memberIds.has(userId)) return true;
    }

    // 2. Kiểm tra Redis Cache
    if (this.redisService) {
      const redisKey = `chat:members:${cacheKey}`;
      const cachedArray = await this.redisService.get<string[]>(redisKey);
      if (Array.isArray(cachedArray)) {
        const memberIds = new Set(cachedArray);
        this.membershipCache.set(cacheKey, {
          memberIds,
          expiresAt: Date.now() + 300000,
        });
        if (memberIds.has(userId)) return true;
      }
    }

    // 3. Cache miss: Kiểm tra qua findOne và tự động lưu vào bộ đệm
    const member = await this.memberRepository.findOne({
      where: { userId, conversationId, organizationId },
    });

    if (member) {
      let cached = this.membershipCache.get(cacheKey);
      if (!cached || Date.now() >= cached.expiresAt) {
        cached = {
          memberIds: new Set<string>(),
          expiresAt: Date.now() + 600000,
        };
        this.membershipCache.set(cacheKey, cached);
      }
      cached.memberIds.add(userId);
      return true;
    }

    return false;
  }

  /**
   * Xóa/Làm mới bộ đệm thành viên phòng chat khi có biến động
   */
  async invalidateMembershipCache(
    conversationId: string,
    organizationId: string,
  ): Promise<void> {
    const cacheKey = `${organizationId}:${conversationId}`;
    this.membershipCache.delete(cacheKey);
    if (this.redisService) {
      await this.redisService.del(`chat:members:${cacheKey}`);
    }
  }

  private async ensureUsersInOrganization(
    userIds: string[],
    organizationId: string,
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return;

    const users = await this.userRepository.find({
      where: { id: In(uniqueUserIds), organizationId },
      select: { id: true },
    });

    if (users.length !== uniqueUserIds.length) {
      throw new NotFoundException(
        'Một hoặc nhiều thành viên không tồn tại trong tổ chức của bạn',
      );
    }
  }

  private sanitizeConversation(conversation: Conversation): Conversation {
    conversation.members?.forEach((member) => {
      member.user = toPublicUser(member.user) as typeof member.user;
    });
    return conversation;
  }

  private sanitizeMessage(message: Message): Message {
    message.sender = toPublicUser(message.sender) as typeof message.sender;
    return message;
  }

  /**
   * Phát đi trạng thái đang gõ phím
   */
  async sendTypingStatus(
    user: CurrentUserPayload,
    conversationId: string,
    status: 'start' | 'stop',
  ): Promise<void> {
    // 1. Xác thực quyền truy cập hội thoại trước
    await this.findConversation(user, conversationId);

    // 2. Phát sự kiện vào luồng SSE (Đa máy chủ qua Redis Pub/Sub)
    this.emitChatEvent({
      type: status === 'start' ? 'typing.start' : 'typing.stop',
      organizationId: user.organizationId,
      conversationId,
      data: {
        userId: user.id,
        fullName: user.fullName,
        conversationId,
      },
    });
  }

  /**
   * Lấy số lượng cuộc hội thoại chưa đọc của người dùng
   */
  async getUnreadCount(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    const memberships = await this.memberRepository.find({
      where: { userId, organizationId },
    });
    if (!memberships || memberships.length === 0) {
      return 0;
    }
    let unreadCount = 0;
    for (const member of memberships) {
      const whereCondition: any = {
        conversationId: member.conversationId,
        organizationId,
        senderId: Not(userId),
      };

      if (member.lastReadAt) {
        whereCondition.createdAt = MoreThan(member.lastReadAt);
      }

      const unreadMessage = await this.messageRepository.findOne({
        where: whereCondition,
      });

      if (unreadMessage) {
        unreadCount++;
      }
    }

    return unreadCount;
  }

  /**
   * Đẩy số lượng tin nhắn chưa đọc của người dùng qua luồng SSE
   */
  async broadcastUnreadCount(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const unreadCount = await this.getUnreadCount(userId, organizationId);

    this.emitChatEvent({
      type: 'unread_count',
      organizationId,
      conversationId: 'global',
      data: {
        userId,
        unreadCount,
      },
    });
  }
}
