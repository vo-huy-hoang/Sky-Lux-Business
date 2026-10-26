'use client';

import React, { useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DossierItem } from '@/types/dossier';
import { resolveSegment } from './calendar-types';

interface CalendarWeekGridProps {
  currentDate: Dayjs;
  lockedDossiers: DossierItem[];
  onOpenDossier: (dossierId: string) => void;
}

export default function CalendarWeekGrid({
  currentDate,
  lockedDossiers,
  onOpenDossier,
}: CalendarWeekGridProps) {
  const weekDays = useMemo(() => {
    const startOfWeek = currentDate.subtract((currentDate.day() + 6) % 7, 'day');
    const todayStr = dayjs().format('YYYY-MM-DD');

    return Array.from({ length: 7 }, (_, i) => {
      const d = startOfWeek.add(i, 'day');
      return {
        date: d,
        dayNumber: d.date(),
        isToday: d.format('YYYY-MM-DD') === todayStr,
      };
    });
  }, [currentDate]);

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto pb-2">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayStr = day.date.format('YYYY-MM-DD');
          const activeDossiers = lockedDossiers.filter((d) => {
            if (!d.startDate) return false;
            const s = dayjs(d.startDate).format('YYYY-MM-DD');
            const e = d.endDate ? dayjs(d.endDate).format('YYYY-MM-DD') : s;
            return dayStr >= s && dayStr <= e;
          });

          return (
            <div
              key={dayStr}
              className="flex min-h-[220px] flex-col rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-2 border-b border-slate-100 pb-2 text-center">
                <div className="text-xs font-bold text-slate-500 uppercase">
                  {day.date.format('ddd')}
                </div>
                <div
                  className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    day.isToday ? 'bg-blue-600 text-white' : 'text-slate-800'
                  }`}
                >
                  {day.dayNumber}
                </div>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {activeDossiers.map((d) => {
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
                        color: seg.textColor,
                        borderLeftColor: seg.accentBorder,
                        borderLeftWidth: '3.5px',
                      }}
                      className="cursor-pointer rounded border p-1.5 text-xs font-semibold hover:brightness-95"
                    >
                      <div className="truncate">{cName}</div>
                      <div className="text-[10px] opacity-80">{seg.label}</div>
                    </div>
                  );
                })}
                {activeDossiers.length === 0 && (
                  <div className="mt-8 text-center text-xs text-slate-300">
                    Không có lịch
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
        </div>
      </div>
    </div>
  );
}
