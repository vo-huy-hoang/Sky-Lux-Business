'use client';

import React from 'react';
import Link from 'next/link';
import { Avatar, Button, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { CloseOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Conversation } from '@/types/chat';
import { useDossierDetail } from '@/hooks/dossiers';
import { getInitials, statusConfig } from '../types';

const { Text } = Typography;

export interface ConversationInfoSidebarProps {
  activeConversation: Conversation;
  relatedDossier?: any;
  currentUserId?: string;
  onClose: () => void;
}

export function ConversationInfoSidebar({
  activeConversation,
  relatedDossier: propRelatedDossier,
  currentUserId,
  onClose,
}: ConversationInfoSidebarProps) {
  const dossierId = activeConversation?.dossierId;
  const { data: fetchedDossier, isLoading: isLoadingDossier } = useDossierDetail(
    dossierId || '',
    { enabled: Boolean(dossierId) },
  );

  const relatedDossier = propRelatedDossier !== undefined ? propRelatedDossier : fetchedDossier;

  return (
    <aside
      className="skylux-message-information w-80 border-l border-slate-200 bg-white"
      aria-label="Thông tin hội thoại"
    >
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <Text strong className="text-base text-slate-900">
          Thông tin hội thoại
        </Text>
        <Tooltip title="Đóng thông tin">
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined />}
            onClick={onClose}
            aria-label="Đóng thông tin hội thoại"
          />
        </Tooltip>
      </header>

      <div className="space-y-6 px-5 py-5 overflow-y-auto">
        {/* Hồ sơ tour liên quan */}
        <section>
          <Text strong className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hồ sơ tour liên quan
          </Text>
          {isLoadingDossier ? (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-[#F7FAF8] p-3.5 space-y-2">
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ) : relatedDossier ? (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-[#F7FAF8] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <Text strong className="text-sm text-[#007A55]">
                  {relatedDossier.code}
                </Text>
                <Tag color={statusConfig[relatedDossier.status]?.color || 'default'}>
                  {statusConfig[relatedDossier.status]?.label || relatedDossier.status}
                </Tag>
              </div>
              <Text className="block text-xs font-medium text-slate-800">
                {relatedDossier.name}
              </Text>
              {relatedDossier.customer?.displayName ? (
                <Text className="block text-xs text-slate-500">
                  Khách hàng: {relatedDossier.customer.displayName}
                </Text>
              ) : null}
              {relatedDossier.route ? (
                <Text className="block text-xs text-slate-500">
                  Hành trình: {relatedDossier.route}
                </Text>
              ) : null}
              <Link href={`/dossiers/${relatedDossier.id}`} className="block pt-1">
                <Button block size="small" type="dashed" className="text-xs text-[#007A55]">
                  Xem chi tiết hồ sơ
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
              <FolderOpenOutlined className="text-lg text-slate-400" />
              <Text className="mt-1 block text-xs text-slate-400">
                Hội thoại chung (Không gắn với hồ sơ tour)
              </Text>
            </div>
          )}
        </section>

        {/* Danh sách thành viên */}
        <section>
          <div className="flex items-center justify-between">
            <Text strong className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Thành viên ({activeConversation.members?.length || 0})
            </Text>
          </div>

          <div className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {activeConversation.members?.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2.5">
                <Avatar size={32} style={{ backgroundColor: '#0A2540' }}>
                  {getInitials(member.user?.fullName)}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Text strong className="block truncate text-xs text-slate-800">
                    {member.user?.fullName || 'Thành viên'}
                    {member.userId === currentUserId ? ' (Bạn)' : ''}
                  </Text>
                  <Text className="block truncate text-[11px] text-slate-400">
                    {member.user?.email || member.user?.employeeCode || '-'}
                  </Text>
                </div>
                {member.role === 'ADMIN' ? (
                  <Tag color="gold" className="text-[10px] m-0">
                    Quản trị
                  </Tag>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export default ConversationInfoSidebar;
