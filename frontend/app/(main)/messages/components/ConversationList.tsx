'use client';

import React from 'react';
import { Avatar, Button, Empty, Input, Skeleton, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { Conversation } from '@/types/chat';
import { themeTokens } from '@/lib/theme/tokens.config';
import { formatMessageTime, getInitials } from '../types';

const { Text } = Typography;

export interface ConversationListProps {
  isOperator?: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenCreateModal: () => void;
  isLoadingConversations: boolean;
  filteredConversations: Conversation[];
  effectiveConversationId: string | null;
  onSelectConversation: (id: string) => void;
  getConversationTitle: (conv: Conversation) => string;
  currentUserId?: string;
}

export function ConversationList({
  isOperator,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  isLoadingConversations,
  filteredConversations,
  effectiveConversationId,
  onSelectConversation,
  getConversationTitle,
  currentUserId,
}: ConversationListProps) {
  return (
    <section className="skylux-message-list" aria-label="Danh sách cuộc trò chuyện">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <Text
            strong
            className={`text-[22px] leading-none text-slate-900 ${
              isOperator ? 'op-message-list-title' : ''
            }`}
          >
            Tin nhắn
          </Text>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
            className="bg-[var(--color-primary-700)] hover:bg-[var(--color-primary-800)]"
          >
            Tạo mới
          </Button>
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm kiếm cuộc trò chuyện"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            aria-label="Tìm kiếm cuộc trò chuyện"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoadingConversations ? (
          <div className="p-4 space-y-3">
            <Skeleton active avatar paragraph={{ rows: 1 }} />
            <Skeleton active avatar paragraph={{ rows: 1 }} />
            <Skeleton active avatar paragraph={{ rows: 1 }} />
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === effectiveConversationId;
            const title = getConversationTitle(conv);

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  isSelected
                    ? 'bg-[var(--color-primary-soft)] border-l-4 border-[var(--color-primary-700)]'
                    : 'hover:bg-slate-50'
                }`}
              >
                <Avatar
                  size={40}
                  style={{
                    backgroundColor: conv.isGroup
                      ? themeTokens.semantic.info.main
                      : themeTokens.brand.primary[700],
                    color: themeTokens.neutral.surface,
                    fontWeight: 600,
                  }}
                  icon={conv.isGroup ? <TeamOutlined /> : undefined}
                >
                  {!conv.isGroup && getInitials(title)}
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <Text
                      strong
                      className={`truncate text-sm ${
                        isSelected ? 'text-[var(--color-primary-700)]' : 'text-slate-800'
                      }`}
                    >
                      {title}
                    </Text>
                    <Text className="text-[11px] text-slate-400 shrink-0 ml-1">
                      {formatMessageTime(conv.updatedAt)}
                    </Text>
                  </div>

                  <div className="mt-0.5 flex items-center justify-between">
                    <Text className="truncate text-xs text-slate-500">
                      {conv.dossierId ? (
                        <span className="text-[var(--color-primary-700)] font-medium mr-1">
                          [Hồ sơ tour]
                        </span>
                      ) : null}
                      {conv.members?.length ? `${conv.members.length} thành viên` : ''}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-sm text-slate-500">
                  {searchQuery
                    ? 'Không tìm thấy cuộc trò chuyện phù hợp'
                    : 'Chưa có cuộc trò chuyện'}
                </span>
              }
            >
              <Button
                type="link"
                size="small"
                onClick={onOpenCreateModal}
                className="text-[var(--color-primary-700)]"
              >
                Tạo cuộc trò chuyện đầu tiên
              </Button>
            </Empty>
          </div>
        )}
      </div>
    </section>
  );
}
