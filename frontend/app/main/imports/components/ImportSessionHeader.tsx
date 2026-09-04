'use client';

import React from 'react';
import { Alert, Button, Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import { ImportSession } from '@/types/import';
import { renderStatusTag } from '../types';

const { Text } = Typography;

export interface ImportSessionHeaderProps {
  currentSessionId: string;
  session?: ImportSession;
  isLoadingSession: boolean;
  onResetSession: () => void;
}

export function ImportSessionHeader({
  currentSessionId,
  session,
  isLoadingSession,
  onResetSession,
}: ImportSessionHeaderProps) {
  return (
    <>
      <Card className="skylux-card" loading={isLoadingSession}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={8}>
            <Space size={16}>
              <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                <FileExcelOutlined />
              </span>
              <div>
                <Text strong>Phiên import hiện tại</Text>
                <div className="mt-1 text-sm text-slate-500">ID: {currentSessionId}</div>
              </div>
            </Space>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <Statistic title="Trạng thái" valueRender={() => renderStatusTag(session?.status)} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic title="Tổng dòng" value={session?.totalRows || 0} />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic
              title="Hợp lệ"
              value={session?.validRows || 0}
              styles={{ content: { color: '#007A55' } }}
            />
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Statistic
              title="Dòng lỗi"
              value={session?.errorRows || 0}
              styles={{
                content: { color: session?.errorRows ? '#D93737' : '#6B7280' },
              }}
            />
          </Col>
          <Col xs={24} lg={3} className="text-right">
            <Button icon={<DeleteOutlined />} onClick={onResetSession}>
              File mới
            </Button>
          </Col>
        </Row>
      </Card>

      {(session?.errorRows || 0) > 0 && session?.status !== 'CONFIRMED' && (
        <Alert
          type="warning"
          showIcon
          title="Phiên nhập có dòng dữ liệu lỗi"
          description="Vui lòng sửa các dòng lỗi trong bảng trước khi xác nhận import."
        />
      )}
    </>
  );
}
