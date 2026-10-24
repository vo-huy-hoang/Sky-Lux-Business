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
    uploadAttachment: jest.fn().mockResolvedValue({
      url: '/uploads/chat/file.jpg',
      originalName: 'file.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      thumbnailUrl: '/uploads/chat/file.jpg',
    }),
    deleteMessage: jest.fn().mockResolvedValue(undefined),
    findDossierConversation: jest.fn().mockResolvedValue(null),
    getMessagesStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
    sendTypingStatus: jest.fn().mockResolvedValue(undefined),
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
        undefined,
        undefined,
      );
    });

    it('should pass clientMessageId and attachments', async () => {
      const attachments = [
        {
          url: '/uploads/chat/file.jpg',
          originalName: 'file.jpg',
          fileSize: 1024,
          mimeType: 'image/jpeg',
        },
      ];
      const dto: SendMessageDto = {
        content: 'hello',
        clientMessageId: 'cm-123',
        attachments,
      };
      const res = await controller.sendMessage(mockUser, 'conv-1', dto);
      expect(res).toEqual({ id: 'msg-1' });
      expect(service.sendMessage).toHaveBeenCalledWith(
        mockUser,
        'conv-1',
        'hello',
        'cm-123',
        attachments,
      );
    });
  });

  describe('uploadAttachment', () => {
    it('should call chatService.uploadAttachment', async () => {
      const mockFile = {
        originalname: 'file.jpg',
        buffer: Buffer.from('data'),
        mimetype: 'image/jpeg',
        size: 1024,
      } as Express.Multer.File;

      const res = await controller.uploadAttachment(mockUser, mockFile);
      expect(res).toEqual({
        url: '/uploads/chat/file.jpg',
        originalName: 'file.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        thumbnailUrl: '/uploads/chat/file.jpg',
      });
      expect(service.uploadAttachment).toHaveBeenCalledWith(mockUser, mockFile);
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

  describe('startTyping', () => {
    it('should call chatService.sendTypingStatus with start', async () => {
      await controller.startTyping(mockUser, 'conv-1');
      expect(service.sendTypingStatus).toHaveBeenCalledWith(
        mockUser,
        'conv-1',
        'start',
      );
    });
  });

  describe('stopTyping', () => {
    it('should call chatService.sendTypingStatus with stop', async () => {
      await controller.stopTyping(mockUser, 'conv-1');
      expect(service.sendTypingStatus).toHaveBeenCalledWith(
        mockUser,
        'conv-1',
        'stop',
      );
    });
  });
});
