'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useActiveChatWorkspace } from './hooks/useActiveChatWorkspace';
import { ConversationList, MessageThreadArea } from './components';

const CreateConversationModal = dynamic(() => import('./components/CreateConversationModal'), { ssr: false });
const ConversationInfoSidebar = dynamic(() => import('./components/ConversationInfoSidebar'), { ssr: false });

export default function MessagesPage() {
  const ws = useActiveChatWorkspace();

  return (
    <div className={`skylux-message-workspace ${ws.isOperator ? 'op-messages-page' : ''}`}>
      <ConversationList
        isOperator={ws.isOperator} searchQuery={ws.searchQuery} onSearchChange={ws.setSearchQuery}
        onOpenCreateModal={() => ws.setIsCreateModalOpen(true)} isLoadingConversations={ws.isLoadingConversations}
        filteredConversations={ws.filteredConversations} effectiveConversationId={ws.effectiveConversationId}
        onSelectConversation={ws.setSelectedConversationId} getConversationTitle={ws.getConversationTitle}
        currentUserId={ws.user?.id}
      />
      <MessageThreadArea
        activeConversation={ws.activeConversation}
        conversationTitle={ws.getConversationTitle(ws.activeConversation)}
        relatedDossier={ws.relatedDossier}
        showRightPanel={ws.showRightPanel}
        onToggleRightPanel={() => ws.setShowRightPanel((prev) => !prev)}
        onOpenCreateModal={() => ws.setIsCreateModalOpen(true)}
      />
      {ws.showRightPanel && ws.activeConversation && (
        <ConversationInfoSidebar
          activeConversation={ws.activeConversation} currentUserId={ws.user?.id}
          onClose={() => ws.setShowRightPanel(false)}
        />
      )}
      {ws.isCreateModalOpen && (
        <CreateConversationModal
          isOpen={ws.isCreateModalOpen} onClose={() => ws.setIsCreateModalOpen(false)}
          onCreated={(newId) => {
            ws.setIsCreateModalOpen(false);
            ws.setSelectedConversationId(newId);
          }}
        />
      )}
    </div>
  );
}
