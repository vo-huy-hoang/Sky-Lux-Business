'use client';

import React from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { CalendarViewMode } from './calendar-types';

interface CalendarHeaderToolbarProps {
  headerTitle: string;
  viewMode: CalendarViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onChangeViewMode: (mode: CalendarViewMode) => void;
}

export default function CalendarHeaderToolbar({
  headerTitle,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onChangeViewMode,
}: CalendarHeaderToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Nút Today bên trái */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToday}
          className="cursor-pointer inline-flex items-center justify-center px-3.5 py-1.5 min-h-[38px] rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs active:scale-95"
        >
          Today
        </button>
      </div>

      {/* Điều hướng Tháng ở giữa: < Tháng Năm > */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Thời gian trước"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <LeftOutlined className="text-sm" />
        </button>

        <span className="min-w-[170px] text-center text-lg font-bold text-slate-900 capitalize tracking-tight sm:text-xl">
          {headerTitle}
        </span>

        <button
          type="button"
          onClick={onNext}
          aria-label="Thời gian sau"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
        >
          <RightOutlined className="text-sm" />
        </button>
      </div>

      {/* Segmented control chuyển chế độ xem: [ Day | Week | Month ] */}
      <div className="flex items-center justify-center self-stretch sm:self-auto">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onChangeViewMode('DAY')}
            className={`cursor-pointer px-3.5 py-2 min-h-[38px] text-xs font-semibold flex items-center justify-center transition-all ${
              viewMode === 'DAY'
                ? 'rounded-md bg-[var(--color-primary-700)] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('WEEK')}
            className={`cursor-pointer px-3.5 py-2 min-h-[38px] text-xs font-semibold flex items-center justify-center transition-all ${
              viewMode === 'WEEK'
                ? 'rounded-md bg-[var(--color-primary-700)] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('MONTH')}
            className={`cursor-pointer px-3.5 py-2 min-h-[38px] text-xs font-semibold flex items-center justify-center transition-all ${
              viewMode === 'MONTH'
                ? 'rounded-md bg-[var(--color-primary-700)] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Month
          </button>
        </div>
      </div>
    </div>
  );
}
