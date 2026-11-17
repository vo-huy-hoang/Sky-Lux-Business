'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Alert, Input, Space, Button } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export interface DossierPurgeModalProps {
  open: boolean;
  dossier: {
    id?: string;
    code?: string;
    name?: string;
  } | null | undefined;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function DossierPurgeModal({
  open,
  dossier,
  onClose,
  onConfirm,
  isLoading = false,
}: DossierPurgeModalProps) {
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    if (open) {
      setInputCode('');
    }
  }, [open, dossier]);

  const dossierCode = dossier?.code || '';
  const isCodeMatched = inputCode.trim() === dossierCode;
  const canConfirm = isCodeMatched && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space className="text-rose-600 font-bold text-base">
          <ExclamationCircleOutlined />
          <span>Xác nhận xóa vĩnh viễn hồ sơ</span>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isLoading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger
          icon={<DeleteOutlined />}
          disabled={!canConfirm}
          loading={isLoading}
          onClick={handleConfirm}
        >
          Xóa vĩnh viễn khỏi hệ thống
        </Button>,
      ]}
      destroyOnHidden
      mask={{ closable: !isLoading }}
    >
      <div className="space-y-4 py-2">
        <Alert
          type="error"
          showIcon
          title="Hành động không thể hoàn tác"
          description={
            <div>
              Hồ sơ tour và toàn bộ dự toán chi phí liên quan sẽ bị{' '}
              <strong>xóa vĩnh viễn khỏi cơ sở dữ liệu</strong>. Bạn sẽ không
              thể khôi phục lại hồ sơ này sau khi xóa.
            </div>
          }
        />

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Mã hồ sơ cần xóa vĩnh viễn:</div>
          <div className="text-base font-mono font-bold text-rose-600 select-all tracking-wider">
            {dossierCode}
          </div>
          {dossier?.name && (
            <div className="text-xs text-slate-600 mt-1 truncate">
              {dossier.name}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nhập lại chính xác mã hồ sơ để xác nhận: <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder={`Gõ đúng "${dossierCode}"`}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            onPressEnter={() => {
              if (canConfirm) handleConfirm();
            }}
            disabled={isLoading}
            status={inputCode && !isCodeMatched ? 'warning' : ''}
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
}
