'use client';

import React from 'react';
import { Input, Modal, Select } from 'antd';
import { UserItem } from '@/types/user';
import { useCreateConversationFlow } from '../hooks/useCreateConversationFlow';

/**
 * TICKET-43.1: Giao diện tinh giản theo chuẩn DRY
 * Bỏ toàn bộ 9 adapter props cũ (Speculative Generality)
 * Modal kết nối trực tiếp với useCreateConversationFlow
 */
export interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newConversationId: string) => void;
}

export function CreateConversationModal({
  isOpen,
  onClose,
  onCreated,
}: CreateConversationModalProps) {
  const flow = useCreateConversationFlow({
    isOpen,
    onClose,
    onCreated,
  });

  return (
    <Modal
      title="Tạo cuộc trò chuyện mới"
      open={isOpen}
      onOk={flow.handleOk}
      onCancel={flow.handleCancel}
      confirmLoading={flow.isCreating}
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
            value={flow.newConvName}
            onChange={(e) => flow.setNewConvName(e.target.value)}
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
            value={flow.selectedUserIds}
            onChange={flow.setSelectedUserIds}
            options={flow.allUsers
              .filter((u: UserItem) => u.id !== flow.user?.id)
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

export default CreateConversationModal;
