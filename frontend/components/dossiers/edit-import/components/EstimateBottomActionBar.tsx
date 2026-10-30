'use client';

import React from 'react';
import { Button, Tag } from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  RollbackOutlined,
  LockOutlined,
} from '@ant-design/icons';

interface EstimateBottomActionBarProps {
  dossierStatus?: string;
  canOperate: boolean;
  lastSavedTime: string;
  isSaving: boolean;
  sidebarCollapsed: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSaveAndSubmit: () => void;
}

export const EstimateBottomActionBar: React.FC<
  EstimateBottomActionBarProps
> = ({
  dossierStatus,
  canOperate,
  lastSavedTime,
  isSaving,
  sidebarCollapsed,
  onCancel,
  onSaveDraft,
  onSaveAndSubmit,
}) => {
  return (
    <div
      className={`fixed bottom-0 right-0 z-30 bg-white border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between transition-[left] duration-200 ease-in-out ${
        sidebarCollapsed ? 'left-0 lg:left-[72px]' : 'left-0 lg:left-[238px]'
      }`}
    >
      {/* Left: Last saved status */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>Đã lưu lần cuối: {lastSavedTime}</span>
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Tự động lưu
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <Button
          icon={<RollbackOutlined />}
          onClick={onCancel}
          className="h-10 rounded-xl border-slate-200 text-slate-700 font-medium text-xs px-4"
        >
          {dossierStatus === 'LOCKED' ? 'Quay lại chi tiết' : 'Hủy'}
        </Button>

        {dossierStatus === 'LOCKED' ? (
          <Tag
            color="red"
            icon={<LockOutlined />}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg m-0"
          >
            Hồ sơ đã khóa an toàn (Chỉ đọc)
          </Tag>
        ) : canOperate ? (
          <>
            <Button
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={onSaveDraft}
              className="h-10 rounded-xl border-slate-300 text-slate-700 font-semibold text-xs px-4 hover:border-emerald-700 hover:text-emerald-700"
            >
              Lưu tạm
            </Button>

            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={isSaving}
              onClick={onSaveAndSubmit}
              className="h-10 rounded-xl bg-[var(--color-primary-950)] hover:bg-[var(--color-primary-850)] text-white font-semibold text-xs px-5 border-none shadow-md"
            >
              {['APPROVED', 'EDITING'].includes(dossierStatus || '')
                ? 'Gửi lại duyệt'
                : 'Lưu thay đổi'}
            </Button>
          </>
        ) : (
          <>
            <Button
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={onSaveDraft}
              className="h-10 rounded-xl border-slate-300 text-slate-700 font-semibold text-xs px-4"
            >
              Lưu nháp
            </Button>

            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={isSaving}
              onClick={onSaveAndSubmit}
              className="h-10 rounded-xl bg-[var(--color-primary-950)] hover:bg-[var(--color-primary-850)] text-white font-semibold text-xs px-5 border-none shadow-md"
            >
              {['APPROVED', 'EDITING'].includes(dossierStatus || '')
                ? 'Gửi lại duyệt'
                : 'Lưu thay đổi'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
