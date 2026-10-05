import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import {
  resolveSegment,
  SEGMENT_CONFIGS,
  WEEKDAYS,
  WeekRow,
  WeekEventSpan,
} from '@/app/main/tasks/components/calendar/calendar-types';
import CalendarHeaderToolbar from '@/app/main/tasks/components/calendar/CalendarHeaderToolbar';
import CalendarLegendBar from '@/app/main/tasks/components/calendar/CalendarLegendBar';
import CalendarMonthGrid from '@/app/main/tasks/components/calendar/CalendarMonthGrid';
import CalendarWeekGrid from '@/app/main/tasks/components/calendar/CalendarWeekGrid';
import CalendarDayGrid from '@/app/main/tasks/components/calendar/CalendarDayGrid';
import { DossierItem } from '@/types/dossier';

describe('Calendar Architecture Seams', () => {
  describe('calendar-types: resolveSegment', () => {
    it('resolves XE_CHO_THUE when businessLine or name contains car/rental keywords', () => {
      const dossier: any = {
        name: 'Dịch vụ thuê xe 16 chỗ',
        businessLineName: 'Xe vận chuyển',
        route: 'Hà Nội - Nội Bài',
      };
      expect(resolveSegment(dossier)).toEqual(SEGMENT_CONFIGS.XE_CHO_THUE);
    });

    it('resolves VE_LE when name contains visa or ticket keywords', () => {
      const dossier: any = {
        name: 'Làm visa đi Nhật',
        businessLineName: 'Vé máy bay',
      };
      expect(resolveSegment(dossier)).toEqual(SEGMENT_CONFIGS.VE_LE);
    });

    it('resolves SU_KIEN when name contains event or hội nghị keywords', () => {
      const dossier: any = {
        name: 'Hội nghị khách hàng cuối năm',
        businessLineName: 'Mice & Events',
      };
      expect(resolveSegment(dossier)).toEqual(SEGMENT_CONFIGS.SU_KIEN);
    });

    it('defaults to TOUR for standard travel itineraries', () => {
      const dossier: any = {
        name: 'Hành trình di sản miền Trung',
        businessLineName: 'Du lịch trọn gói',
      };
      expect(resolveSegment(dossier)).toEqual(SEGMENT_CONFIGS.TOUR);
    });
  });

  describe('CalendarHeaderToolbar', () => {
    it('renders headerTitle and triggers navigation & viewMode callbacks', () => {
      const onPrev = jest.fn();
      const onNext = jest.fn();
      const onToday = jest.fn();
      const onChangeViewMode = jest.fn();

      render(
        <CalendarHeaderToolbar
          headerTitle="Tháng 10 2026"
          viewMode="MONTH"
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          onChangeViewMode={onChangeViewMode}
        />,
      );

      expect(screen.getByText('Tháng 10 2026')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Today'));
      expect(onToday).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Thời gian trước'));
      expect(onPrev).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByLabelText('Thời gian sau'));
      expect(onNext).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Week'));
      expect(onChangeViewMode).toHaveBeenCalledWith('WEEK');

      fireEvent.click(screen.getByText('Day'));
      expect(onChangeViewMode).toHaveBeenCalledWith('DAY');
    });
  });

  describe('CalendarLegendBar', () => {
    it('renders all 4 business segment labels and realtime note', () => {
      render(<CalendarLegendBar />);

      expect(screen.getByText('Mảng kinh doanh:')).toBeInTheDocument();
      expect(screen.getByText('TOUR')).toBeInTheDocument();
      expect(screen.getByText('XE CHO THUÊ')).toBeInTheDocument();
      expect(screen.getByText('VÉ LẺ')).toBeInTheDocument();
      expect(screen.getByText('SỰ KIỆN')).toBeInTheDocument();
      expect(
        screen.getByText(/Dữ liệu thời gian thực từ API/i),
      ).toBeInTheDocument();
    });
  });

  describe('CalendarMonthGrid', () => {
    it('renders weekdays and event bars, triggering onOpenDossier', () => {
      const onOpenDossier = jest.fn();
      const dummyDate = dayjs('2026-10-01');

      const weeksMatrix: WeekRow[] = [
        {
          startOfWeek: dummyDate,
          endOfWeek: dummyDate.add(6, 'day'),
          days: Array.from({ length: 7 }, (_, i) => ({
            date: dummyDate.add(i, 'day'),
            isCurrentMonth: true,
            isToday: i === 0,
            dayNumber: i + 1,
          })),
        },
      ];

      const dummyDossier: any = {
        id: 'dossier-xyz',
        code: 'DS-XYZ',
        name: 'Hồ sơ thử nghiệm',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      };

      const eventSpan: WeekEventSpan = {
        dossier: dummyDossier,
        segment: SEGMENT_CONFIGS.TOUR,
        customerName: 'Tập Đoàn Vingroup',
        startIndex: 0,
        endIndex: 4,
        span: 5,
        isStartOfEvent: true,
        isEndOfEvent: true,
        lane: 0,
      };

      const weekEventsMap = new Map<
        number,
        { events: WeekEventSpan[]; maxLanes: number }
      >();
      weekEventsMap.set(0, { events: [eventSpan], maxLanes: 1 });

      render(
        <CalendarMonthGrid
          weeksMatrix={weeksMatrix}
          weekEventsMap={weekEventsMap}
          onOpenDossier={onOpenDossier}
        />,
      );

      // Verify weekdays
      WEEKDAYS.forEach((w) => {
        expect(screen.getByText(w)).toBeInTheDocument();
      });

      // Verify event bar
      const eventBar = screen.getByText('Tập Đoàn Vingroup');
      expect(eventBar).toBeInTheDocument();

      fireEvent.click(eventBar);
      expect(onOpenDossier).toHaveBeenCalledWith('dossier-xyz');
    });
  });

  describe('CalendarWeekGrid', () => {
    it('renders 7 day columns and handles empty state vs active dossier', () => {
      const onOpenDossier = jest.fn();
      const currentDate = dayjs('2026-10-05');
      const lockedDossiers: DossierItem[] = [
        {
          id: 'dos-1',
          code: 'D1',
          name: 'Tour Hà Giang',
          startDate: '2026-10-05',
          endDate: '2026-10-07',
          customer: { displayName: 'Khách VIP' },
        } as any,
      ];

      render(
        <CalendarWeekGrid
          currentDate={currentDate}
          lockedDossiers={lockedDossiers}
          onOpenDossier={onOpenDossier}
        />,
      );

      const vipElements = screen.getAllByText('Khách VIP');
      expect(vipElements.length).toBe(3);
      expect(screen.getAllByText('Không có lịch').length).toBeGreaterThan(0);

      fireEvent.click(vipElements[0]);
      expect(onOpenDossier).toHaveBeenCalledWith('dos-1');
    });
  });

  describe('CalendarDayGrid', () => {
    it('renders Empty state when there are no active dossiers on that day', () => {
      render(
        <CalendarDayGrid
          currentDate={dayjs('2026-10-05')}
          lockedDossiers={[]}
          onOpenDossier={jest.fn()}
        />,
      );

      expect(
        screen.getByText(/Không có hồ sơ nào chạy trong ngày/i),
      ).toBeInTheDocument();
    });

    it('renders dossier cards with customer name and lock status when active', () => {
      const onOpenDossier = jest.fn();
      const lockedDossiers: DossierItem[] = [
        {
          id: 'dos-2',
          code: 'DS-2026',
          name: 'Tour Phú Quốc 3N2D',
          startDate: '2026-10-05',
          endDate: '2026-10-07',
          customer: { displayName: 'Chị Lan' },
        } as any,
      ];

      render(
        <CalendarDayGrid
          currentDate={dayjs('2026-10-05')}
          lockedDossiers={lockedDossiers}
          onOpenDossier={onOpenDossier}
        />,
      );

      expect(screen.getByText('Chị Lan')).toBeInTheDocument();
      expect(screen.getByText('DS-2026')).toBeInTheDocument();
      expect(screen.getByText('Tour Phú Quốc 3N2D')).toBeInTheDocument();
      expect(screen.getByText(/Đã khóa/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Chị Lan'));
      expect(onOpenDossier).toHaveBeenCalledWith('dos-2');
    });
  });
});
