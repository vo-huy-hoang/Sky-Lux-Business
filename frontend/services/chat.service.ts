import { apiClient } from '@/lib/api-client';
import {
  Conversation,
  Message,
  CreateConversationPayload,
} from '@/types/chat';

export const chatService = {
  /**
   * API-CHAT-001: Lấy danh sách các cuộc hội thoại
   */
  getConversations: () => {
    return apiClient.get<any, Conversation[]>('/conversations');
  },

  /**
   * API-CHAT-002: Tạo cuộc hội thoại mới
   */
  createConversation: (data: CreateConversationPayload) => {
    return apiClient.post<any, Conversation>('/conversations', data);
  },

  /**
   * API-CHAT-003: Lấy chi tiết một cuộc hội thoại
   */
  getConversationDetail: (id: string) => {
    return apiClient.get<any, Conversation>(`/conversations/${id}`);
  },

  /**
   * Lấy lịch sử tin nhắn của cuộc hội thoại
   */
  getConversationMessages: (id: string) => {
    return apiClient.get<any, Message[]>(`/conversations/${id}/messages`);
  },

  /**
   * Gửi tin nhắn vào cuộc hội thoại
   */
  sendMessage: (id: string, content: string) => {
    return apiClient.post<any, Message>(`/conversations/${id}/messages`, { content });
  },

  /**
   * API-CHAT-004: Lấy cuộc hội thoại liên kết với hồ sơ tour
   */
  getDossierConversation: (dossierId: string) => {
    return apiClient.get<any, Conversation | null>(`/dossiers/${dossierId}/conversation`);
  },

  /**
   * Xóa/Thu hồi tin nhắn
   */
  deleteMessage: (messageId: string) => {
    return apiClient.delete<any, void>(`/messages/${messageId}`);
  },
};
