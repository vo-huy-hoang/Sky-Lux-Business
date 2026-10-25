'use client';

import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { SEGMENT_CONFIGS } from './calendar-types';

export default function CalendarLegendBar() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
      <div className="flex flex-wrap items-center gap-5">
        <span className="font-semibold text-slate-500">Mảng kinh doanh:</span>

        {Object.values(SEGMENT_CONFIGS).map((seg) => (
          <div key={seg.key} className="flex items-center gap-2">
            <span
              className="h-3.5 w-7 rounded-xs shadow-2xs border border-black/10"
              style={{ backgroundColor: seg.primaryColor }}
            />
            <span className="font-medium text-slate-700">{seg.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 text-slate-400">
        <InfoCircleOutlined />
        <span>Dữ liệu thời gian thực từ API (Hồ sơ status: LOCKED)</span>
      </div>
    </div>
  );
}
