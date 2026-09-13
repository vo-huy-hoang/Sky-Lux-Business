"use client";

import React from "react";
import { Col, Row } from "antd";
import { useImportFlow } from "./hooks/useImportFlow";
import {
  ImportConfirmedResult,
  ImportErrorSidebar,
  ImportFloatingActionBar,
  ImportPreviewTable,
  ImportSelectedFileCard,
  ImportUploadZone,
} from "./components";

export default function ImportsPage() {
  const flow = useImportFlow();

  const handleResetSession = () => {
    flow.setCurrentSessionId(null);
    flow.setActiveTab("ALL");
  };

  return (
    <div className="space-y-4 pb-28 max-w-[1600px] mx-auto">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">
          Import dự toán Excel
        </h1>
        <p className="text-xs text-slate-500 mb-0">
          Tạo dự toán mới bằng cách import file Excel theo mẫu chuẩn của SkyLux
          Travel.
        </p>
      </div>

      {/* Main 2-Column Grid matching 100% reference mockup */}
      <Row gutter={[16, 16]}>
        {/* Left Column: Sections 1, 2, 3, 4 */}
        <Col xs={24} xl={17} className="space-y-4">
          {/* 1. Tải mẫu file dự toán chuẩn & 2. Tải lên file dự toán */}
          <ImportUploadZone
            onDownloadSample={flow.handleDownloadSample}
            onUploadFile={(file) => flow.uploadMutation.mutate(file)}
            isUploading={flow.uploadMutation.isPending}
          />

          {flow.session?.status === "CONFIRMED" ? (
            <ImportConfirmedResult
              session={flow.session}
              onResetSession={handleResetSession}
            />
          ) : (
            <>
              {/* 3. File đã chọn */}
              <ImportSelectedFileCard
                session={flow.session}
                onResetSession={handleResetSession}
              />

              {/* 4. Xem trước dữ liệu (10 dòng đầu tiên) */}
              <ImportPreviewTable
                session={flow.session}
                previewData={flow.previewData}
                errorsData={flow.errorsData}
                isLoading={flow.isLoadingPreview || flow.isLoadingSession}
              />
            </>
          )}
        </Col>

        {/* Right Column: Lưu ý kiểm tra dữ liệu & 5. Kết quả kiểm tra */}
        <Col xs={24} xl={7}>
          <ImportErrorSidebar
            session={flow.session}
            errorsData={flow.errorsData}
          />
        </Col>
      </Row>

      {/* Bottom Floating Action Bar */}
      <ImportFloatingActionBar
        session={flow.session}
        isValidating={flow.validateMutation.isPending}
        isConfirming={flow.confirmMutation.isPending}
        canConfirm={flow.canConfirm}
        onValidate={() => flow.validateMutation.mutate()}
        onConfirm={() => flow.confirmMutation.mutate()}
        onResetSession={handleResetSession}
      />
    </div>
  );
}
