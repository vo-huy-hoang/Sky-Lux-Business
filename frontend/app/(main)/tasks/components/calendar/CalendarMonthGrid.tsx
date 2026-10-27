'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import dayjs from 'dayjs';
import { WeekRow, WeekEventSpan, WEEKDAYS } from './calendar-types';

interface CalendarMonthGridProps {
  weeksMatrix: WeekRow[];
  weekEventsMap: Map<number, { events: WeekEventSpan[]; maxLanes: number }>;
  onOpenDossier: (dossierId: string) => void;
}

export default function CalendarMonthGrid({
  weeksMatrix,
  weekEventsMap,
  onOpenDossier,
}: CalendarMonthGridProps) {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="min-w-[680px] overflow-hidden rounded-xl border border-slate-200">
      {/* Header: MON, TUE, WED, THU, FRI, SAT, SUN */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/70 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-[12px] font-bold tracking-wider text-slate-700"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Thân bảng lịch: Các hàng tuần */}
      <div className="divide-y divide-slate-200">
        {weeksMatrix.map((week, weekIndex) => {
          const weekData = weekEventsMap.get(weekIndex);
          const events = weekData?.events || [];
          const maxLanes = weekData?.maxLanes || 0;
          const rowMinHeight = Math.max(105, 38 + maxLanes * 28);

          return (
            <div
              key={week.startOfWeek.toString()}
              className="relative grid grid-cols-7"
              style={{ minHeight: `${rowMinHeight}px` }}
            >
              {/* 7 ô ngày trong tuần */}
              {week.days.map((day, dayIndex) => {
                const isLastCol = dayIndex === 6;

                return (
                  <div
                    key={day.date.toString()}
                    className={`relative p-2 transition-colors ${
                      !day.isCurrentMonth
                        ? 'calendar-diagonal-hatch'
                        : 'bg-white hover:bg-slate-50/40'
                    } ${!isLastCol ? 'border-r border-slate-200' : ''}`}
                  >
                    {/* Số ngày ở góc trên bên phải */}
                    <div className="absolute top-2 right-2.5 z-10">
                      {day.isToday ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
                          {day.dayNumber}
                        </span>
                      ) : (
                        <span
                          className={`text-[13px] ${
                            day.isCurrentMonth
                              ? 'font-semibold text-slate-800'
                              : 'font-medium text-slate-400'
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Các thanh sự kiện ngang kéo dài nhiều ngày (multi-day spanning bars) */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                {events.map((ev) => {
                  const leftPercent = (ev.startIndex / 7) * 100;
                  const widthPercent = (ev.span / 7) * 100;
                  const topPx = 34 + ev.lane * 26;

                  return (
                    <div
                      key={`${ev.dossier.id}-${weekIndex}`}
                      className="pointer-events-auto absolute"
                      style={{
                        left: `calc(${leftPercent}% + 4px)`,
                        width: `calc(${widthPercent}% - 8px)`,
                        top: `${topPx}px`,
                        height: '23px',
                      }}
                    >
                      <Tooltip
                        title={
                          <div className="space-y-1 p-1 text-xs">
                            <div className="font-bold text-white">
                              {ev.dossier.name}
                            </div>
                            <div>
                              <span className="text-slate-300">Khách hàng:</span>{' '}
                              <span className="font-semibold text-amber-300">
                                {ev.customerName}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-300">Mã hồ sơ:</span>{' '}
                              {ev.dossier.code}
                            </div>
                            <div>
                              <span className="text-slate-300">Mảng:</span>{' '}
                              <span className="font-semibold">
                                {ev.segment.label}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-300">Thời gian:</span>{' '}
                              {dayjs(ev.dossier.startDate).format('DD/MM/YYYY')} -{' '}
                              {ev.dossier.endDate
                                ? dayjs(ev.dossier.endDate).format('DD/MM/YYYY')
                                : 'Đang cập nhật'}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-emerald-300">
                              <CheckCircleFilled /> Đã khoá hồ sơ bởi CEO_ADMIN
                            </div>
                          </div>
                        }
                      >
                        <div
                          onClick={() => onOpenDossier(ev.dossier.id)}
                          style={{
                            backgroundColor: ev.segment.bgTint,
                            borderColor: ev.segment.borderColor,
                            color: ev.segment.textColor,
                            borderLeftColor: ev.isStartOfEvent
                              ? ev.segment.accentBorder
                              : ev.segment.borderColor,
                            borderLeftWidth: ev.isStartOfEvent ? '3.5px' : '1px',
                          }}
                          className={`flex h-full w-full cursor-pointer items-center border px-2 text-[11.5px] font-semibold transition-all hover:brightness-95 hover:shadow-xs ${
                            ev.isStartOfEvent ? 'rounded-l-[4px]' : 'rounded-l-none'
                          } ${
                            ev.isEndOfEvent ? 'rounded-r-[4px]' : 'rounded-r-none'
                          }`}
                        >
                          <span className="truncate">{ev.customerName}</span>
                        </div>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}
