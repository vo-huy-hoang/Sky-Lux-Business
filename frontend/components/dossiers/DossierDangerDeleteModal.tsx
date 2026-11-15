'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Alert, Input, Typography, Space, Button } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface DossierDangerDeleteModalProps {
  open: boolean;
  dossier: {
    id?: string;
    code?: string;
    name?: string;
    status?: string;
  } | null | undefined;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function DossierDangerDeleteModal({
  open,
  dossier,
  onClose,
  onConfirm,
  isLoading = false,
}: DossierDangerDeleteModalProps) {
  const [inputCode, setInputCode] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setInputCode('');
      setReason('');
    }
  }, [open, dossier]);

  const dossierCode = dossier?.code || '';
  const isCodeMatched = inputCode.trim() === dossierCode;
  const isReasonValid = reason.trim().length > 0;
  const canConfirm = isCodeMatched && isReasonValid && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm(reason.trim());
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space className="text-rose-600 font-bold text-base">
          <ExclamationCircleOutlined />
          <span>Xác nhận xóa hồ sơ nguy cơ cao</span>
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
          Xác nhận xóa vĩnh viễn
        </Button>,
      ]}
      destroyOnHidden
      mask={{ closable: !isLoading }}
    >
      <div className="space-y-4 py-2">
        <Alert
          type="error"
          showIcon
          title="Cảnh báo rủi ro dữ liệu"
          description="Đây là hồ sơ đã được duyệt hoặc hoàn tất. Hành động xóa sẽ loại bỏ hồ sơ và toàn bộ các dự toán chi phí liên quan. Để tránh xóa nhầm, bạn bắt buộc phải nhập lại chính xác Mã hồ sơ và lý do xóa."
        />

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Mã hồ sơ cần xác nhận:</div>
          <div className="text-base font-mono font-bold text-rose-600 select-all tracking-wider">
            {dossierCode}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nhập lại chính xác mã hồ sơ: <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder={`Gõ đúng "${dossierCode}" để mở khóa`}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            disabled={isLoading}
            status={inputCode && !isCodeMatched ? 'error' : ''}
            aria-label="Nhập lại mã hồ sơ để xác nhận"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Lý do xóa hồ sơ (bắt buộc): <span className="text-rose-500">*</span>
          </label>
          <Input.TextArea
            rows={3}
            placeholder="Nêu rõ lý do xóa (ví dụ: tạo thử nghiệm sai thông tin, khách hàng hủy trước khi phát sinh tiền...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            maxLength={500}
            showCount
            aria-label="Lý do xóa hồ sơ"
          />
        </div>
      </div>
    </Modal>
  );
}

export default DossierDangerDeleteModal;
