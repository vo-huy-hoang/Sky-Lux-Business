export type ConversationType = 'DIRECT' | 'GROUP' | 'DOSSIER';

export interface ConversationQueryParams {
  type?: ConversationType;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ConversationApiItem {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  data: ConversationApiItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface CreateConversationInput {
  type: ConversationType;
  participantIds: string[];
  title?: string;
  dossierId?: string;
}

export interface MessageQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface CreateMessageInput {
  content: string;
  type?: 'TEXT' | 'FILE' | 'IMAGE';
  attachmentIds?: string[];
}
