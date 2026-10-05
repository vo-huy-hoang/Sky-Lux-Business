'use client';

import React from 'react';
import { Spin, Alert, Button } from 'antd';
import { useCalendarState } from './calendar/useCalendarState';
import CalendarHeaderToolbar from './calendar/CalendarHeaderToolbar';
import CalendarMonthGrid from './calendar/CalendarMonthGrid';
import CalendarWeekGrid from './calendar/CalendarWeekGrid';
import CalendarDayGrid from './calendar/CalendarDayGrid';
import CalendarLegendBar from './calendar/CalendarLegendBar';

export * from './calendar/calendar-types';

export default function CeoCalendarView() {
  const {
    currentDate,
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
  } = useCalendarState();

  return (
    <div className="w-full space-y-4">
      {/* Khung chính Lịch */}
      <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-7">
        {/* Header Bar điều hướng và chuyển viewMode */}
        <CalendarHeaderToolbar
          headerTitle={headerTitle}
          viewMode={viewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onChangeViewMode={setViewMode}
        />

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

        {/* LƯỚI LỊCH THÁNG (MONTH VIEW) */}
        {!isLoading && !isError && viewMode === 'MONTH' && (
          <CalendarMonthGrid
            weeksMatrix={weeksMatrix}
            weekEventsMap={weekEventsMap}
            onOpenDossier={handleOpenDossier}
          />
        )}

        {/* CHẾ ĐỘ XEM TUẦN (WEEK VIEW) */}
        {!isLoading && !isError && viewMode === 'WEEK' && (
          <CalendarWeekGrid
            currentDate={currentDate}
            lockedDossiers={lockedDossiers}
            onOpenDossier={handleOpenDossier}
          />
        )}

        {/* CHẾ ĐỘ XEM NGÀY (DAY VIEW) */}
        {!isLoading && !isError && viewMode === 'DAY' && (
          <CalendarDayGrid
            currentDate={currentDate}
            lockedDossiers={lockedDossiers}
            onOpenDossier={handleOpenDossier}
          />
        )}

        {/* Thanh chú giải 4 mảng màu chuẩn */}
        <CalendarLegendBar />
      </div>
    </div>
  );
}
