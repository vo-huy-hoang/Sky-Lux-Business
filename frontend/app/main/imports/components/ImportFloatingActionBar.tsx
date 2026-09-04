'use client';

import React from 'react';
import { Button, Popconfirm, Space } from 'antd';
import {
  InfoCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { ImportSession } from '@/types/import';

export interface ImportFloatingActionBarProps {
  session?: ImportSession;
  isValidating: boolean;
  isConfirming: boolean;
  canConfirm: boolean;
  onValidate: () => void;
  onConfirm: () => void;
}

export function ImportFloatingActionBar({
  session,
  isValidating,
  isConfirming,
  canConfirm,
  onValidate,
  onConfirm,
}: ImportFloatingActionBarProps) {
  return (
    <div className="fixed bottom-0 left-[228px] right-0 z-20 border-t border-[var(--color-border)] bg-white px-7 py-4 shadow-[0_-10px_30px_rgb(16_24_40/0.06)] max-lg:left-[72px]">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Space className="text-sm text-slate-500">
          <InfoCircleOutlined className="text-[var(--color-primary-600)]" />
          <span>Tự động lưu trạng thái kiểm tra theo phiên import</span>
        </Space>
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={onValidate}
            loading={isValidating || session?.status === 'PROCESSING'}
          >
            Kiểm tra file
          </Button>
          <Popconfirm
            title="Xác nhận import chính thức"
            description={`Bạn có chắc chắn muốn nhập ${session?.validRows || 0} dòng hợp lệ vào cơ sở dữ liệu?`}
            onConfirm={onConfirm}
            disabled={!canConfirm}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button
              icon={<RocketOutlined />}
              loading={isConfirming}
              disabled={!canConfirm}
              className="skylux-primary-button"
            >
              Xác nhận import
            </Button>
          </Popconfirm>
        </Space>
      </div>
    </div>
  );
}
