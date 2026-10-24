export interface ChatUser {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
}

import { DossierItem } from './dossier';

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  user: ChatUser;
  lastReadMessageId?: string;
  lastReadAt?: string;
  role: 'ADMIN' | 'MEMBER';
}

export interface Conversation {
  id: string;
  organizationId: string;
  dossierId?: string;
  name?: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  dossier?: DossierItem;
}

export interface ChatAttachment {
  url: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  organizationId: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: ChatAttachment[] | null;
  createdAt: string;
  sender: ChatUser;
  // Resilience & Optimistic UI
  clientMessageId?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface CreateConversationPayload {
  name?: string;
  isGroup?: boolean;
  userIds: string[];
  dossierId?: string;
}

export interface SendMessagePayload {
  content?: string;
  clientMessageId?: string;
  attachments?: ChatAttachment[];
}


export interface AddParticipantsPayload {
  userIds: string[];
}

export interface MarkReadPayload {
  messageId?: string;
}

export interface ChatEvent {
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
  payload: any;
}
