'use client';

import React from 'react';
import { Card, Popconfirm, Tooltip } from 'antd';
import { DeleteOutlined, FileExcelFilled } from '@ant-design/icons';
import { ImportSession } from '@/types/import';

export interface ImportSelectedFileCardProps {
  session?: ImportSession;
  onResetSession: () => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '1.25 MB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUploadTime(createdAt?: string): string {
  if (!createdAt) return '10:32 20/05/2025';
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return '10:32 20/05/2025';
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${time} ${day}`;
}

export function ImportSelectedFileCard({
  session,
  onResetSession,
}: ImportSelectedFileCardProps) {
  const fileName = session?.fileName || 'Du_toan_Nhom_ABC_20052025.xlsx';
  const sizeText = formatBytes(session?.fileSize);
  const timeText = formatUploadTime(session?.createdAt);

  return (
    <Card
      className="skylux-card shadow-xs rounded-xl overflow-hidden border border-[#E5E8E6]"
      styles={{
        header: {
          borderBottom: '1px solid #EEF1EF',
          padding: '12px 18px',
          fontWeight: 700,
          fontSize: '14px',
          color: '#1E293B',
        },
        body: { padding: '12px 18px' },
      }}
      title="3. File đã chọn"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
            <FileExcelFilled />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate" title={fileName}>
              {fileName}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {sizeText} • Đã tải lên lúc {timeText}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-[#EDF8F4] text-[#007A55] border border-emerald-200/60">
            Đã tải lên thành công
          </span>

          <Popconfirm
            title="Xác nhận tải lại file mới?"
            description="Dữ liệu xem trước hiện tại sẽ bị xóa để bạn tải tệp mới."
            onConfirm={onResetSession}
            okText="Đồng ý"
            cancelText="Hủy"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelButtonProps={{ size: 'small' }}
            placement="bottomRight"
          >
            <Tooltip title="Xóa file">
              <button
                type="button"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-slate-200/80 hover:border-rose-200 bg-white"
              >
                <DeleteOutlined className="text-sm" />
              </button>
            </Tooltip>
          </Popconfirm>
        </div>
      </div>
    </Card>
  );
}

export default ImportSelectedFileCard;
