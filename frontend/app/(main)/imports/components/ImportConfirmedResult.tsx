'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Result } from 'antd';
import { ImportSession } from '@/types/import';

export interface ImportConfirmedResultProps {
  session?: ImportSession;
  onResetSession: () => void;
}

export function ImportConfirmedResult({
  session,
  onResetSession,
}: ImportConfirmedResultProps) {
  const router = useRouter();

  return (
    <Card className="skylux-card">
      <Result
        status="success"
        title="Nhập dữ liệu thành công"
        subTitle={`Toàn bộ ${session?.validRows || 0} hồ sơ và thông tin khách hàng đã được lưu trữ thành công.`}
        extra={[
          <Button
            type="primary"
            className="skylux-primary-button"
            key="dossiers"
            onClick={() => router.push('/dossiers')}
          >
            Xem danh sách hồ sơ
          </Button>,
          <Button key="new" onClick={onResetSession}>
            Import file khác
          </Button>,
        ]}
      />
    </Card>
  );
}
