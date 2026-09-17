'use client';

import React from 'react';
import { Button, Empty, Typography } from 'antd';
import { MessageOutlined, PlusOutlined } from '@ant-design/icons';
import { Conversation, Message } from '@/types/chat';
import { DossierItem } from '@/types/dossier';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMessageThread } from '../hooks/useMessageThread';
import { MessageThreadHeader } from './MessageThreadHeader';
import { MessageBubbleList } from './MessageBubbleList';
import { MessageInputBar } from './MessageInputBar';

const { Text } = Typography;

/**
 * TICKET-42.2 & TICKET-43.2: Giao diện tinh gọn chuẩn Deep Module (< 6 props bắt buộc)
 * Mọi logic tương tác tin nhắn, optimistic gửi/xóa, input debounce và auto-scroll
 * được đóng gói tự trị bên trong thân component.
 */
export interface MessageThreadAreaProps {
  activeConversation?: Conversation;
  conversationTitle: string;
  relatedDossier?: DossierItem | null;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
  onOpenCreateModal: () => void;
  // Optional test / internal overrides
  currentUserId?: string;
  effectiveConversationId?: string | null;
  messages?: Message[];
  isLoadingMessages?: boolean;
  onDeleteMessage?: (msgId: string) => void;
  onRetryMessage?: (content: string, clientMessageId?: string) => void;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
  inputText?: string;
  isSending?: boolean;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage?: () => void;
}

/**
 * TICKET-39.1 & TICKET-42.2: Deep Module đóng gói toàn bộ khu vực khung chat trung tâm
 * - Khung hiển thị Header hội thoại (thành viên, liên kết hồ sơ tour)
 * - Khung tin nhắn cuộn với bong bóng chat và trạng thái gõ phím
 * - Thanh nhập liệu tin nhắn (input bar)
 * - Trạng thái trống (Empty state) khi chưa chọn cuộc hội thoại nào
 */
export function MessageThreadArea({
  activeConversation,
  conversationTitle,
  relatedDossier,
  showRightPanel,
  onToggleRightPanel,
  onOpenCreateModal,
  currentUserId: propCurrentUserId,
  effectiveConversationId,
  messages: propMessages,
  isLoadingMessages: propIsLoadingMessages,
  onDeleteMessage: propOnDeleteMessage,
  onRetryMessage: propOnRetryMessage,
  messagesEndRef: propMessagesEndRef,
  inputText: propInputText,
  isSending: propIsSending,
  onInputChange: propOnInputChange,
  onSendMessage: propOnSendMessage,
}: MessageThreadAreaProps) {
  const authUserId = useAuthStore((state) => state.user?.id);
  const currentUserId = propCurrentUserId || authUserId;
  const targetConvId = effectiveConversationId !== undefined ? effectiveConversationId : activeConversation?.id;

  // TICKET-42.2: Deep Module autonomy - useMessageThread được gọi trực tiếp bên trong component
  const thread = useMessageThread({
    conversationId: targetConvId,
  });

  const messages = propMessages !== undefined ? propMessages : thread.messages;
  const isLoadingMessages = propIsLoadingMessages !== undefined ? propIsLoadingMessages : thread.isLoadingMessages;
  const inputText = propInputText !== undefined ? propInputText : thread.inputText;
  const isSending = propIsSending !== undefined ? propIsSending : thread.isSending;
  const messagesEndRef = propMessagesEndRef !== undefined ? propMessagesEndRef : thread.messagesEndRef;
  const onDeleteMessage = propOnDeleteMessage || thread.deleteMessage;
  const onRetryMessage = propOnRetryMessage || thread.handleSendMessage;
  const onInputChange = propOnInputChange || thread.handleInputChange;
  const onSendMessage = propOnSendMessage || (() => thread.handleSendMessage());
  return (
    <main className="skylux-message-thread flex flex-col flex-1 bg-[#F9FBFA]" aria-label="Nội dung cuộc trò chuyện">
      {activeConversation ? (
        <>
          <MessageThreadHeader
            activeConversation={activeConversation}
            conversationTitle={conversationTitle}
            relatedDossier={relatedDossier}
            showRightPanel={showRightPanel}
            onToggleRightPanel={onToggleRightPanel}
          />
          <MessageBubbleList
            conversationId={targetConvId}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            currentUserId={currentUserId}
            onDeleteMessage={onDeleteMessage}
            onRetryMessage={onRetryMessage}
            messagesEndRef={messagesEndRef}
          />
          <MessageInputBar
            inputText={inputText}
            isSending={isSending}
            onInputChange={onInputChange}
            onSendMessage={onSendMessage}
          />
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
          <Empty
            image={<MessageOutlined className="text-4xl text-[#B7D3C7]" />}
            description={
              <div className="mt-3">
                <Text strong className="block text-base text-slate-700">
                  Chưa chọn cuộc trò chuyện
                </Text>
                <Text className="mt-1 block text-sm text-slate-500">
                  Chọn một cuộc trò chuyện từ danh sách bên trái hoặc tạo mới để bắt đầu.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onOpenCreateModal}
              className="bg-[#007A55]"
            >
              Tạo cuộc trò chuyện mới
            </Button>
          </Empty>
        </div>
      )}
    </main>
  );
}

export default MessageThreadArea;
