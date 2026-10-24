import { apiClient, RequestOptions } from '@/lib/api-client';
import {
  Conversation,
  Message,
  CreateConversationPayload,
  ConversationMember,
  AddParticipantsPayload,
  MarkReadPayload,
  ChatAttachment,
} from '@/types/chat';

export const chatService = {
  /**
   * Tải lên tệp đính kèm / hình ảnh cho tin nhắn chat
   */
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<any, ChatAttachment>('/chat/upload', formData);
  },

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
   * Lấy lịch sử tin nhắn của cuộc hội thoại (Hỗ trợ phân trang limit 30 & con trỏ before)
   */
  getConversationMessages: (
    id: string,
    paramsOrOptions?: { limit?: number; before?: string } | RequestOptions,
    options?: RequestOptions,
  ) => {
    let params: { limit?: number; before?: string } | undefined;
    let reqOptions: RequestOptions | undefined = options;

    if (
      paramsOrOptions &&
      ('limit' in paramsOrOptions || 'before' in paramsOrOptions)
    ) {
      params = paramsOrOptions as { limit?: number; before?: string };
    } else if (paramsOrOptions && 'signal' in paramsOrOptions) {
      reqOptions = paramsOrOptions as RequestOptions;
    }

    const queryParts: string[] = [];
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.before)
      queryParts.push(`before=${encodeURIComponent(params.before)}`);
    const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    return apiClient.get<any, Message[]>(
      `/conversations/${id}/messages${queryStr}`,
      {
        signal: reqOptions?.signal,
      },
    );
  },

  /**
   * Gửi tin nhắn vào cuộc hội thoại (Hỗ trợ clientMessageId chống gửi trùng & đính kèm tệp)
   */
  sendMessage: (
    id: string,
    content: string,
    clientMessageId?: string,
    attachments?: ChatAttachment[],
  ) => {
    return apiClient.post<any, Message>(`/conversations/${id}/messages`, {
      content,
      clientMessageId,
      attachments,
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
