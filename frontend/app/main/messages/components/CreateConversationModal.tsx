'use client';

import React from 'react';
import { Input, Modal, Select } from 'antd';
import { UserItem } from '@/types/user';

export interface CreateConversationModalProps {
  isOpen: boolean;
  isLoading: boolean;
  newConvName: string;
  onNameChange: (val: string) => void;
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  allUsers: UserItem[];
  currentUserId?: string;
  onOk: () => void;
  onCancel: () => void;
}

export function CreateConversationModal({
  isOpen,
  isLoading,
  newConvName,
  onNameChange,
  selectedUserIds,
  onSelectedUserIdsChange,
  allUsers,
  currentUserId,
  onOk,
  onCancel,
}: CreateConversationModalProps) {
  return (
    <Modal
      title="Tạo cuộc trò chuyện mới"
      open={isOpen}
      onOk={onOk}
      onCancel={onCancel}
      confirmLoading={isLoading}
      okText="Tạo cuộc trò chuyện"
      cancelText="Hủy"
      okButtonProps={{ className: 'bg-[#007A55]' }}
    >
      <div className="space-y-4 pt-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tên cuộc trò chuyện (Tùy chọn)
          </label>
          <Input
            placeholder="VD: Nhóm xử lý Tour Nhật Bản hè 2026"
            value={newConvName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Chọn người tham gia <span className="text-red-500">*</span>
          </label>
          <Select
            mode="multiple"
            className="w-full"
            placeholder="Chọn các thành viên..."
            value={selectedUserIds}
            onChange={onSelectedUserIdsChange}
            options={allUsers
              .filter((u: UserItem) => u.id !== currentUserId)
              .map((u: UserItem) => ({
                label: `${u.fullName} (${u.email})`,
                value: u.id,
              }))}
          />
        </div>
      </div>
    </Modal>
  );
}
