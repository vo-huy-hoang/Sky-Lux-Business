'use client';

import React from 'react';
import { Alert, Button, Card, Col, Row, Space, Spin, Typography, Upload } from 'antd';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Dragger } = Upload;

export interface ImportUploadZoneProps {
  onDownloadSample: () => void;
  onUploadFile: (file: File) => void;
  isUploading: boolean;
}

export function ImportUploadZone({
  onDownloadSample,
  onUploadFile,
  isUploading,
}: ImportUploadZoneProps) {
  return (
    <Row gutter={[18, 18]}>
      <Col xs={24} xl={16}>
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={12}>
            <Card className="skylux-card h-full" title="Tải mẫu file dự toán chuẩn">
              <div className="flex items-center justify-between gap-5">
                <Space size={16}>
                  <span className="skylux-icon-bubble bg-[var(--color-primary-soft)] text-[var(--color-primary-600)]">
                    <FileExcelOutlined />
                  </span>
                  <div>
                    <Text strong>Mẫu dự toán SkyLux Travel.xlsx</Text>
                    <div className="mt-1 text-sm text-slate-500">Định dạng chuẩn .xlsx</div>
                  </div>
                </Space>
                <Button
                  icon={<DownloadOutlined />}
                  className="skylux-outline-button"
                  onClick={onDownloadSample}
                >
                  Tải xuống
                </Button>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card className="skylux-card h-full" title="Tải lên file dự toán">
              <Dragger
                accept=".xlsx, .xls"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  onUploadFile(file);
                  return false;
                }}
                disabled={isUploading}
                className="rounded-lg"
                style={{ padding: '18px 12px', background: '#FFFFFF', borderColor: '#B7D3C7' }}
              >
                <div className="ant-upload-drag-icon">
                  {isUploading ? (
                    <Spin size="large" />
                  ) : (
                    <CloudUploadOutlined style={{ fontSize: 40, color: '#003828' }} />
                  )}
                </div>
                <div className="ant-upload-text font-semibold">
                  {isUploading ? 'Đang tải lên và xử lý tệp...' : 'Kéo thả file Excel vào đây'}
                </div>
                <div className="ant-upload-hint text-xs text-slate-500 mt-1">
                  Chỉ hỗ trợ .xlsx, .xls, tối đa 10MB
                </div>
              </Dragger>
            </Card>
          </Col>
        </Row>
      </Col>
      <Col xs={24} xl={8}>
        <Card className="skylux-card h-full" title="Lưu ý kiểm tra dữ liệu">
          <div className="space-y-3 text-sm text-slate-700">
            {[
              'File phải có định dạng .xlsx hoặc .xls',
              'Dùng cấu trúc theo mẫu, không thêm hoặc xóa cột',
              'Dòng tiêu đề nằm ở dòng đầu tiên',
              'Không để trống mã hồ sơ và tên khách hàng',
              'Có thể sửa lỗi trực tiếp sau khi tải lên',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircleOutlined className="mt-1 text-[var(--color-primary-600)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <Alert
            className="mt-5"
            type="success"
            showIcon
            title="Chỉ những dòng hợp lệ mới được import."
          />
        </Card>
      </Col>
    </Row>
  );
}
