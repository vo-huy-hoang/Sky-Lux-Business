import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  MessageEvent,
} from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

import { AddParticipantsDto } from './dto/add-participants.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@Injectable()
export class ChatService {
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
    // Xác thực quyền truy cập hội thoại trước và lấy danh sách thành viên
    const conversation = await this.findConversation(user, conversationId);

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
        // Cho phép nhận unread_count nếu đúng là cho user này
        if (evt.type === 'unread_count' && evt.data?.userId === user.id) {
          return { evt, isAllowed: true };
        }
        // Kiểm tra xem có phải thành viên cuộc hội thoại không
        const isMember = await this.isMember(user.id, evt.conversationId);
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
      where: { userId: user.id, conversationId },
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
        where: { conversationId },
        order: { createdAt: 'DESC' },
      });
      if (latestMessage) {
        lastReadMessageId = latestMessage.id;
      }
    }

    member.lastReadMessageId = lastReadMessageId;
    member.lastReadAt = new Date();
    await this.memberRepository.save(member);

    // Phát sự kiện SSE
    if (lastReadMessageId) {
      this.chatEvent$.next({
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
    const isMember = await this.isMember(user.id, conversationId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
    }

    return this.memberRepository.find({
      where: { conversationId },
      relations: { user: true },
      order: { joinedAt: 'ASC' },
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
    const isMember = await this.isMember(user.id, conversationId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại này');
    }

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    if (!conversation.isGroup) {
      throw new ForbiddenException(
        'Không thể thêm thành viên vào cuộc hội thoại cá nhân. Hãy tạo nhóm chat mới.',
      );
    }

    const addedMembers: ConversationMember[] = [];
    for (const memberId of payload.userIds) {
      // Kiểm tra xem đã là thành viên chưa
      const existing = await this.memberRepository.findOne({
        where: { userId: memberId, conversationId },
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
          addedMembers.push(memberWithUser);
        }
      }
    }

    // Gửi sự kiện SSE cho mỗi thành viên mới gia nhập
    for (const member of addedMembers) {
      this.chatEvent$.next({
        type: 'member.joined',
        organizationId: user.organizationId,
        conversationId,
        data: {
          conversationId,
          member,
        },
      });
    }

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
      where: { id: conversationId },
    });
    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    // Lấy thông tin thành viên của người gửi yêu cầu
    const requesterMember = await this.memberRepository.findOne({
      where: { userId: user.id, conversationId },
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
          where: { userId: participantUserId, conversationId },
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

    // Phát sự kiện SSE báo thành viên đã rời đi
    this.chatEvent$.next({
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
   * Helper kiểm tra xem User có phải thành viên cuộc hội thoại không
   */
  async isMember(userId: string, conversationId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { userId, conversationId },
    });
    return !!member;
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

    // 2. Phát sự kiện vào luồng SSE
    this.chatEvent$.next({
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

    this.chatEvent$.next({
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
