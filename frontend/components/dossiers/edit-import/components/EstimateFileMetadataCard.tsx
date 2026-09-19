'use client';

import React, { useMemo } from 'react';
import { Card } from 'antd';
import { FileExcelFilled, FileExcelOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { documentsService } from '@/services/documents.service';
import { queryKeys } from '@/lib/query-keys';

interface EstimateFileMetadataCardProps {
  dossier: any;
  totalRowCount: number;
  validRowCount: number;
  errorRowCount: number;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const EstimateFileMetadataCard: React.FC<EstimateFileMetadataCardProps> = ({
  dossier,
  totalRowCount,
  validRowCount,
  errorRowCount,
}) => {
  const dossierId = dossier?.id;

  // Query real documents from dossier
  const { data: documentsData } = useQuery({
    queryKey: queryKeys.documents.dossierList(dossierId),
    queryFn: () => documentsService.getDossierDocuments(dossierId),
    enabled: !!dossierId,
  });

  const matchedDocument = useMemo(() => {
    const docs = documentsData?.data || [];
    if (docs.length === 0) return null;

    // Prefer Excel files first, otherwise latest document
    const excelDoc = docs.find((d: any) => {
      const name = (d.originalName || '').toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls');
    });

    return excelDoc || docs[0];
  }, [documentsData?.data]);

  const fileName = useMemo(() => {
    if (matchedDocument) {
      return (
        matchedDocument.originalName ||
        `${dossier?.code || 'Tour'}_Estimate.xlsx`
      );
    }
    return 'Dự toán tạo trực tiếp trên hệ thống';
  }, [matchedDocument, dossier?.code]);

  const fileSizeLabel = useMemo(() => {
    if (matchedDocument?.fileSize) {
      return `(${formatBytes(matchedDocument.fileSize)})`;
    }
    if (matchedDocument) {
      return '(Tài liệu đính kèm)';
    }
    return '(Dữ liệu hệ thống)';
  }, [matchedDocument]);

  const importTimeLabel = useMemo(() => {
    const rawDate =
      matchedDocument?.createdAt || dossier?.createdAt;
    return rawDate
      ? dayjs(rawDate).format('DD/MM/YYYY HH:mm')
      : 'Chưa có thông tin';
  }, [matchedDocument?.createdAt, dossier?.createdAt]);

  const uploaderLabel = useMemo(() => {
    if (matchedDocument?.uploader?.fullName) {
      return matchedDocument.uploader.fullName;
    }
    if (dossier?.salesUser?.fullName) {
      return dossier.salesUser.fullName;
    }
    return 'Hệ thống';
  }, [matchedDocument, dossier?.salesUser]);

  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* File icon and filename (Col 4) */}
        <div className="md:col-span-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            {matchedDocument ? (
              <FileExcelFilled className="text-2xl text-emerald-600" />
            ) : (
              <FileExcelOutlined className="text-2xl text-emerald-600" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
              File nguồn
            </span>
            <span
              className="font-semibold text-slate-800 text-xs block truncate"
              title={fileName}
            >
              {fileName}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {fileSizeLabel}
            </span>
          </div>
        </div>

        {/* Import time and user (Col 3) */}
        <div className="md:col-span-3 border-l-0 md:border-l border-slate-100 md:pl-4">
          <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
            Thời gian import
          </span>
          <div className="font-semibold text-slate-800 text-xs">
            {importTimeLabel}
          </div>
          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
            Bởi: {uploaderLabel}
          </div>
        </div>

        {/* Metrics: Tổng dòng, Dòng hợp lệ, Dòng lỗi (Col 5) */}
        <div className="md:col-span-5 grid grid-cols-3 gap-2 border-l-0 md:border-l border-slate-100 md:pl-4 text-center sm:text-left">
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
              Tổng dòng
            </span>
            <div className="text-sm font-bold text-slate-800">
              {totalRowCount} dòng
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
              Dòng hợp lệ
            </span>
            <div className="text-sm font-bold text-emerald-600">
              {validRowCount} dòng
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
              Dòng lỗi
            </span>
            <div className="text-sm font-bold text-red-500">
              {errorRowCount} dòng
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
