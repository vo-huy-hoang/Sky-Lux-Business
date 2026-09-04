'use client';

import React from 'react';
import { Modal, Input } from 'antd';
import { useDossierUIStore } from '../stores/useDossierUIStore';

const { TextArea } = Input;

export interface DossierActionModalProps {
  isActionLoading: boolean;
  onConfirm: () => void;
}

export function DossierActionModal({
  isActionLoading,
  onConfirm,
}: DossierActionModalProps) {
  const modalAction = useDossierUIStore((s) => s.modalAction);
  const actionNote = useDossierUIStore((s) => s.actionNote);
  const setActionNote = useDossierUIStore((s) => s.setActionNote);
  const resetModal = useDossierUIStore((s) => s.resetModal);

  return (
    <Modal
      open={modalAction !== null}
      title={
        modalAction === 'APPROVE'
          ? 'Xác nhận phê duyệt hồ sơ tour'
          : modalAction === 'REQUEST_CHANGES'
          ? 'Yêu cầu Sales bổ sung hồ sơ tour'
          : modalAction === 'LOCK'
          ? 'Khóa hồ sơ tour'
          : 'Hoàn tất hồ sơ tour'
      }
      okText={
        modalAction === 'APPROVE'
          ? 'Phê duyệt ngay'
          : modalAction === 'REQUEST_CHANGES'
          ? 'Gửi yêu cầu bổ sung'
          : modalAction === 'LOCK'
          ? 'Xác nhận khóa'
          : 'Xác nhận hoàn tất'
      }
      cancelText="Hủy bỏ"
      okButtonProps={{
        className:
          modalAction === 'REQUEST_CHANGES'
            ? 'bg-amber-600 hover:bg-amber-700'
            : modalAction === 'LOCK'
            ? 'bg-red-600 hover:bg-red-700'
            : 'skylux-primary-button',
        loading: isActionLoading,
      }}
      onOk={onConfirm}
      onCancel={resetModal}
    >
      <div className="space-y-3 py-2">
        <p className="text-sm text-slate-600">
          {modalAction === 'APPROVE'
            ? 'Bạn đang phê duyệt hồ sơ tour này. Sau khi duyệt, hồ sơ sẽ chuyển sang trạng thái ĐÃ DUYỆT.'
            : modalAction === 'REQUEST_CHANGES'
            ? 'Vui lòng nhập chi tiết các thông tin, tài liệu hoặc số liệu dự toán cần chuyên viên kinh doanh (Sales) bổ sung:'
            : modalAction === 'LOCK'
            ? 'Hồ sơ sau khi khóa sẽ không thể chỉnh sửa thêm bất kỳ thông tin nào.'
            : 'Xác nhận hoàn tất toàn bộ quy trình cho hồ sơ tour này.'}
        </p>
        <TextArea
          rows={4}
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          placeholder={
            modalAction === 'REQUEST_CHANGES'
              ? 'Nhập chi tiết yêu cầu bổ sung (Bắt buộc)...'
              : 'Nhập ghi chú hoặc lời nhắn nội bộ (Tùy chọn)...'
          }
        />
      </div>
    </Modal>
  );
}
