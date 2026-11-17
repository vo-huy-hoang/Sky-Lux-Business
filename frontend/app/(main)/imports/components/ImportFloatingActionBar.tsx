'use client';

import React from 'react';
import { Button, Popconfirm } from 'antd';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ImportSession, PaginatedImportRowsResponse } from '@/types/import';
import { useUIStore } from '@/lib/stores/ui-store';

export interface ImportFloatingActionBarProps {
  session?: ImportSession;
  previewData?: PaginatedImportRowsResponse;
  isValidating: boolean;
  isConfirming: boolean;
  canConfirm: boolean;
  onValidate: () => void;
  onConfirm: () => void;
  onResetSession?: () => void;
}

export function ImportFloatingActionBar({
  session,
  previewData,
  isValidating,
  isConfirming,
  canConfirm,
  onValidate,
  onConfirm,
  onResetSession,
}: ImportFloatingActionBarProps) {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);

  const duplicateWarningCount =
    session?.summary?.warningRows ??
    previewData?.data?.filter(
      (r) =>
        r.warnings?.some((w) => w.type === 'DUPLICATE_ACTIVE_DOSSIER') ||
        (r.normalizedData?.warnings as any[])?.some(
          (w: any) => w.type === 'DUPLICATE_ACTIVE_DOSSIER',
        ),
    ).length ??
    0;

  return (
    <div
      className={`fixed bottom-0 right-0 z-20 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-md px-7 py-3.5 shadow-[0_-8px_25px_rgba(0,0,0,0.05)] transition-[left] duration-200 ease-in-out ${
        sidebarCollapsed ? 'left-0 lg:left-[72px]' : 'left-0 lg:left-[238px]'
      }`}
    >
      <div className="mx-auto flex max-w-[1540px] items-center justify-between gap-3">
        {/* Left Action: Tải lại file */}
        <div>
          {onResetSession && (
            <Popconfirm
              title="Tải lại file mới?"
              description="Dữ liệu xem trước hiện tại sẽ bị xóa để bạn tải file khác."
              onConfirm={onResetSession}
              okText="Đồng ý"
              cancelText="Hủy"
              okButtonProps={{ size: 'small' }}
              cancelButtonProps={{ size: 'small' }}
            >
              <Button
                icon={<ReloadOutlined />}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300 hover:border-slate-400 rounded-lg px-4 h-9 cursor-pointer"
              >
                Tải lại file
              </Button>
            </Popconfirm>
          )}
        </div>

        {/* Right Actions: Kiểm tra file & Xác nhận import */}
        <div className="flex items-center gap-3">
          <Button
            icon={<CheckCircleOutlined className="text-emerald-700" />}
            onClick={onValidate}
            loading={isValidating || session?.status === 'PROCESSING'}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 border-emerald-600 hover:border-emerald-700 rounded-lg px-5 h-9 cursor-pointer bg-white"
          >
            Kiểm tra file
          </Button>

          <Popconfirm
            title={
              duplicateWarningCount > 0
                ? "Xác nhận nhập dữ liệu dù có cảnh báo trùng lặp?"
                : "Xác nhận import dữ liệu?"
            }
            description={
              !canConfirm
                ? `Có ${session?.errorRows || 0} hồ sơ lỗi. Hãy sửa lỗi trước khi import.`
                : duplicateWarningCount > 0
                  ? `⚠️ Phát hiện ${duplicateWarningCount} dòng trùng với hồ sơ đang chạy trong hệ thống. Nhập tiếp sẽ tạo bản ghi mới độc lập. Bạn có chắc chắn muốn tiếp tục?`
                  : `Xác nhận nhập ${session?.validRows || 0} hồ sơ hợp lệ? Cảnh báo chi tiết không chặn import.`
            }
            styles={{
              root: { maxWidth: 'min(460px, calc(100vw - 32px))' },
              content: { maxWidth: 420 },
            }}
            onConfirm={onConfirm}
            disabled={!canConfirm}
            okText={
              duplicateWarningCount > 0
                ? "Vẫn tiếp tục nhập"
                : "Xác nhận import"
            }
            cancelText="Hủy"
            okButtonProps={{
              size: 'small',
              className:
                duplicateWarningCount > 0
                  ? 'bg-amber-700 hover:bg-amber-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white',
            }}
            cancelButtonProps={{ size: 'small' }}
          >
            <button
              type="button"
              disabled={!canConfirm || isConfirming}
              className={`inline-flex items-center gap-2 px-5 h-9 rounded-lg text-xs font-bold text-white transition-all shadow-xs ${
                canConfirm && !isConfirming
                  ? duplicateWarningCount > 0
                    ? 'bg-amber-700 hover:bg-amber-800 active:bg-amber-900 cursor-pointer hover:shadow-md'
                    : 'bg-[var(--color-primary-800)] hover:bg-[var(--color-primary-900)] active:bg-[var(--color-primary-900)] cursor-pointer hover:shadow-md'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CloudUploadOutlined className="text-sm" />
              <span>
                {isConfirming
                  ? 'Đang import...'
                  : duplicateWarningCount > 0
                    ? `Nhập ${session?.validRows || 0} hồ sơ (có cảnh báo)`
                    : 'Xác nhận import'}
              </span>
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}

export default ImportFloatingActionBar;
