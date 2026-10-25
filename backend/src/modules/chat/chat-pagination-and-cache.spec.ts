import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { RedisService } from '../../common/redis/redis.service';
import { StorageService } from '../../shared/storage/storage.service';
import { ChatPubSubService } from './chat-pubsub.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('TICKET-CHAT-04: Membership Cache O(1) & Message Cursor Pagination', () => {
  let service: ChatService;

  const mockUser: CurrentUserPayload = {
    id: 'user-sales-1',
    organizationId: 'org-luxury',
    fullName: 'Hoàng Sales',
    email: 'hoang@skylux.vn',
    employeeCode: 'EMP001',
    roles: [],
    permissions: [],
  };

  const mockMemberRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((dto) => dto),
    remove: jest.fn(),
  };

  const mockMessages: Message[] = Array.from({ length: 50 }, (_, i) => ({
    id: `msg-${i + 1}`,
    organizationId: 'org-luxury',
    conversationId: 'conv-halong',
    senderId: i % 2 === 0 ? 'user-sales-1' : 'user-operator-2',
    content: `Tin nhắn số ${i + 1}`,
    createdAt: new Date(1700000000000 + i * 1000) as any,
    updatedAt: new Date(1700000000000 + i * 1000) as any,
    attachments: null,
    sender: {
      id: i % 2 === 0 ? 'user-sales-1' : 'user-operator-2',
      fullName: i % 2 === 0 ? 'Hoàng Sales' : 'Lan Điều Hành',
    } as any,
  })) as unknown as Message[];

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockImplementation(() => {
      // Return 30 newest messages (31 to 50) in descending order
      return Promise.resolve([...mockMessages.slice(-30)].reverse());
    }),
  };

  const mockMessageRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockConversationRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'conv-halong',
      organizationId: 'org-luxury',
      members: [{ userId: 'user-sales-1' }],
    }),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Dossier),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: ChatPubSubService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
            getEventStream: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('1. Membership Cache O(1) Performance', () => {
    it('should query repository once on cache miss, then check in O(1) with ZERO queries for subsequent calls', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-sales-1',
        conversationId: 'conv-halong',
      });

      // 1st call: Cache miss -> calls memberRepository.findOne
      const firstCheck = await service.isMember(
        'user-sales-1',
        'conv-halong',
        'org-luxury',
      );
      expect(firstCheck).toBe(true);
      expect(mockMemberRepo.findOne).toHaveBeenCalledTimes(1);

      // Simulate 20 concurrent online users checking membership in the same conversation
      for (let i = 0; i < 20; i++) {
        const hit = await service.isMember(
          'user-sales-1',
          'conv-halong',
          'org-luxury',
        );
        expect(hit).toBe(true);
      }

      // memberRepository.findOne should STILL only have been called 1 time!
      expect(mockMemberRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when member is removed or added', async () => {
      mockMemberRepo.findOne.mockResolvedValue({
        userId: 'user-sales-1',
        conversationId: 'conv-halong',
      });

      // Warm cache
      await service.isMember('user-sales-1', 'conv-halong', 'org-luxury');
      expect(mockMemberRepo.findOne).toHaveBeenCalledTimes(1);

      // Invalidate cache
      await service.invalidateMembershipCache('conv-halong', 'org-luxury');

      // Next check triggers database reload
      await service.isMember('user-sales-1', 'conv-halong', 'org-luxury');
      expect(mockMemberRepo.findOne).toHaveBeenCalledTimes(2);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'chat:members:org-luxury:conv-halong',
      );
    });
  });

  describe('2. Message Pagination (Limit 30 & Before Cursor)', () => {
    it('should fetch at most 30 messages by default and order them chronologically (ASC)', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-sales-1',
        conversationId: 'conv-halong',
      });

      const result = await service.findMessages(mockUser, 'conv-halong');

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(30);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'message.createdAt',
        'DESC',
      );
      expect(result).toHaveLength(30);

      // Verify returned messages are ordered chronologically ASC (oldest first, newest last)
      const firstMsgTime = new Date(result[0].createdAt).getTime();
      const lastMsgTime = new Date(result[29].createdAt).getTime();
      expect(lastMsgTime).toBeGreaterThan(firstMsgTime);
    });

    it('should accept custom limit and filter by before cursor', async () => {
      mockMemberRepo.findOne.mockResolvedValueOnce({
        userId: 'user-sales-1',
        conversationId: 'conv-halong',
      });

      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-40',
        createdAt: new Date(1700000040000),
      });

      await service.findMessages(mockUser, 'conv-halong', 15, 'msg-40');

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(15);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'message.createdAt < :beforeDate',
        { beforeDate: expect.any(Date) },
      );
    });
  });
});
