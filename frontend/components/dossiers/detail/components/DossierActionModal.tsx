'use client';

import React from 'react';
import { Modal, Input } from 'antd';
import { useDossierUIStore } from '../stores/useDossierUIStore';
import { WORKFLOW_ACTION_CONFIG } from '../types';

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

  const config = modalAction ? WORKFLOW_ACTION_CONFIG[modalAction] : null;

  return (
    <Modal
      open={modalAction !== null}
      title={config?.title || 'Thao tác hồ sơ tour'}
      okText={config?.okText || 'Xác nhận'}
      cancelText="Hủy bỏ"
      okButtonProps={{
        className: config?.buttonClass || 'skylux-primary-button',
        loading: isActionLoading,
      }}
      onOk={onConfirm}
      onCancel={resetModal}
    >
      <div className="space-y-3 py-2">
        <p className="text-sm text-slate-600">
          {config?.description}
        </p>
        <TextArea
          rows={4}
          value={actionNote}
          onChange={(e) => setActionNote(e.target.value)}
          placeholder={config?.placeholder || 'Nhập ghi chú...'}
        />
      </div>
    </Modal>
  );
}
