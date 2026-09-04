'use client';

import React from 'react';
import { Col, Row, Typography } from 'antd';
import { useImportFlow } from './hooks/useImportFlow';
import {
  ImportConfirmedResult,
  ImportErrorSidebar,
  ImportFloatingActionBar,
  ImportPreviewTable,
  ImportSessionHeader,
  ImportUploadZone,
  RowEditModal,
} from './components';

export default function ImportsPage() {
  const flow = useImportFlow();

  const handleResetSession = () => {
    flow.setCurrentSessionId(null);
    flow.setActiveTab('ALL');
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">
          Import dự toán Excel
        </h1>
        <p className="text-xs text-slate-500 mb-0">
          Tạo dự toán mới bằng cách import file Excel theo mẫu chuẩn của SkyLux Travel.
        </p>
      </div>

      {!flow.currentSessionId ? (
        <ImportUploadZone
          onDownloadSample={flow.handleDownloadSample}
          onUploadFile={(file) => flow.uploadMutation.mutate(file)}
          isUploading={flow.uploadMutation.isPending}
        />
      ) : (
        <div className="space-y-5">
          <ImportSessionHeader
            currentSessionId={flow.currentSessionId}
            session={flow.session}
            isLoadingSession={flow.isLoadingSession}
            onResetSession={handleResetSession}
          />

          {flow.session?.status === 'CONFIRMED' ? (
            <ImportConfirmedResult
              session={flow.session}
              onResetSession={handleResetSession}
            />
          ) : (
            <Row gutter={[18, 18]}>
              <Col xs={24} xl={18}>
                <ImportPreviewTable
                  session={flow.session}
                  previewData={flow.previewData}
                  errorsData={flow.errorsData}
                  isLoading={flow.isLoadingPreview || flow.isLoadingSession}
                  activeTab={flow.activeTab}
                  onTabChange={(tab) => {
                    flow.setActiveTab(tab);
                    flow.setPage(1);
                  }}
                  page={flow.page}
                  pageSize={flow.pageSize}
                  onPageChange={(nextPage, nextPageSize) => {
                    flow.setPage(nextPage);
                    flow.setPageSize(nextPageSize);
                  }}
                  onRowEdit={flow.handleRowEdit}
                />
              </Col>
              <Col xs={24} xl={6}>
                <ImportErrorSidebar
                  session={flow.session}
                  errorsData={flow.errorsData}
                />
              </Col>
            </Row>
          )}
        </div>
      )}

      {flow.currentSessionId && flow.session?.status !== 'CONFIRMED' && (
        <ImportFloatingActionBar
          session={flow.session}
          isValidating={flow.validateMutation.isPending}
          isConfirming={flow.confirmMutation.isPending}
          canConfirm={flow.canConfirm}
          onValidate={() => flow.validateMutation.mutate()}
          onConfirm={() => flow.confirmMutation.mutate()}
        />
      )}

      <RowEditModal
        visible={flow.isEditModalOpen}
        sessionId={flow.currentSessionId || ''}
        row={flow.editingRow}
        onClose={() => {
          flow.setIsEditModalOpen(false);
          flow.setEditingRow(null);
        }}
        onSuccess={() => {
          flow.refetchSession();
          flow.refetchPreview();
        }}
      />
    </div>
  );
}
