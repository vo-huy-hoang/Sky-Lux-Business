'use client';

import React from 'react';
import { Button, Empty, Typography } from 'antd';
import { MessageOutlined, PlusOutlined } from '@ant-design/icons';
import { useActiveChatWorkspace } from './hooks/useActiveChatWorkspace';
import {
  ConversationInfoSidebar,
  ConversationList,
  CreateConversationModal,
  MessageBubbleList,
  MessageInputBar,
  MessageThreadHeader,
} from './components';

const { Text } = Typography;

export default function MessagesPage() {
  const ws = useActiveChatWorkspace();

  return (
    <div className={`skylux-message-workspace ${ws.isOperator ? 'op-messages-page' : ''}`}>
      {/* 1. CỘT TRÁI: DANH SÁCH CUỘC TRÒ CHUYỆN */}
      <ConversationList
        isOperator={ws.isOperator}
        searchQuery={ws.searchQuery}
        onSearchChange={ws.setSearchQuery}
        onOpenCreateModal={() => ws.setIsCreateModalOpen(true)}
        isLoadingConversations={ws.isLoadingConversations}
        filteredConversations={ws.filteredConversations}
        effectiveConversationId={ws.effectiveConversationId}
        onSelectConversation={ws.setSelectedConversationId}
        getConversationTitle={ws.getConversationTitle}
        currentUserId={ws.user?.id}
      />

      {/* 2. CỘT GIỮA: NỘI DUNG CUỘC TRÒ CHUYỆN */}
      <main className="skylux-message-thread flex flex-col flex-1 bg-[#F9FBFA]" aria-label="Nội dung cuộc trò chuyện">
        {ws.activeConversation ? (
          <>
            <MessageThreadHeader
              activeConversation={ws.activeConversation}
              conversationTitle={ws.getConversationTitle(ws.activeConversation)}
              relatedDossier={ws.relatedDossier}
              showRightPanel={ws.showRightPanel}
              onToggleRightPanel={() => ws.setShowRightPanel((prev) => !prev)}
            />
            <MessageBubbleList
              messages={ws.messages}
              isLoadingMessages={ws.isLoadingMessages}
              typingUsers={ws.typingUsers}
              currentUserId={ws.user?.id}
              onDeleteMessage={ws.deleteMessage}
              onRetryMessage={ws.handleSendMessage}
              messagesEndRef={ws.messagesEndRef}
            />
            <MessageInputBar
              inputText={ws.inputText}
              isSending={ws.isSending}
              onInputChange={ws.handleInputChange}
              onSendMessage={() => ws.handleSendMessage()}
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
                onClick={() => ws.setIsCreateModalOpen(true)}
                className="bg-[#007A55]"
              >
                Tạo cuộc trò chuyện mới
              </Button>
            </Empty>
          </div>
        )}
      </main>

      {/* 3. CỘT PHẢI: THÔNG TIN HỘI THOẠI & HỒ SƠ TOUR LIÊN QUAN */}
      {ws.showRightPanel && ws.activeConversation ? (
        <ConversationInfoSidebar
          activeConversation={ws.activeConversation}
          relatedDossier={ws.relatedDossier}
          currentUserId={ws.user?.id}
          onClose={() => ws.setShowRightPanel(false)}
        />
      ) : null}

      {/* 4. MODAL TẠO CUỘC TRÒ CHUYỆN MỚI */}
      <CreateConversationModal
        isOpen={ws.isCreateModalOpen}
        isLoading={ws.isCreating}
        newConvName={ws.newConvName}
        onNameChange={ws.setNewConvName}
        selectedUserIds={ws.selectedUserIds}
        onSelectedUserIdsChange={ws.setSelectedUserIds}
        allUsers={ws.allUsers}
        currentUserId={ws.user?.id}
        onOk={ws.handleCreateConversation}
        onCancel={() => {
          ws.setIsCreateModalOpen(false);
          ws.setNewConvName('');
          ws.setSelectedUserIds([]);
        }}
      />
    </div>
  );
}
