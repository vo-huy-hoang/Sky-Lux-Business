'use client';

import React, { useMemo } from 'react';
import { Empty } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { DossierItem } from '@/types/dossier';
import { resolveSegment } from './calendar-types';

interface CalendarDayGridProps {
  currentDate: Dayjs;
  lockedDossiers: DossierItem[];
  onOpenDossier: (dossierId: string) => void;
}

export default function CalendarDayGrid({
  currentDate,
  lockedDossiers,
  onOpenDossier,
}: CalendarDayGridProps) {
  const activeToday = useMemo(() => {
    const currentDayStr = currentDate.format('YYYY-MM-DD');
    return lockedDossiers.filter((d) => {
      if (!d.startDate) return false;
      const s = dayjs(d.startDate).format('YYYY-MM-DD');
      const e = d.endDate ? dayjs(d.endDate).format('YYYY-MM-DD') : s;
      return currentDayStr >= s && currentDayStr <= e;
    });
  }, [currentDate, lockedDossiers]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Lịch trình ngày {currentDate.format('DD/MM/YYYY')}
          </h3>
          <p className="text-xs text-slate-500">
            Các hồ sơ đang chạy trong ngày hôm nay đã được CEO_ADMIN khóa
          </p>
        </div>
      </div>

      {activeToday.length === 0 ? (
        <Empty
          description={
            <span className="text-xs text-slate-400">
              Không có hồ sơ nào chạy trong ngày {currentDate.format('DD/MM/YYYY')}
            </span>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeToday.map((d) => {
            const seg = resolveSegment(d);
            const cName =
              d.customer?.displayName ||
              (d.customer as any)?.name ||
              d.name;

            return (
              <div
                key={d.id}
                onClick={() => onOpenDossier(d.id)}
                style={{
                  backgroundColor: seg.bgTint,
                  borderColor: seg.borderColor,
                  borderLeftColor: seg.accentBorder,
                  borderLeftWidth: '4px',
                }}
                className="cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span
                    style={{ color: seg.textColor }}
                    className="rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-white/70"
                  >
                    {seg.label}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {d.code}
                  </span>
                </div>
                <h4
                  style={{ color: seg.textColor }}
                  className="mt-2 text-sm font-bold"
                >
                  {cName}
                </h4>
                <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                  {d.name}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/50 pt-2">
                  <span>
                    {dayjs(d.startDate).format('DD/MM')} -{' '}
                    {d.endDate ? dayjs(d.endDate).format('DD/MM/YYYY') : ''}
                  </span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <LockOutlined /> Đã khóa
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
