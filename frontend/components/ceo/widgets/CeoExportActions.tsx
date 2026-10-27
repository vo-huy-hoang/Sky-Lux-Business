'use client';

import React from 'react';
import { Button, DatePicker, Select } from 'antd';
import { CalendarOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

interface CeoExportActionsProps {
  allTime: boolean;
  onToggleAllTime: (allTime: boolean) => void;
  anchorDate: dayjs.Dayjs;
  onDateChange: (dateString: string) => void;
  overview?: {
    totalRevenue?: number | string;
    totalProfit?: number | string;
  };
  totalDossiers: number;
  pendingCount: number;
  sortedChartBreakdown: Array<{ name: string; amount: number | string }>;
}

export default function CeoExportActions({
  allTime,
  onToggleAllTime,
  anchorDate,
  onDateChange,
  overview,
  totalDossiers,
  pendingCount,
  sortedChartBreakdown,
}: CeoExportActionsProps) {
  const exportSummary = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      const rows = [
        ['Chỉ số', allTime ? 'Tất cả thời gian' : `Tháng ${anchorDate.format('MM/YYYY')}`],
        ['Tổng doanh thu', overview?.totalRevenue || 0],
        ['Lợi nhuận', overview?.totalProfit || 0],
        ['Tổng hồ sơ', totalDossiers],
        ['Hồ sơ chờ duyệt', pendingCount],
        ...sortedChartBreakdown.map((item) => [item.name, Number(item.amount || 0)]),
      ];
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Tổng quan');
      writeFile(
        workbook,
        `bang-dieu-khien-${allTime ? 'tat-ca-thoi-gian' : anchorDate.format('YYYY-MM')}.xlsx`,
      );
    } catch (error) {
      console.error('Lỗi xuất file Excel:', error);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center">
          <div className="flex min-h-[56px] w-full max-w-[400px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:border-slate-300">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarOutlined className="shrink-0 text-sm text-slate-500" />
              <div className="min-w-0">
                <div className="text-[11px] leading-tight text-slate-600">Kỳ báo cáo</div>
                <div className="flex items-center gap-1">
                  <Select
                    aria-label="Chế độ kỳ báo cáo"
                    value={allTime ? 'ALL_TIME' : 'MONTHLY'}
                    onChange={(value) => onToggleAllTime(value === 'ALL_TIME')}
                    variant="borderless"
                    className="!w-[150px] !p-0 !text-sm [&_.ant-select-selection-item]:!font-semibold [&_.ant-select-selection-item]:!text-slate-800"
                    options={[
                      { value: 'MONTHLY', label: 'Theo tháng' },
                      { value: 'ALL_TIME', label: 'Tất cả thời gian' },
                    ]}
                  />
                  {!allTime && (
                    <DatePicker
                      picker="month"
                      value={anchorDate}
                      onChange={(value) =>
                        value && onDateChange(value.startOf('month').format('YYYY-MM-DD'))
                      }
                      format="MM/YYYY"
                      allowClear={false}
                      inputReadOnly
                      variant="borderless"
                      className="!w-[88px] !p-0 !text-sm !font-semibold [&_.ant-picker-input>input]:!cursor-pointer [&_.ant-picker-input>input]:!font-semibold [&_.ant-picker-input>input]:!text-slate-800"
                      aria-label="Kỳ báo cáo theo tháng"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2.5">
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => window.print()}
            className="!h-9 !rounded-lg !border-[var(--color-primary-600)] !px-3.5 !font-semibold !text-[var(--color-primary-600)] hover:!bg-[var(--color-primary-soft)]"
          >
            Xuất PDF
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            onClick={exportSummary}
            className="!h-9 !rounded-lg !border-[var(--color-primary-900)] !bg-[var(--color-primary-900)] !px-3.5 !font-semibold !text-white hover:!border-[var(--color-primary-950)] hover:!bg-[var(--color-primary-950)]"
          >
            Xuất Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
