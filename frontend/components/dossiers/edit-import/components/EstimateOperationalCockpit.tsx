'use client';

import React, { useState, useMemo } from 'react';
import { Input, Tag, Button } from 'antd';
import {
  WarningFilled,
  CloseCircleFilled,
  CheckCircleFilled,
  MessageOutlined,
  UserOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { IssueItem } from '../validation/estimate-validator';

interface EstimateOperationalCockpitProps {
  issuesList: IssueItem[];
  errorCount: number;
  warningCount: number;
  operatorNote: string;
  onOperatorNoteChange: (note: string) => void;
  operatorUserName?: string;
  updatedAt?: string;
  onJumpToRow: (issue: IssueItem) => void;
}

export const EstimateOperationalCockpit: React.FC<
  EstimateOperationalCockpitProps
> = ({
  issuesList,
  errorCount,
  warningCount,
  operatorNote,
  onOperatorNoteChange,
  operatorUserName,
  updatedAt,
  onJumpToRow,
}) => {
  const [issueFilter, setIssueFilter] = useState<'ALL' | 'ERROR' | 'WARNING'>(
    'ALL',
  );
  const [showAllIssues, setShowAllIssues] = useState(false);

  const filteredIssues = useMemo(() => {
    if (issueFilter === 'ERROR')
      return issuesList.filter((i) => i.type === 'ERROR');
    if (issueFilter === 'WARNING')
      return issuesList.filter((i) => i.type === 'WARNING');
    return issuesList;
  }, [issuesList, issueFilter]);

  const displayedIssues = useMemo(() => {
    if (showAllIssues) return filteredIssues;
    return filteredIssues.slice(0, 3);
  }, [filteredIssues, showAllIssues]);

  const formattedDate = useMemo(() => {
    return updatedAt
      ? dayjs(updatedAt).format('DD/MM/YYYY')
      : 'Ghi chú theo hồ sơ';
  }, [updatedAt]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Card 1: Lỗi cần xử lý (Span 6) */}
      <div className="lg:col-span-6 flex flex-col">
        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs flex flex-col justify-between h-full">
          <div>
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-xs">
                  <WarningFilled />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                  Lỗi cần xử lý
                </h3>
                <Tag
                  color={
                    errorCount > 0
                      ? 'error'
                      : warningCount > 0
                        ? 'warning'
                        : 'success'
                  }
                  className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border-0 m-0"
                >
                  {issuesList.length} vấn đề
                </Tag>
              </div>

              {/* Filter chips */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIssueFilter('ALL')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    issueFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({issuesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter('ERROR')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    issueFilter === 'ERROR'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Lỗi ({errorCount})
                </button>
                <button
                  type="button"
                  onClick={() => setIssueFilter('WARNING')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    issueFilter === 'WARNING'
                      ? 'bg-amber-500 text-white font-semibold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Cảnh báo ({warningCount})
                </button>
              </div>
            </div>

            {/* Items List */}
            {displayedIssues.length === 0 ? (
              <div className="py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircleFilled className="text-xl" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Không có vấn đề cần xử lý
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {issueFilter !== 'ALL'
                    ? 'Không tìm thấy mục nào thuộc bộ lọc này.'
                    : 'Dữ liệu hợp lệ, sẵn sàng gửi điều hành xem xét.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedIssues.map((issue) => {
                  const isErr = issue.type === 'ERROR';
                  return (
                    <div
                      key={issue.id}
                      onClick={() => onJumpToRow(issue)}
                      className={`group p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                        isErr
                          ? 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-100/90 hover:border-rose-200'
                          : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-100/90 hover:border-amber-200'
                      }`}
                      title="Bấm để cuộn nhanh đến dòng này trong bảng"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                            isErr
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {isErr ? (
                            <CloseCircleFilled />
                          ) : (
                            <WarningFilled />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs mb-0.5 truncate group-hover:text-emerald-950 transition-colors">
                            {issue.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mb-0 line-clamp-1">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-emerald-700 transition-colors">
                        <span className="hidden sm:inline">Sửa ngay</span>
                        <ArrowRightOutlined className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 italic">
              * Bấm vào từng dòng để cuộn và kiểm tra chi tiết
            </span>
            {filteredIssues.length > 3 && (
              <Button
                type="link"
                size="small"
                onClick={() => setShowAllIssues((prev) => !prev)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 p-0 h-auto"
              >
                {showAllIssues
                  ? 'Thu gọn'
                  : `Xem tất cả (${filteredIssues.length})`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Ghi chú của điều hành (Span 6) */}
      <div className="lg:col-span-6 flex flex-col">
        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs flex flex-col justify-between h-full">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                  <MessageOutlined />
                </div>
                <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                  Ghi chú của điều hành
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Tag
                  color="green"
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 bg-emerald-50 text-emerald-800 m-0"
                >
                  Điều hành tour
                </Tag>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Lưu kèm dự toán
                </span>
              </div>
            </div>

            {/* Input Area - Auto-expanding to show all lines without scrolling */}
            <div className="mb-2.5">
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 16 }}
                placeholder="Nhập ghi chú phản hồi của điều hành (về giá, nhà cung cấp, chi phí dự kiến)..."
                value={operatorNote}
                onChange={(e) => onOperatorNoteChange(e.target.value)}
                className="rounded-xl border-slate-200 text-xs hover:border-slate-300 focus:border-emerald-600 transition-colors leading-relaxed p-3 font-normal text-slate-800 bg-slate-50/50 focus:bg-white"
              />
            </div>

            {/* Author & Context Bar */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                  <UserOutlined />
                </div>
                <span className="text-[11px] text-slate-700 font-semibold">
                  {operatorUserName || 'Bộ phận Điều hành'}
                </span>
                <span className="text-[10px] text-slate-400">
                  • {formattedDate}
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 font-medium px-2 py-0.5 rounded-md">
                Chỉnh sửa trực tiếp
              </span>
            </div>
          </div>

          {/* Card Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">
              Người xem:{' '}
              <span className="text-slate-600 font-medium">
                Sale & Điều hành
              </span>
            </span>
            <span className="text-[11px] font-mono">
              {operatorNote.length} ký tự
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
