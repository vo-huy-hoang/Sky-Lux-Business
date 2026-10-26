'use client';

import React from 'react';
import { Button, Card, Col, Row, Spin, Typography, Upload } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelFilled,
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
    <Row gutter={[16, 16]}>
      {/* 1. Tải mẫu file dự toán chuẩn */}
      <Col xs={24} md={12}>
        <Card
          className="skylux-card shadow-xs rounded-xl overflow-hidden h-full border border-[#E5E8E6]"
          styles={{
            header: {
              borderBottom: '1px solid #EEF1EF',
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E293B',
            },
            body: { padding: '16px 18px' },
          }}
          title="1. Tải mẫu file dự toán chuẩn"
        >
          <div className="flex items-center justify-between gap-3 h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-xs shrink-0">
                <FileExcelFilled />
              </div>
              <div>
                <Text strong className="text-xs text-slate-800 block">
                  Mẫu dự toán SkyLux Travel.xlsx
                </Text>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Định dạng chuẩn (.xlsx) • Cập nhật 20/05/2025
                </div>
              </div>
            </div>

            <Button
              icon={<DownloadOutlined />}
              onClick={onDownloadSample}
              className="text-xs font-semibold text-emerald-800 border-emerald-300 hover:text-emerald-900 hover:border-emerald-600 hover:bg-emerald-50 rounded-lg px-3 shrink-0 cursor-pointer"
            >
              Tải xuống
            </Button>
          </div>
        </Card>
      </Col>

      {/* 2. Tải lên file dự toán */}
      <Col xs={24} md={12}>
        <Card
          className="skylux-card shadow-xs rounded-xl overflow-hidden h-full border border-[#E5E8E6]"
          styles={{
            header: {
              borderBottom: '1px solid #EEF1EF',
              padding: '12px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E293B',
            },
            body: { padding: '14px 18px' },
          }}
          title="2. Tải lên file dự toán"
        >
          <Dragger
            accept=".xlsx, .xls"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              onUploadFile(file);
              return false;
            }}
            disabled={isUploading}
            className="rounded-xl border border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors cursor-pointer"
            style={{ padding: '14px 12px', background: 'transparent' }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              {isUploading ? (
                <div className="py-2">
                  <Spin size="medium" />
                  <div className="text-xs font-semibold text-emerald-800 mt-2">
                    Đang xử lý tải lên...
                  </div>
                </div>
              ) : (
                <>
                  <CloudUploadOutlined className="text-3xl text-emerald-700 mb-1" />
                  <div className="text-xs font-bold text-slate-700">
                    Kéo & thả file Excel vào đây
                  </div>
                  <div className="text-[11px] text-slate-400 my-1">hoặc</div>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:border-emerald-500 shadow-2xs transition-colors cursor-pointer"
                  >
                    Chọn file từ máy tính
                  </button>
                  <div className="text-[10px] text-slate-400 mt-1.5">
                    Chỉ hỗ trợ file .xlsx, tối đa 20MB
                  </div>
                </>
              )}
            </div>
          </Dragger>
        </Card>
      </Col>
    </Row>
  );
}

export default ImportUploadZone;
