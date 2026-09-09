import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  Conversation,
  Message,
  CreateConversationPayload,
  ConversationMember,
  AddParticipantsPayload,
  MarkReadPayload,
} from '@/types/chat';

export const chatService = {
  /**
   * API-CHAT-001: Lấy danh sách các cuộc hội thoại
   */
  getConversations: (options?: RequestOptions) => {
    return apiClient.get<any, Conversation[]>('/conversations', {
      signal: options?.signal,
    });
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
  getConversationDetail: (id: string, options?: RequestOptions) => {
    return apiClient.get<any, Conversation>(`/conversations/${id}`, {
      signal: options?.signal,
    });
  },

  /**
   * Lấy lịch sử tin nhắn của cuộc hội thoại
   */
  getConversationMessages: (id: string, options?: RequestOptions) => {
    return apiClient.get<any, Message[]>(`/conversations/${id}/messages`, {
      signal: options?.signal,
    });
  },

  /**
   * Gửi tin nhắn vào cuộc hội thoại (Hỗ trợ clientMessageId chống gửi trùng)
   */
  sendMessage: (id: string, content: string, clientMessageId?: string) => {
    return apiClient.post<any, Message>(`/conversations/${id}/messages`, {
      content,
      clientMessageId,
    });
  },


  /**
   * API-CHAT-004: Lấy cuộc hội thoại liên kết với hồ sơ tour
   */
  getDossierConversation: (dossierId: string, options?: RequestOptions) => {
    return apiClient.get<any, Conversation | null>(
      `/dossiers/${dossierId}/conversation`,
      { signal: options?.signal },
    );
  },

  /**
   * Xóa/Thu hồi tin nhắn
   */
  deleteMessage: (messageId: string) => {
    return apiClient.delete<any, void>(`/messages/${messageId}`);
  },

  /**
   * Đánh dấu đã đọc tin nhắn (API-PARTICIPANT-001)
   */
  markAsRead: (conversationId: string, payload?: MarkReadPayload) => {
    return apiClient.post<any, any>(`/conversations/${conversationId}/read`, payload || {});
  },

  /**
   * Lấy danh sách thành viên trong cuộc hội thoại (API-PARTICIPANT-002)
   */
  getParticipants: (conversationId: string, options?: RequestOptions) => {
    return apiClient.get<any, ConversationMember[]>(
      `/conversations/${conversationId}/participants`,
      { signal: options?.signal },
    );
  },


  /**
   * Thêm thành viên vào cuộc hội thoại (API-PARTICIPANT-003)
   */
  addParticipants: (conversationId: string, payload: AddParticipantsPayload) => {
    return apiClient.post<any, any>(`/conversations/${conversationId}/participants`, payload);
  },

  /**
   * Xóa thành viên khỏi cuộc hội thoại (API-PARTICIPANT-004)
   */
  removeParticipant: (conversationId: string, userId: string) => {
    return apiClient.delete<any, any>(`/conversations/${conversationId}/participants/${userId}`);
  },

  /**
   * Báo hiệu bắt đầu gõ phím (API-CHAT-005)
   */
  startTyping: (conversationId: string) => {
    return apiClient.post<any, void>(`/conversations/${conversationId}/typing/start`);
  },

  /**
   * Báo hiệu dừng gõ phím (API-CHAT-006)
   */
  stopTyping: (conversationId: string) => {
    return apiClient.post<any, void>(`/conversations/${conversationId}/typing/stop`);
  },
};
