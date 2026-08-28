import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  const mockUser: CurrentUserPayload = {
    id: 'user-1',
    organizationId: 'org-1',
    fullName: 'Test User',
    email: 'test@example.com',
    employeeCode: 'EMP001',
    roles: [],
    permissions: [],
  };

  const mockChatService = {
    findConversations: jest.fn().mockResolvedValue([]),
    createConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    findConversation: jest.fn().mockResolvedValue({ id: 'conv-1' }),
    findMessages: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    deleteMessage: jest.fn().mockResolvedValue(undefined),
    findDossierConversation: jest.fn().mockResolvedValue(null),
    getMessagesStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
  };

  const mockJwtService = {};
  const mockConfigService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: mockChatService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findConversations', () => {
    it('should call chatService.findConversations', async () => {
      const res = await controller.findConversations(mockUser);
      expect(res).toEqual([]);
      expect(service.findConversations).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('createConversation', () => {
    it('should call chatService.createConversation', async () => {
      const dto: CreateConversationDto = { userIds: ['user-2'] };
      const res = await controller.createConversation(mockUser, dto);
      expect(res).toEqual({ id: 'conv-1' });
      expect(service.createConversation).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('findConversation', () => {
    it('should call chatService.findConversation', async () => {
      const res = await controller.findConversation(mockUser, 'conv-1');
      expect(res).toEqual({ id: 'conv-1' });
      expect(service.findConversation).toHaveBeenCalledWith(mockUser, 'conv-1');
    });
  });

  describe('findMessages', () => {
    it('should call chatService.findMessages', async () => {
      const res = await controller.findMessages(mockUser, 'conv-1');
      expect(res).toEqual([]);
      expect(service.findMessages).toHaveBeenCalledWith(mockUser, 'conv-1');
    });
  });

  describe('sendMessage', () => {
    it('should call chatService.sendMessage', async () => {
      const dto: SendMessageDto = { content: 'hello' };
      const res = await controller.sendMessage(mockUser, 'conv-1', dto);
      expect(res).toEqual({ id: 'msg-1' });
      expect(service.sendMessage).toHaveBeenCalledWith(
        mockUser,
        'conv-1',
        'hello',
      );
    });
  });

  describe('deleteMessage', () => {
    it('should call chatService.deleteMessage', async () => {
      await controller.deleteMessage(mockUser, 'msg-1');
      expect(service.deleteMessage).toHaveBeenCalledWith(mockUser, 'msg-1');
    });
  });

  describe('findDossierConversation', () => {
    it('should call chatService.findDossierConversation', async () => {
      const res = await controller.findDossierConversation(
        mockUser,
        'dossier-1',
      );
      expect(res).toBeNull();
      expect(service.findDossierConversation).toHaveBeenCalledWith(
        mockUser,
        'dossier-1',
      );
    });
  });

  describe('streamMessages', () => {
    it('should call chatService.getMessagesStream', () => {
      controller.streamMessages(mockUser);
      expect(service.getMessagesStream).toHaveBeenCalledWith(mockUser);
    });
  });
});
