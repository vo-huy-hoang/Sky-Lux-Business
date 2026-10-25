import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { StorageService } from '../../shared/storage/storage.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: Repository<Conversation>;
  let memberRepo: Repository<ConversationMember>;
  let messageRepo: Repository<Message>;
  let dossierRepo: Repository<Dossier>;

  const mockUser: CurrentUserPayload = {
    id: 'user-1',
    organizationId: 'org-1',
    fullName: 'Test User',
    email: 'test@example.com',
    employeeCode: 'EMP001',
    roles: [],
    permissions: [],
  };

  const mockStorageService = {
    uploadFile: jest.fn().mockImplementation((file, objectKey) =>
      Promise.resolve({
        objectKey,
        fileSize: file.size,
        publicUrl: `/uploads/${objectKey}`,
      }),
    ),
    getSignedDownloadUrl: jest.fn().mockResolvedValue('/uploads/file.png'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };

  const mockConversationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'conv-1', ...entity }),
      ),
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(true),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    })),
  };

  const mockMemberRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    remove: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((entity) =>
        Promise.resolve({ id: 'msg-1', ...entity }),
      ),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepo = {
    find: jest.fn().mockResolvedValue([{ id: 'user-2' }]),
  };

  const mockDossierRepo = {
    findOne: jest
      .fn()
      .mockResolvedValue({ id: 'dossier-1', organizationId: 'org-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepo,
        },
        {
          provide: getRepositoryToken(ConversationMember),
          useValue: mockMemberRepo,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: mockDossierRepo,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    conversationRepo = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    memberRepo = module.get<Repository<ConversationMember>>(
      getRepositoryToken(ConversationMember),
    );
    messageRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
    dossierRepo = module.get<Repository<Dossier>>(getRepositoryToken(Dossier));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findConversations', () => {
    it('should query and return conversations', async () => {
      const res = await service.findConversations(mockUser);
      expect(res).toBeDefined();
      expect(mockConversationRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('should persist the creator so they can manage group members', async () => {
      mockUserRepo.find.mockResolvedValueOnce([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        createdBy: 'user-1',
        isGroup: true,
        members: [{ userId: 'user-1' }],
      });

      await service.createConversation(mockUser, {
        name: 'Test group',
        isGroup: true,
        userIds: ['user-2'],
      });

      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-1',
          name: 'Test group',
          isGroup: true,
        }),
      );
    });

    it('should throw BadRequestException if dossierId does not belong to user organization', async () => {
      mockUserRepo.find.mockResolvedValueOnce([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);
      mockDossierRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createConversation(mockUser, {
          name: 'Dossier Chat',
          userIds: ['user-2'],
          dossierId: 'cross-org-dossier-id',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockDossierRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cross-org-dossier-id', organizationId: 'org-1' },
      });
    });
  });

  describe('findConversation', () => {
    it('should throw NotFoundException if conversation not found', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.findConversation(mockUser, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'another-user' }],
      });
      await expect(
        service.findConversation(mockUser, 'conv-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return conversation if user is a member', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'user-1' }],
      };
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);
      const res = await service.findConversation(mockUser, 'conv-1');
      expect(res).toEqual(mockConv);
    });

    it('should remove passwordHash from member users', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [
          {
            userId: 'user-1',
            user: {
              id: 'user-1',
              fullName: 'Test User',
              passwordHash: 'secret',
            },
          },
        ],
      } as any;
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);

      const result = await service.findConversation(mockUser, 'conv-1');

      expect(result.members[0].user.passwordHash).toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('should successfully send a message and push to stream', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'user-1' }],
      };
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);
      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-1',
        content: 'hello',
        senderId: 'user-1',
      });

      const res = await service.sendMessage(mockUser, 'conv-1', 'hello');
      expect(res).toBeDefined();
      expect(res.id).toBe('msg-1');
    });

    it('should return cached message on duplicate clientMessageId without saving twice', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'user-1' }],
      };
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);
      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-idempotent-1',
        content: 'hello idempotency',
        senderId: 'user-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
      });

      // Lần 1: gửi với clientMessageId
      const res1 = await service.sendMessage(
        mockUser,
        'conv-1',
        'hello idempotency',
        'client-uuid-999',
      );
      expect(res1.id).toBe('msg-idempotent-1');
      const saveCount = mockMessageRepo.save.mock.calls.length;

      // Lần 2: gửi lại với CÙNG clientMessageId (giả lập mạng lag bấm 2 lần)
      const res2 = await service.sendMessage(
        mockUser,
        'conv-1',
        'hello idempotency',
        'client-uuid-999',
      );
      expect(res2.id).toBe('msg-idempotent-1');
      // Không được gọi save thêm lần nào nữa!
      expect(mockMessageRepo.save.mock.calls.length).toBe(saveCount);
    });

    it('should successfully send a message with attachments', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'user-1' }],
      };
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);
      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-with-att',
        content: 'Vé máy bay đính kèm',
        senderId: 'user-1',
        attachments: [
          {
            url: '/uploads/chat/ticket.jpg',
            originalName: 'ticket.jpg',
            fileSize: 102400,
            mimeType: 'image/jpeg',
            thumbnailUrl: '/uploads/chat/ticket.jpg',
          },
        ],
      });

      const res = await service.sendMessage(
        mockUser,
        'conv-1',
        'Vé máy bay đính kèm',
        undefined,
        [
          {
            url: '/uploads/chat/ticket.jpg',
            originalName: 'ticket.jpg',
            fileSize: 102400,
            mimeType: 'image/jpeg',
            thumbnailUrl: '/uploads/chat/ticket.jpg',
          },
        ],
      );
      expect(res.id).toBe('msg-with-att');
      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Vé máy bay đính kèm',
          attachments: expect.arrayContaining([
            expect.objectContaining({ originalName: 'ticket.jpg' }),
          ]),
        }),
      );
    });

    it('should successfully send a message with ONLY attachments (empty content text)', async () => {
      const mockConv = {
        id: 'conv-1',
        organizationId: 'org-1',
        members: [{ userId: 'user-1' }],
      };
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConv);
      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-only-att',
        content: '',
        senderId: 'user-1',
        attachments: [
          {
            url: '/uploads/chat/doc.pdf',
            originalName: 'doc.pdf',
            fileSize: 50000,
            mimeType: 'application/pdf',
          },
        ],
      });

      const res = await service.sendMessage(mockUser, 'conv-1', '', undefined, [
        {
          url: '/uploads/chat/doc.pdf',
          originalName: 'doc.pdf',
          fileSize: 50000,
          mimeType: 'application/pdf',
        },
      ]);
      expect(res.id).toBe('msg-only-att');
    });

    it('should throw BadRequestException if message has neither content nor attachments', async () => {
      await expect(
        service.sendMessage(mockUser, 'conv-1', '   ', undefined, []),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('uploadAttachment', () => {
    it('should successfully upload an image and return attachment payload with thumbnailUrl', async () => {
      const mockFile = {
        originalname: 'ticket-vietnam-airlines.jpg',
        buffer: Buffer.from('fake-image-bytes'),
        mimetype: 'image/jpeg',
        size: 204800,
      } as Express.Multer.File;

      const res = await service.uploadAttachment(mockUser, mockFile);

      expect(res).toBeDefined();
      expect(res.originalName).toBe('ticket-vietnam-airlines.jpg');
      expect(res.fileSize).toBe(204800);
      expect(res.mimeType).toBe('image/jpeg');
      expect(res.url).toContain('/uploads/chat/org-1/');
      expect(res.thumbnailUrl).toBe(res.url);
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should successfully upload a PDF document and return attachment payload without thumbnailUrl', async () => {
      const mockFile = {
        originalname: 'tour-itinerary.pdf',
        buffer: Buffer.from('fake-pdf-bytes'),
        mimetype: 'application/pdf',
        size: 512000,
      } as Express.Multer.File;

      const res = await service.uploadAttachment(mockUser, mockFile);

      expect(res).toBeDefined();
      expect(res.originalName).toBe('tour-itinerary.pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.thumbnailUrl).toBeUndefined();
    });

    it('should throw BadRequestException if file is missing or has no buffer', async () => {
      await expect(
        service.uploadAttachment(mockUser, null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds 15MB limit', async () => {
      const oversizedFile = {
        originalname: 'large-video.mp4',
        buffer: Buffer.from('large-bytes'),
        mimetype: 'video/mp4',
        size: 16 * 1024 * 1024, // 16MB > 15MB
      } as Express.Multer.File;

      await expect(
        service.uploadAttachment(mockUser, oversizedFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file is an executable or blocked extension', async () => {
      const dangerousFile = {
        originalname: 'malware.exe',
        buffer: Buffer.from('dangerous-bytes'),
        mimetype: 'application/x-msdownload',
        size: 1024,
      } as Express.Multer.File;

      await expect(
        service.uploadAttachment(mockUser, dangerousFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteMessage', () => {
    it('should throw NotFoundException if message not found', async () => {
      mockMessageRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.deleteMessage(mockUser, 'invalid-msg'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-1',
        senderId: 'another-user',
        organizationId: 'org-1',
      });
      await expect(service.deleteMessage(mockUser, 'msg-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete message and push deletion event to stream', async () => {
      const mockMsg = {
        id: 'msg-1',
        senderId: 'user-1',
        organizationId: 'org-1',
        conversationId: 'conv-1',
      };
      mockMessageRepo.findOne.mockResolvedValueOnce(mockMsg);

      await service.deleteMessage(mockUser, 'msg-1');
      expect(mockMessageRepo.delete).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('getMessagesStream', () => {
    it('should filter stream by organization and membership', (done) => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });

      const sub = service.getMessagesStream(mockUser).subscribe({
        next: (event) => {
          expect(event.data).toBeDefined();
          expect((event.data as any).type).toBe('message.created');
          sub.unsubscribe();
          done();
        },
      });

      // Simulating a stream event
      (service as any).chatEvent$.next({
        type: 'message.created',
        organizationId: 'org-1',
        conversationId: 'conv-1',
        data: { id: 'msg-1' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.markAsRead('conv-1', { messageId: 'msg-1' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully save read state and trigger SSE event', async () => {
      const mockMember = { userId: 'user-1', conversationId: 'conv-1' };
      mockMemberRepo.findOne.mockResolvedValueOnce(mockMember);

      const res = await service.markAsRead(
        'conv-1',
        { messageId: 'msg-1' },
        mockUser,
      );
      expect(res).toEqual({ success: true });
      expect(mockMemberRepo.save).toHaveBeenCalled();
    });
  });

  describe('getParticipants', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getParticipants('conv-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return all participants of conversation', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });
      const mockParticipants = [{ userId: 'user-1' }, { userId: 'user-2' }];
      mockMemberRepo.find.mockResolvedValueOnce(mockParticipants);

      const res = await service.getParticipants('conv-1', mockUser);
      expect(res).toEqual(mockParticipants);
    });
  });

  describe('addParticipants', () => {
    it('should throw ForbiddenException if requester is not a member', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.addParticipants('conv-1', { userIds: ['user-2'] }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });
      mockConversationRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.addParticipants('conv-1', { userIds: ['user-2'] }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if conversation is not a group', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        isGroup: false,
      });
      await expect(
        service.addParticipants('conv-1', { userIds: ['user-2'] }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should add multiple members to group chat', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' }); // for isMember check
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        isGroup: true,
      });
      mockMemberRepo.findOne.mockResolvedValueOnce(null); // not existing member
      mockMemberRepo.create.mockReturnValueOnce({
        id: 'member-2',
        userId: 'user-2',
      });
      mockMemberRepo.save.mockResolvedValueOnce({
        id: 'member-2',
        userId: 'user-2',
      });
      mockMemberRepo.findOne.mockResolvedValueOnce({
        id: 'member-2',
        userId: 'user-2',
        user: { fullName: 'User 2' },
      });

      const res = await service.addParticipants(
        'conv-1',
        { userIds: ['user-2'] },
        mockUser,
      );
      expect(res.success).toBe(true);
      expect(res.addedCount).toBe(1);
    });

    it('should reject members from another organization', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        organizationId: 'org-1',
        isGroup: true,
      });
      mockUserRepo.find.mockResolvedValueOnce([]);

      await expect(
        service.addParticipants('conv-1', { userIds: ['user-2'] }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeParticipant', () => {
    it('should throw NotFoundException if conversation does not exist', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.removeParticipant('conv-1', 'user-2', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is not a member', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({ id: 'conv-1' });
      mockMemberRepo.findOne.mockResolvedValueOnce(null); // requester not member
      await expect(
        service.removeParticipant('conv-1', 'user-2', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target is not a member', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({ id: 'conv-1' });
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-1',
        role: 'MEMBER',
      }); // requester
      mockMemberRepo.findOne.mockResolvedValueOnce(null); // target not member
      await expect(
        service.removeParticipant('conv-1', 'user-2', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester has no permission to kick', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        createdBy: 'admin',
      });
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-1',
        role: 'MEMBER',
      }); // requester
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-2',
        role: 'MEMBER',
      }); // target
      await expect(
        service.removeParticipant('conv-1', 'user-2', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user to leave conversation by themselves', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({ id: 'conv-1' });
      const mockMember = { userId: 'user-1', role: 'MEMBER' };
      mockMemberRepo.findOne.mockResolvedValueOnce(mockMember); // requester (self)
      mockMemberRepo.findOne.mockResolvedValueOnce(mockMember); // target (self)

      const res = await service.removeParticipant('conv-1', 'user-1', mockUser);
      expect(res).toEqual({ success: true });
      expect(mockMemberRepo.remove).toHaveBeenCalledWith(mockMember);
    });
  });

  describe('sendTypingStatus', () => {
    it('should throw ForbiddenException if requester is not a member', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({ id: 'conv-1' });
      mockMemberRepo.findOne.mockResolvedValueOnce(null); // not member
      await expect(
        service.sendTypingStatus(mockUser, 'conv-1', 'start'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should trigger typing event successfully', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        members: [{ userId: 'user-1' }],
      });
      mockMemberRepo.findOne.mockResolvedValueOnce({ userId: 'user-1' });

      const nextSpy = jest.spyOn((service as any).chatEvent$, 'next');
      await service.sendTypingStatus(mockUser, 'conv-1', 'start');
      expect(nextSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'typing.start',
          conversationId: 'conv-1',
          data: expect.objectContaining({
            userId: 'user-1',
            fullName: 'Test User',
          }),
        }),
      );
      nextSpy.mockRestore();
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 if user has no conversation memberships', async () => {
      mockMemberRepo.find.mockResolvedValueOnce([]);
      const count = await service.getUnreadCount('user-1', 'org-1');
      expect(count).toBe(0);
    });

    it('should calculate unread count correctly', async () => {
      mockMemberRepo.find.mockResolvedValueOnce([
        { conversationId: 'conv-1', lastReadAt: new Date('2026-08-28') },
      ]);
      mockMessageRepo.findOne.mockResolvedValueOnce({ id: 'msg-2' }); // unread message exists

      const count = await service.getUnreadCount('user-1', 'org-1');
      expect(count).toBe(1);
    });
  });
});
