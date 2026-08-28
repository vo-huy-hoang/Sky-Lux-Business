import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { ConversationMember } from './entities/conversation-member.entity';
import { Message } from './entities/message.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('ChatService', () => {
  let service: ChatService;
  let conversationRepo: Repository<Conversation>;
  let memberRepo: Repository<ConversationMember>;
  let messageRepo: Repository<Message>;

  const mockUser: CurrentUserPayload = {
    id: 'user-1',
    organizationId: 'org-1',
    fullName: 'Test User',
    email: 'test@example.com',
    employeeCode: 'EMP001',
    roles: [],
    permissions: [],
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
  });
});
