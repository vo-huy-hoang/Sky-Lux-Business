'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { dossiersService } from '@/services/dossiers.service';
import { queryKeys } from '@/lib/query-keys';
import { DossierItem } from '@/types/dossier';
import {
  CalendarViewMode,
  CalendarDay,
  WeekRow,
  WeekEventSpan,
  resolveSegment,
} from './calendar-types';

export function useCalendarState() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Dayjs>(() => dayjs());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');

  // Lấy danh sách hồ sơ ĐÃ ĐƯỢC KHOÁ BỞI CEO_ADMIN từ API (status === 'LOCKED')
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

  const handleOpenDossier = (dossierId: string) => {
    router.push(`/dossiers/${dossierId}`);
  };

  // Tiêu đề tháng năm hiển thị ở giữa header
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
    const startDayOfWeek = (startOfMonth.day() + 6) % 7;
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

      const activeInWeek = lockedDossiers.filter((d) => {
        if (!d.startDate) return false;
        const startStr = dayjs(d.startDate).format('YYYY-MM-DD');
        const endStr = d.endDate
          ? dayjs(d.endDate).format('YYYY-MM-DD')
          : startStr;
        return startStr <= weekEndStr && endStr >= weekStartStr;
      });

      activeInWeek.sort((a, b) => {
        const diffStart = dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf();
        if (diffStart !== 0) return diffStart;
        const durA = dayjs(a.endDate || a.startDate).diff(dayjs(a.startDate), 'day');
        const durB = dayjs(b.endDate || b.startDate).diff(dayjs(b.startDate), 'day');
        return durB - durA;
      });

      const lanesOccupied: boolean[][] = [];
      const weekSpans: WeekEventSpan[] = [];

      activeInWeek.forEach((dossier) => {
        const seg = resolveSegment(dossier);
        const eventStart = dayjs(dossier.startDate!);
        const eventEnd = dossier.endDate ? dayjs(dossier.endDate) : eventStart;

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

  return {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    isLoading,
    isError,
    refetch,
    lockedDossiers,
    handlePrev,
    handleNext,
    handleToday,
    headerTitle,
    weeksMatrix,
    weekEventsMap,
    handleOpenDossier,
  };
}
