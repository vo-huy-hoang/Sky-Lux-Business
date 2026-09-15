'use client';

import React from 'react';
import { Card, Tag } from 'antd';
import { MessageOutlined, UserOutlined } from '@ant-design/icons';
import { dateTime } from '../types';

export interface OperatorNotesCardProps {
  estimate?: any;
  dossier?: any;
  className?: string;
}

function formatCurrencyString(raw: string): string {
  const num = parseFloat(raw.replace(/,/g, ''));
  if (isNaN(num)) return raw;
  return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
}

function cleanNoteText(text?: string): string {
  if (!text) return '';
  let result = text;
  try {
    result = result.replace(/Import từ:?\s*([^;\n]+)/g, (match, fname) => {
      try {
        const decoded = decodeURIComponent(escape(fname));
        return `Import từ: ${decoded.normalize('NFC').trim()}`;
      } catch {
        return `Import từ: ${fname.trim()}`;
      }
    });
  } catch {}

  // Format raw numeric amounts into VND currency (e.g. 145.800.000 đ)
  result = result.replace(
    /(Doanh thu nguồn|Chi phí nguồn|Lợi nhuận nguồn):\s*([0-9.]+)(?!\s*đ)/g,
    (_, label, numStr) => `${label}: ${formatCurrencyString(numStr)}`,
  );

  // Convert semicolons between import metadata items into separate lines
  if (result.includes('Import từ')) {
    result = result.split(/;\s*/).join('\n');
  }

  return result;
}

export function OperatorNotesCard({
  estimate,
  dossier,
  className = '',
}: OperatorNotesCardProps) {
  const operatorName =
    dossier?.operatorUser?.fullName ||
    dossier?.operatorUser?.name ||
    'Bộ phận Điều hành (Operator)';

  const rawNote =
    estimate?.note ||
    dossier?.note ||
    'Hồ sơ đang được theo dõi dự toán và đối soát chi phí nhà cung cấp.';
  const noteContent = cleanNoteText(rawNote);

  const noteDate = estimate?.updatedAt || dossier?.updatedAt;

  return (
    <Card className={`ceo-card shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs">
            <MessageOutlined />
          </div>
          <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
            Ghi chú từ điều hành
          </h3>
        </div>
        <Tag color="cyan" className="text-[10px] font-semibold border-0 m-0">
          Điều hành tour
        </Tag>
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          <UserOutlined />
        </div>
        <div className="text-xs flex-1 min-w-0">
          <p className="text-slate-800 leading-relaxed mb-2 font-normal whitespace-pre-line break-words">
            {noteContent}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60">
            <span className="text-emerald-800 font-semibold">{operatorName}</span>
            {noteDate && <span>{dateTime(noteDate)}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default OperatorNotesCard;
