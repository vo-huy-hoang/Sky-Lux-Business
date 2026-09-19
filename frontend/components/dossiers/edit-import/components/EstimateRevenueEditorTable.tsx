'use client';

import React, { memo } from 'react';
import { Input, InputNumber, Select, Button, Tooltip } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  WarningFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { EditableRevenueRow } from '../validation/estimate-validator';
import { formatCurrency as formatCurrencyBase } from '@/lib/financial-calculations';

function formatCurrency(amount?: number | string) {
  return formatCurrencyBase(amount, { showSymbol: false });
}

interface EditableRevenueRowItemProps {
  row: EditableRevenueRow;
  onCellChange: (id: string, patch: Partial<EditableRevenueRow>) => void;
  onDeleteRow: (id: string) => void;
}

const EditableRevenueRowItem = memo<EditableRevenueRowItemProps>(
  ({ row, onCellChange, onDeleteRow }) => {
    const rowTotal =
      row.quantity * row.multiplier * row.unitPrice * (1 + row.vatRate / 100);
    const isWarning = row.status === 'WARNING';
    const isError = row.status === 'ERROR';

    return (
      <tr
        id={`revenue-row-${row.id}`}
        className={`transition-colors duration-200 ${
          isError
            ? 'bg-rose-50/50 hover:bg-rose-50/80'
            : isWarning
              ? 'bg-amber-50/40 hover:bg-amber-50/70'
              : 'hover:bg-slate-50/70'
        }`}
      >
        <td className="py-2.5 px-2 text-center text-slate-400 font-medium">
          {row.stt}
        </td>
        <td className="py-2.5 px-2">
          <Input
            size="small"
            value={row.description}
            onChange={(event) =>
              onCellChange(row.id, { description: event.target.value })
            }
            placeholder="Mô tả dịch vụ doanh thu..."
            className="h-7 rounded-md border-slate-200 text-xs font-medium text-slate-800 hover:border-slate-300 focus:border-emerald-600"
          />
        </td>
        <td className="py-2.5 px-2 text-center">
          <InputNumber<number>
            size="small"
            min={0}
            value={row.quantity}
            onChange={(value) =>
              onCellChange(row.id, { quantity: value ?? 0 })
            }
            controls={false}
            className="w-14 h-7 rounded-md border-slate-200 font-mono text-xs font-semibold [&_input]:text-center"
          />
        </td>
        <td className="py-2.5 px-2 text-center">
          <InputNumber<number>
            size="small"
            min={0}
            value={row.multiplier}
            onChange={(value) =>
              onCellChange(row.id, { multiplier: value ?? 0 })
            }
            controls={false}
            className="w-14 h-7 rounded-md border-slate-200 font-mono text-xs font-semibold [&_input]:text-center"
          />
        </td>
        <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
          {row.unit}
        </td>
        <td className="py-2.5 px-2 text-right">
          <InputNumber<number>
            size="small"
            value={row.unitPrice}
            onChange={(val) =>
              onCellChange(row.id, { unitPrice: val ?? 0 })
            }
            formatter={(value) =>
              value !== undefined && value !== null
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                : ''
            }
            parser={(displayValue) =>
              displayValue ? Number(displayValue.replace(/\D/g, '')) : 0
            }
            controls={false}
            className={`w-full text-right font-mono font-medium text-xs h-7 rounded-md [&_input]:text-right ${
              isError
                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500'
                : isWarning
                  ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:border-amber-500'
                  : 'border-slate-200 text-slate-800'
            }`}
          />
        </td>
        <td className="py-2.5 px-2 text-center">
          <Select
            size="small"
            value={row.vatRate}
            onChange={(val) => onCellChange(row.id, { vatRate: val })}
            className="w-14 text-xs"
            options={[
              { label: '0', value: 0 },
              { label: '8', value: 8 },
              { label: '10', value: 10 },
            ]}
          />
        </td>
        <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
          {formatCurrency(rowTotal)}
        </td>
        <td className="py-2.5 px-2">
          <span
            className={`truncate block max-w-[180px] font-medium ${
              isError
                ? 'text-rose-700 font-semibold'
                : isWarning
                  ? 'text-amber-700 font-semibold'
                  : 'text-slate-500'
            }`}
            title={row.warningMessage || row.note}
          >
            {row.warningMessage || row.note}
          </span>
        </td>
        <td className="py-2.5 px-2 text-center">
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0 flex-1">
              {row.status === 'VALID' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Hợp lệ
                </span>
              )}
              {row.status === 'WARNING' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                  <WarningFilled className="text-[10px]" />
                  Cảnh báo
                </span>
              )}
              {row.status === 'ERROR' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                  <CloseCircleFilled className="text-[10px]" />
                  Lỗi
                </span>
              )}
            </div>
            <Tooltip title="Xóa dòng doanh thu này">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined className="text-[11px]" />}
                onClick={() => onDeleteRow(row.id)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
              />
            </Tooltip>
          </div>
        </td>
      </tr>
    );
  },
  (prev, next) => {
    return (
      prev.row.id === next.row.id &&
      prev.row.stt === next.row.stt &&
      prev.row.description === next.row.description &&
      prev.row.quantity === next.row.quantity &&
      prev.row.multiplier === next.row.multiplier &&
      prev.row.unit === next.row.unit &&
      prev.row.unitPrice === next.row.unitPrice &&
      prev.row.vatRate === next.row.vatRate &&
      prev.row.note === next.row.note &&
      prev.row.status === next.row.status &&
      prev.row.warningMessage === next.row.warningMessage
    );
  },
);

EditableRevenueRowItem.displayName = 'EditableRevenueRowItem';

interface EstimateRevenueEditorTableProps {
  rows: EditableRevenueRow[];
  totalRevenueNoVat: number;
  onCellChange: (id: string, patch: Partial<EditableRevenueRow>) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
}

export const EstimateRevenueEditorTable: React.FC<
  EstimateRevenueEditorTableProps
> = ({ rows, totalRevenueNoVat, onCellChange, onAddRow, onDeleteRow }) => {
  return (
    <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-slate-900 mb-0 tracking-tight">
            1. Doanh thu
          </h2>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-2 py-0.5 rounded-md">
            Chỉnh sửa trực tiếp trên bảng
          </span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onAddRow}
            className="h-6 rounded-md border-emerald-200 text-emerald-700 hover:border-emerald-600 hover:text-emerald-800 text-[11px] font-semibold"
          >
            Thêm dòng
          </Button>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Doanh thu tạm tính (chưa VAT):{' '}
          <span className="font-mono font-bold text-slate-900 ml-1">
            {formatCurrency(totalRevenueNoVat)} VNĐ
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-medium">
              <th className="py-2.5 px-2 text-center w-10">STT</th>
              <th className="py-2.5 px-2 min-w-[200px]">Mô tả dịch vụ</th>
              <th className="py-2.5 px-2 text-center w-20">Số lượng</th>
              <th className="py-2.5 px-2 text-center w-20">Hệ số</th>
              <th className="py-2.5 px-2 text-center w-20">Đơn vị</th>
              <th className="py-2.5 px-2 text-right w-36">Đơn giá (VNĐ)</th>
              <th className="py-2.5 px-2 text-center w-20">VAT (%)</th>
              <th className="py-2.5 px-2 text-right w-36">Thành tiền (VNĐ)</th>
              <th className="py-2.5 px-2 min-w-[140px]">Ghi chú</th>
              <th className="py-2.5 px-2 text-center w-28">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr className="bg-slate-50/50">
                <td
                  colSpan={10}
                  className="py-8 text-center text-slate-400 text-xs"
                >
                  <div className="font-medium text-slate-600 mb-1">
                    Chưa có dòng doanh thu nào
                  </div>
                  <div className="text-[11px] mb-3">
                    Bấm &quot;Thêm dòng&quot; để thêm các mục doanh thu khách hàng thanh toán cho tour.
                  </div>
                  <Button
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={onAddRow}
                    className="text-xs text-emerald-700 border-emerald-300 hover:border-emerald-600"
                  >
                    Thêm dòng doanh thu
                  </Button>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <EditableRevenueRowItem
                  key={row.id}
                  row={row}
                  onCellChange={onCellChange}
                  onDeleteRow={onDeleteRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Total Revenue Footer */}
      <div className="flex items-center justify-end gap-6 pt-3 mt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-500 font-medium">
          Tổng doanh thu (chưa VAT):
        </span>
        <span className="font-bold text-slate-900 font-mono text-sm">
          {formatCurrency(totalRevenueNoVat)}
        </span>
      </div>
    </div>
  );
};
