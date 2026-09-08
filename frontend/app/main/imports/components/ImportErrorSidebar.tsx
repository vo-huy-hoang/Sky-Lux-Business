'use client';

import React from 'react';
import { Card, Empty, Space, Typography } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import {
  ImportError,
  ImportSession,
  PaginatedImportErrorsResponse,
} from '@/types/import';

const { Text } = Typography;

export interface ImportErrorSidebarProps {
  session?: ImportSession;
  errorsData?: PaginatedImportErrorsResponse;
}

export function ImportErrorSidebar({
  session,
  errorsData,
}: ImportErrorSidebarProps) {
  return (
    <>
      <Card className="skylux-card" title={`Lỗi cần xử lý (${session?.errorRows || 0})`}>
        {errorsData?.data?.length ? (
          <div className="space-y-4">
            {errorsData.data.slice(0, 6).map((error: ImportError, idx: number) => (
              <div
                key={error.id || `${error.rowNumber}-${error.errorCode}-${idx}`}
                className="border-b border-[var(--color-divider)] pb-4 last:border-b-0"
              >
                <Space align="start">
                  <CloseCircleOutlined className="mt-1 text-[var(--color-danger)]" />
                  <div>
                    <Text strong>
                      Dòng {error.rowNumber} - {error.columnName || error.errorCode}
                    </Text>
                    <div className="mt-1 text-sm text-slate-500">{error.errorMessage}</div>
                  </div>
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="Chưa có lỗi từ API" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card className="skylux-card mt-5" title="Ghi chú của điều hành">
        <div className="min-h-[150px] rounded-lg border border-[var(--color-border)] bg-[#F9FAFA] p-4 text-sm text-slate-400">
          Chưa có ghi chú nào.
        </div>
      </Card>
    </>
  );
}
