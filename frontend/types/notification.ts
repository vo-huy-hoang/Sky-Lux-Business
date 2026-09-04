import { PaginatedResponse } from './api';

export type NotificationType =
  | 'DOSSIER'
  | 'ESTIMATE'
  | 'TASK'
  | 'SYSTEM'
  | 'CHAT'
  | string;

export interface NotificationItem {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  linkUrl?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationEvent {
  type: 'notification.created' | 'notification.read' | 'notification.unread_count';
  payload: any;
}

export type PaginatedNotificationsResponse = PaginatedResponse<NotificationItem>;
