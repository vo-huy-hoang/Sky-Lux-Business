'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, Button, Tooltip, Typography } from 'antd';
import {
  FolderOpenOutlined,
  InfoCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Conversation } from '@/types/chat';
import { getInitials } from '../types';

const { Text } = Typography;

export interface MessageThreadHeaderProps {
  activeConversation: Conversation;
  conversationTitle: string;
  relatedDossier?: any;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
}

export function MessageThreadHeader({
  activeConversation,
  conversationTitle,
  relatedDossier,
  showRightPanel,
  onToggleRightPanel,
}: MessageThreadHeaderProps) {
  return (
    <header className="skylux-message-thread-header flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          size={40}
          style={{
            backgroundColor: activeConversation.isGroup ? '#2F80ED' : '#007A55',
            color: '#FFFFFF',
            fontWeight: 600,
          }}
          icon={activeConversation.isGroup ? <TeamOutlined /> : undefined}
        >
          {!activeConversation.isGroup && getInitials(conversationTitle)}
        </Avatar>
        <div className="min-w-0">
          <Text strong className="block truncate text-base text-slate-900">
            {conversationTitle}
          </Text>
          <Text className="block text-xs text-slate-500">
            {activeConversation.members?.length || 0} người tham gia
            {relatedDossier ? ` • Hồ sơ: ${relatedDossier.code}` : ''}
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {relatedDossier ? (
          <Link href={`/main/dossiers/${relatedDossier.id}`}>
            <Button size="small" icon={<FolderOpenOutlined />} className="text-[#007A55]">
              Mở hồ sơ
            </Button>
          </Link>
        ) : null}
        <Tooltip title={showRightPanel ? 'Ẩn thông tin' : 'Hiện thông tin'}>
          <Button
            type="text"
            shape="circle"
            icon={<InfoCircleOutlined className="text-base" />}
            onClick={onToggleRightPanel}
          />
        </Tooltip>
      </div>
    </header>
  );
}
