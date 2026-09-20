'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import {
  LeftOutlined,
  RightOutlined,
  CheckCircleFilled,
  LockOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Tooltip, Spin, Alert, Empty, Button } from 'antd';
import { dossiersService } from '@/services/dossiers.service';
import { queryKeys } from '@/lib/query-keys';
import { DossierItem } from '@/types/dossier';

export type BusinessSegmentKey = 'TOUR' | 'XE_CHO_THUE' | 'VE_LE' | 'SU_KIEN';

export interface SegmentConfig {
  key: BusinessSegmentKey;
  label: string;
  primaryColor: string;
  accentBorder: string;
  bgTint: string;
  borderColor: string;
  textColor: string;
}

// Bảng màu 100% trích xuất từ Ảnh 3 của người dùng
export const SEGMENT_CONFIGS: Record<BusinessSegmentKey, SegmentConfig> = {
  TOUR: {
    key: 'TOUR',
    label: 'TOUR',
    primaryColor: '#237ACB',
    accentBorder: '#1D70B8',
    bgTint: '#EBF5FE',
    borderColor: '#BFDBFE',
    textColor: '#1E40AF',
  },
  XE_CHO_THUE: {
    key: 'XE_CHO_THUE',
    label: 'XE CHO THUÊ',
    primaryColor: '#FFFF00',
    accentBorder: '#EAB308',
    bgTint: '#FEF9C3',
    borderColor: '#FDE047',
    textColor: '#854D0E',
  },
  VE_LE: {
    key: 'VE_LE',
    label: 'VÉ LẺ',
    primaryColor: '#77E3FF',
    accentBorder: '#0284C7',
    bgTint: '#E0F7FA',
    borderColor: '#7DD3FC',
    textColor: '#0369A1',
  },
  SU_KIEN: {
    key: 'SU_KIEN',
    label: 'SỰ KIỆN',
    primaryColor: '#C189F7',
    accentBorder: '#9333EA',
    bgTint: '#F3E8FF',
    borderColor: '#D8B4FE',
    textColor: '#7E22CE',
  },
};

export function resolveSegment(dossier: DossierItem): SegmentConfig {
  const blName = (dossier.businessLine?.name || '').toUpperCase();
  const blCode = (dossier.businessLine?.code || '').toUpperCase();
  const dName = (dossier.name || '').toUpperCase();
  const dRoute = (dossier.route || '').toUpperCase();
  const combined = `${blName} ${blCode} ${dName} ${dRoute}`;

  if (
    combined.includes('XE') ||
    combined.includes('CAR') ||
    combined.includes('THUÊ XE') ||
    combined.includes('RENTAL')
  ) {
    return SEGMENT_CONFIGS.XE_CHO_THUE;
  }
  if (
    combined.includes('VÉ') ||
    combined.includes('TICKET') ||
    combined.includes('VISA')
  ) {
    return SEGMENT_CONFIGS.VE_LE;
  }
  if (
    combined.includes('SỰ KIỆN') ||
    combined.includes('EVENT') ||
    combined.includes('MICE') ||
    combined.includes('HỘI NGHỊ')
  ) {
    return SEGMENT_CONFIGS.SU_KIEN;
  }
  return SEGMENT_CONFIGS.TOUR;
}

type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';

interface CalendarDay {
  date: Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}

interface WeekRow {
  days: CalendarDay[];
  startOfWeek: Dayjs;
  endOfWeek: Dayjs;
}

interface WeekEventSpan {
  dossier: DossierItem;
  segment: SegmentConfig;
  customerName: string;
  startIndex: number;
  endIndex: number;
  span: number;
  isStartOfEvent: boolean;
  isEndOfEvent: boolean;
  lane: number;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function CeoCalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Dayjs>(() => dayjs());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');

  // Lấy danh sách hồ sơ ĐÃ ĐƯỢC IMPORT VÀ KHOÁ BỞI CEO_ADMIN từ API (status === 'LOCKED')
  // TUYỆT ĐỐI KHÔNG DÙNG MOCK DATA
  const {
    data: dossiersResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dossiers.list({ status: 'LOCKED', limit: 100 }),
    queryFn: ({ signal }) =>
      dossiersService.getDossiers({ status: 'LOCKED', limit: 100 }, { signal }),
  });

  const lockedDossiers: DossierItem[] = useMemo(() => {
    return dossiersResponse?.data || [];
  }, [dossiersResponse]);

  // Điều hướng ngày/tháng
  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate((prev) => prev.subtract(1, 'month'));
    } else if (viewMode === 'WEEK') {
      setCurrentDate((prev) => prev.subtract(1, 'week'));
    } else {
      setCurrentDate((prev) => prev.subtract(1, 'day'));
    }
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate((prev) => prev.add(1, 'month'));
    } else if (viewMode === 'WEEK') {
      setCurrentDate((prev) => prev.add(1, 'week'));
    } else {
      setCurrentDate((prev) => prev.add(1, 'day'));
    }
  };

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  // Tiêu đề tháng năm hiển thị ở giữa header giống hệt Ảnh 1: "< October 2019 >"
  const headerTitle = useMemo(() => {
    if (viewMode === 'MONTH') {
      return currentDate.format('MMMM YYYY');
    }
    if (viewMode === 'WEEK') {
      const startOfWeek = currentDate.subtract((currentDate.day() + 6) % 7, 'day');
      const endOfWeek = startOfWeek.add(6, 'day');
      return `${startOfWeek.format('DD/MM')} - ${endOfWeek.format('DD/MM/YYYY')}`;
    }
    return currentDate.format('DD MMMM YYYY');
  }, [currentDate, viewMode]);

  // Tính ma trận tuần cho chế độ xem Tháng (Month view)
  const weeksMatrix: WeekRow[] = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');

    // Thứ 2 là ngày bắt đầu tuần: dayjs .day(): 0 là CN, 1 là T2, ...
    const startDayOfWeek = (startOfMonth.day() + 6) % 7; // 0 for Monday, ..., 6 for Sunday
    const calendarStart = startOfMonth.subtract(startDayOfWeek, 'day');

    const endDayOfWeek = (endOfMonth.day() + 6) % 7;
    const calendarEnd = endOfMonth.add(6 - endDayOfWeek, 'day');

    const totalDays = calendarEnd.diff(calendarStart, 'day') + 1;
    const weeks: WeekRow[] = [];

    const today = dayjs().format('YYYY-MM-DD');

    for (let w = 0; w < totalDays / 7; w++) {
      const days: CalendarDay[] = [];
      const weekStart = calendarStart.add(w * 7, 'day');
      const weekEnd = weekStart.add(6, 'day');

      for (let d = 0; d < 7; d++) {
        const date = weekStart.add(d, 'day');
        days.push({
          date,
          isCurrentMonth: date.month() === currentDate.month(),
          isToday: date.format('YYYY-MM-DD') === today,
          dayNumber: date.date(),
        });
      }

      weeks.push({
        days,
        startOfWeek: weekStart.startOf('day'),
        endOfWeek: weekEnd.endOf('day'),
      });
    }

    return weeks;
  }, [currentDate]);

  // Tính toán sự kiện ngang đa ngày (multi-day spanning bars) cho từng tuần
  const weekEventsMap = useMemo(() => {
    const map = new Map<number, { events: WeekEventSpan[]; maxLanes: number }>();

    weeksMatrix.forEach((week, weekIndex) => {
      const weekStartStr = week.startOfWeek.format('YYYY-MM-DD');
      const weekEndStr = week.endOfWeek.format('YYYY-MM-DD');

      // Lọc hồ sơ có thời gian giao thoa với tuần này
      const activeInWeek = lockedDossiers.filter((d) => {
        if (!d.startDate) return false;
        const startStr = dayjs(d.startDate).format('YYYY-MM-DD');
        const endStr = d.endDate
          ? dayjs(d.endDate).format('YYYY-MM-DD')
          : startStr;
        return startStr <= weekEndStr && endStr >= weekStartStr;
      });

      // Sắp xếp theo ngày bắt đầu sớm nhất, sự kiện dài hơn ưu tiên lane trên
      activeInWeek.sort((a, b) => {
        const diffStart = dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf();
        if (diffStart !== 0) return diffStart;
        const durA = dayjs(a.endDate || a.startDate).diff(dayjs(a.startDate), 'day');
        const durB = dayjs(b.endDate || b.startDate).diff(dayjs(b.startDate), 'day');
        return durB - durA;
      });

      // Bố trí lane/slot để các sự kiện cùng tuần không đè lên nhau
      const lanesOccupied: boolean[][] = []; // lanesOccupied[lane][dayIndex 0..6]
      const weekSpans: WeekEventSpan[] = [];

      activeInWeek.forEach((dossier) => {
        const seg = resolveSegment(dossier);
        const eventStart = dayjs(dossier.startDate!);
        const eventEnd = dossier.endDate ? dayjs(dossier.endDate) : eventStart;

        // Tính chỉ số bắt đầu và kết thúc trong tuần (0..6)
        let startIndex = 0;
        let isStartOfEvent = true;
        if (eventStart.isBefore(week.startOfWeek)) {
          startIndex = 0;
          isStartOfEvent = false;
        } else {
          startIndex = (eventStart.day() + 6) % 7;
        }

        let endIndex = 6;
        let isEndOfEvent = true;
        if (eventEnd.isAfter(week.endOfWeek)) {
          endIndex = 6;
          isEndOfEvent = false;
        } else {
          endIndex = (eventEnd.day() + 6) % 7;
        }

        // Tìm lane đầu tiên còn trống từ startIndex đến endIndex
        let assignedLane = 0;
        while (true) {
          if (!lanesOccupied[assignedLane]) {
            lanesOccupied[assignedLane] = [false, false, false, false, false, false, false];
          }
          let conflict = false;
          for (let col = startIndex; col <= endIndex; col++) {
            if (lanesOccupied[assignedLane][col]) {
              conflict = true;
              break;
            }
          }
          if (!conflict) {
            for (let col = startIndex; col <= endIndex; col++) {
              lanesOccupied[assignedLane][col] = true;
            }
            break;
          }
          assignedLane++;
        }

        // Tên khách hàng theo đúng yêu cầu: "(chỉ hiện tên khách hàng là được)"
        const customerName =
          dossier.customer?.displayName ||
          (dossier.customer as any)?.name ||
          dossier.name ||
          'Khách hàng';

        weekSpans.push({
          dossier,
          segment: seg,
          customerName,
          startIndex,
          endIndex,
          span: endIndex - startIndex + 1,
          isStartOfEvent,
          isEndOfEvent,
          lane: assignedLane,
        });
      });

      map.set(weekIndex, {
        events: weekSpans,
        maxLanes: lanesOccupied.length,
      });
    });

    return map;
  }, [weeksMatrix, lockedDossiers]);

  // Kiểm tra xem có hồ sơ đã khoá ở tháng khác không để gợi ý nhảy tháng nhanh
  const otherLockedMonths = useMemo(() => {
    const currentMonthKey = currentDate.format('YYYY-MM');
    const months = new Map<string, { label: string; count: number; date: Dayjs }>();

    lockedDossiers.forEach((d) => {
      if (!d.startDate) return;
      const m = dayjs(d.startDate);
      const key = m.format('YYYY-MM');
      if (key !== currentMonthKey) {
        if (!months.has(key)) {
          months.set(key, {
            label: m.format('MMMM YYYY'),
            count: 1,
            date: m,
          });
        } else {
          months.get(key)!.count++;
        }
      }
    });

    return Array.from(months.values());
  }, [lockedDossiers, currentDate]);

  const handleOpenDossier = (id: string) => {
    router.push(`/main/dossiers/${id}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Khung chính Lịch (100% giống Ảnh 1) */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-7">
        {/* Header Bar: Today - < Month YYYY > - [ Day | Week | Month ] */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Nút Today bên trái */}
          <div>
            <button
              type="button"
              onClick={handleToday}
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors hover:text-blue-600 hover:underline"
            >
              Today
            </button>
          </div>

          {/* Điều hướng Tháng ở giữa: < Tháng Năm > */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Tháng trước"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <LeftOutlined className="text-xs" />
            </button>

            <span className="min-w-[170px] text-center text-lg font-bold text-slate-900 capitalize tracking-tight sm:text-xl">
              {headerTitle}
            </span>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Tháng sau"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <RightOutlined className="text-xs" />
            </button>
          </div>

          {/* Segmented control chuyển chế độ xem: [ Day | Week | Month ] */}
          <div className="flex items-center self-end sm:self-auto">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('DAY')}
                className={`cursor-pointer px-3.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'DAY'
                    ? 'rounded-md bg-[#3B82F6] font-semibold text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setViewMode('WEEK')}
                className={`cursor-pointer px-3.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'WEEK'
                    ? 'rounded-md bg-[#3B82F6] font-semibold text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MONTH')}
                className={`cursor-pointer px-3.5 py-1 text-xs font-medium transition-all ${
                  viewMode === 'MONTH'
                    ? 'rounded-md bg-[#3B82F6] font-semibold text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Thông báo chuyển nhanh tới tháng có hồ sơ đã khoá */}
        {otherLockedMonths.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-xs text-blue-800">
            <div className="flex items-center gap-2">
              <LockOutlined className="text-blue-600" />
              <span>
                Tìm thấy <strong>{lockedDossiers.length} hồ sơ đã khóa</strong> từ dữ liệu hệ thống.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Xem nhanh tháng:</span>
              {otherLockedMonths.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setCurrentDate(m.date)}
                  className="cursor-pointer rounded-md bg-white px-2.5 py-1 font-semibold text-blue-700 shadow-2xs border border-blue-200 transition hover:bg-blue-600 hover:text-white capitalize"
                >
                  {m.label} ({m.count} hồ sơ)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trạng thái Loading hoặc Lỗi */}
        {isLoading && (
          <div className="flex h-72 items-center justify-center">
            <Spin description="Đang tải dữ liệu hồ sơ đã khóa từ API..." />
          </div>
        )}

        {isError && (
          <Alert
            type="error"
            showIcon
            message="Không thể tải dữ liệu hồ sơ"
            description="Có lỗi khi lấy danh sách hồ sơ đã khóa từ API. Vui lòng thử lại."
            action={
              <Button size="small" onClick={() => refetch()}>
                Tải lại
              </Button>
            }
            className="mb-4"
          />
        )}

        {/* LƯỚI LỊCH THÁNG (MONTH VIEW) - Chuẩn 100% Ảnh 1 */}
        {!isLoading && !isError && viewMode === 'MONTH' && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {/* Header: MON, TUE, WED, THU, FRI, SAT, SUN */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-[#f1f4f9] text-center">
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
                // Chiều cao tự động điều chỉnh theo số lượng thanh sự kiện
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
                                onClick={() => handleOpenDossier(ev.dossier.id)}
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
        )}

        {/* CHẾ ĐỘ XEM TUẦN (WEEK VIEW) */}
        {!isLoading && !isError && viewMode === 'WEEK' && (
          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-2">
              {weeksMatrix[0]?.days.map((day) => {
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
                          day.isToday
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-800'
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
                            onClick={() => handleOpenDossier(d.id)}
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
        )}

        {/* CHẾ ĐỘ XEM NGÀY (DAY VIEW) */}
        {!isLoading && !isError && viewMode === 'DAY' && (
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

            {(() => {
              const currentDayStr = currentDate.format('YYYY-MM-DD');
              const activeToday = lockedDossiers.filter((d) => {
                if (!d.startDate) return false;
                const s = dayjs(d.startDate).format('YYYY-MM-DD');
                const e = d.endDate ? dayjs(d.endDate).format('YYYY-MM-DD') : s;
                return currentDayStr >= s && currentDayStr <= e;
              });

              if (activeToday.length === 0) {
                return (
                  <Empty
                    description={
                      <span className="text-xs text-slate-400">
                        Không có hồ sơ nào chạy trong ngày {currentDate.format('DD/MM/YYYY')}
                      </span>
                    }
                  />
                );
              }

              return (
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
                        onClick={() => handleOpenDossier(d.id)}
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
              );
            })()}
          </div>
        )}

        {/* Thanh chú giải 4 mảng màu chuẩn Ảnh 3 */}
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
      </div>
    </div>
  );
}
