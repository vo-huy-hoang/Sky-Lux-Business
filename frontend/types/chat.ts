export interface ChatUser {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  user: ChatUser;
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
}

export interface Message {
  id: string;
  organizationId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
}

export interface CreateConversationPayload {
  name?: string;
  isGroup?: boolean;
  userIds: string[];
  dossierId?: string;
}

export interface SendMessagePayload {
  content: string;
}

export interface ChatEvent {
  type: 'message.created' | 'message.deleted';
  payload: any;
}
