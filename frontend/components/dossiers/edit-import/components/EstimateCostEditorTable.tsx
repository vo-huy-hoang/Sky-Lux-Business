'use client';

import React, { memo } from 'react';
import { Input, InputNumber, Select, Button, Tooltip, Tag } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  WarningFilled,
  CloseCircleFilled,
  FileExcelOutlined,
} from '@ant-design/icons';
import {
  EditableCostRow,
  calculateCostRowAmount,
} from '../validation/estimate-validator';
import { formatCurrency as formatCurrencyBase } from '@/lib/financial-calculations';

function formatCurrency(amount?: number | string) {
  return formatCurrencyBase(amount, { showSymbol: false });
}

interface EditableCostRowItemProps {
  row: EditableCostRow;
  type: 'vat' | 'novat';
  displayStt?: number;
  supplierOptions: { label: string; value: string; id?: string }[];
  onCellChange: (id: string, patch: Partial<EditableCostRow>) => void;
  onDeleteRow: (id: string) => void;
}

const EditableCostRowItem = memo<EditableCostRowItemProps>(
  ({
    row,
    type,
    displayStt,
    supplierOptions,
    onCellChange,
    onDeleteRow,
  }) => {
    const rowTotal = calculateCostRowAmount(row);
    const isWarning = row.status === 'WARNING';
    const isError = row.status === 'ERROR';

    const hoverBg = isError
      ? 'bg-rose-50/50 hover:bg-rose-50/80'
      : isWarning
        ? 'bg-amber-50/40 hover:bg-amber-50/70'
        : type === 'vat'
          ? 'hover:bg-sky-50/40 bg-white'
          : 'hover:bg-amber-50/40 bg-white';

    return (
      <tr
        id={`cost-row-${row.id}`}
        className={`transition-colors duration-150 ${hoverBg}`}
      >
        <td className="py-2.5 px-2 text-center text-slate-500 font-medium border-r border-slate-200">
          {displayStt ?? row.stt}
        </td>
        <td className="py-2.5 px-2 border-r border-slate-200">
          <Input
            size="small"
            value={row.description}
            onChange={(event) =>
              onCellChange(row.id, { description: event.target.value })
            }
            placeholder="Mô tả dịch vụ chi phí..."
            className="h-7 rounded-md border-slate-200 text-xs font-medium text-slate-800 hover:border-slate-300 focus:border-emerald-600"
          />
        </td>
        <td className="py-2.5 px-2 border-r border-slate-200">
          <Select
            size="small"
            showSearch
            optionFilterProp="label"
            value={row.supplierName}
            placeholder="Chọn nhà cung cấp..."
            onChange={(val) => {
              const matched = supplierOptions.find((s) => s.value === val);
              onCellChange(row.id, {
                supplierName: val,
                supplierId: matched?.id,
              });
            }}
            options={supplierOptions}
            className="w-full text-xs"
          />
        </td>
        <td className="py-2.5 px-1.5 text-center border-r border-slate-200">
          <InputNumber<number>
            size="small"
            min={0}
            value={row.quantity}
            onChange={(value) =>
              onCellChange(row.id, { quantity: value ?? 0, sourceAmount: null })
            }
            controls={false}
            className="w-14 h-7 rounded-md border-slate-200 font-mono text-xs font-semibold [&_input]:text-center"
          />
        </td>
        <td className="py-2.5 px-1.5 text-center border-r border-slate-200">
          <InputNumber<number>
            size="small"
            min={0}
            value={row.multiplier}
            onChange={(value) =>
              onCellChange(row.id, { multiplier: value ?? 0, sourceAmount: null })
            }
            controls={false}
            className="w-14 h-7 rounded-md border-slate-200 font-mono text-xs font-semibold [&_input]:text-center"
          />
        </td>
        <td className="py-2.5 px-1.5 text-center border-r border-slate-200">
          <Input
            size="small"
            value={row.unit}
            onChange={(e) =>
              onCellChange(row.id, { unit: e.target.value })
            }
            className="w-12 h-7 rounded-md border-slate-200 text-center text-xs font-medium"
          />
        </td>
        <td className="py-2.5 px-2 text-right border-r border-slate-200">
          <InputNumber<number>
            size="small"
            value={row.unitPrice}
            onChange={(val) =>
              onCellChange(row.id, {
                unitPrice: val ?? 0,
                sourceAmount: null,
              })
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
        <td className="py-2.5 px-1.5 text-center border-r border-slate-200">
          <Select
            size="small"
            value={row.vatRate}
            onChange={(val) =>
              onCellChange(row.id, { vatRate: val, sourceAmount: null })
            }
            className="w-14 text-xs"
            options={[
              { label: '0', value: 0 },
              { label: '8', value: 8 },
              { label: '10', value: 10 },
            ]}
          />
        </td>
        <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-900 border-r border-slate-200">
          {formatCurrency(rowTotal)}
        </td>
        <td className="py-2.5 px-2 border-r border-slate-200">
          <Input
            size="small"
            value={row.note}
            onChange={(e) =>
              onCellChange(row.id, { note: e.target.value })
            }
            placeholder="Ghi chú chi phí..."
            className="h-7 rounded-md border-slate-200 text-xs font-normal text-slate-600 hover:border-slate-300 focus:border-emerald-600"
          />
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
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 truncate"
                  title={row.warningMessage || 'Cảnh báo dữ liệu'}
                >
                  <WarningFilled className="text-[10px]" />
                  Cảnh báo
                </span>
              )}
              {row.status === 'ERROR' && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 truncate"
                  title={row.warningMessage || 'Lỗi dữ liệu'}
                >
                  <CloseCircleFilled className="text-[10px]" />
                  Lỗi
                </span>
              )}
            </div>
            <Tooltip title="Xóa dòng chi phí này">
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
      prev.displayStt === next.displayStt &&
      prev.row.description === next.row.description &&
      prev.row.supplierName === next.row.supplierName &&
      prev.row.quantity === next.row.quantity &&
      prev.row.multiplier === next.row.multiplier &&
      prev.row.unit === next.row.unit &&
      prev.row.unitPrice === next.row.unitPrice &&
      prev.row.vatRate === next.row.vatRate &&
      prev.row.note === next.row.note &&
      prev.row.status === next.row.status &&
      prev.row.warningMessage === next.row.warningMessage &&
      prev.supplierOptions === next.supplierOptions
    );
  },
);

EditableCostRowItem.displayName = 'EditableCostRowItem';

interface CostVatSection {
  code: string;
  title: string;
  order: number;
  items: EditableCostRow[];
}

interface EstimateCostEditorTableProps {
  costRows: EditableCostRow[];
  costVatSections: CostVatSection[];
  costNoVatItems: EditableCostRow[];
  totalCostVat: number;
  totalCostNoVatSum: number;
  grandTotalCost: number;
  supplierOptions: { label: string; value: string; id?: string }[];
  onCellChange: (id: string, patch: Partial<EditableCostRow>) => void;
  onAddRow: (
    categoryTitle: string,
    type: 'vat' | 'novat',
    serviceCategoryId?: string,
  ) => void;
  onDeleteRow: (id: string) => void;
}

export const EstimateCostEditorTable: React.FC<
  EstimateCostEditorTableProps
> = ({
  costRows,
  costVatSections,
  costNoVatItems,
  totalCostVat,
  totalCostNoVatSum,
  grandTotalCost,
  supplierOptions,
  onCellChange,
  onAddRow,
  onDeleteRow,
}) => {
  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
      {/* Header Bar: Title & Summary badges */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
            <FileExcelOutlined className="text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 mb-0 uppercase tracking-tight">
                2. Chi phí theo hạng mục
              </h3>
              <Tag
                color="green"
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 bg-emerald-50 text-emerald-700"
              >
                Chỉnh sửa trực tiếp trên bảng
              </Tag>
            </div>
            <p className="text-[11px] text-slate-400 mb-0 mt-0.5">
              Phân loại theo dịch vụ đầu vào có VAT và chưa VAT
            </p>
          </div>
        </div>

        {/* Quick Summary Pill Counters */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100/80 text-sky-900 font-medium text-[11px]">
            Có VAT:{' '}
            <span className="font-mono font-bold">
              {formatCurrency(totalCostVat)}
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100/80 text-amber-900 font-medium text-[11px]">
            Chưa VAT:{' '}
            <span className="font-mono font-bold">
              {formatCurrency(totalCostNoVatSum)}
            </span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100/80 text-rose-900 font-bold text-[11px]">
            Tổng chi phí:{' '}
            <span className="font-mono font-bold">
              {formatCurrency(grandTotalCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold text-[11px] uppercase tracking-wider border-b border-slate-300">
              <th className="py-2.5 px-2 text-center w-10 border-r border-slate-300">
                STT
              </th>
              <th className="py-2.5 px-2.5 min-w-[160px] border-r border-slate-300">
                Mô tả chi phí
              </th>
              <th className="py-2.5 px-2.5 min-w-[170px] border-r border-slate-300">
                Nhà cung cấp
              </th>
              <th className="py-2.5 px-1.5 text-center w-16 border-r border-slate-300">
                SL
              </th>
              <th className="py-2.5 px-1.5 text-center w-16 border-r border-slate-300">
                Hệ số
              </th>
              <th className="py-2.5 px-1.5 text-center w-16 border-r border-slate-300">
                ĐVT
              </th>
              <th className="py-2.5 px-2 text-right w-32 border-r border-slate-300">
                Đơn giá (VNĐ)
              </th>
              <th className="py-2.5 px-1.5 text-center w-18 border-r border-slate-300">
                VAT (%)
              </th>
              <th className="py-2.5 px-2.5 text-right w-36 border-r border-slate-300">
                Thành tiền trước VAT (VNĐ)
              </th>
              <th className="py-2.5 px-2 min-w-[120px] border-r border-slate-300">
                Ghi chú
              </th>
              <th className="py-2.5 px-2 text-center w-28">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/90 text-slate-800">
            {(() => {
              let currentStt = 1;
              return (
                <>
                  {/* PHẦN I: DỊCH VỤ ĐẦU VÀO CÓ VAT */}
                  <tr className="bg-[#D9EAF7] text-slate-900 font-bold border-y border-sky-300">
                    <td className="py-2 px-2 text-center font-bold border-r border-sky-200">
                      I
                    </td>
                    <td
                      colSpan={10}
                      className="py-2 px-3 tracking-wide uppercase font-bold text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>DỊCH VỤ ĐẦU VÀO CÓ VAT</span>
                        <Tooltip title="Thêm dòng vào dịch vụ có VAT chung">
                          <button
                            type="button"
                            onClick={() =>
                              onAddRow('DỊCH VỤ ĐẦU VÀO CÓ VAT', 'vat')
                            }
                            className="inline-flex items-center justify-center w-5 h-5 rounded bg-white hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-300 hover:border-sky-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
                            aria-label="Thêm dòng vào dịch vụ có VAT"
                          >
                            <PlusOutlined className="text-[10px]" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>

                  {costVatSections.length === 0 && (
                    <tr className="bg-slate-50/50 text-slate-400 italic text-[11px]">
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        -
                      </td>
                      <td colSpan={10} className="py-2 px-3 text-slate-400">
                        Chưa có dịch vụ có VAT. Bấm dấu{' '}
                        <span className="font-bold text-sky-700 not-italic">
                          +
                        </span>{' '}
                        bên cạnh tiêu đề để thêm dòng mới.
                      </td>
                    </tr>
                  )}

                  {costVatSections.map((sec, secIdx) => (
                    <React.Fragment key={sec.title}>
                      <tr className="bg-[#EAF3FA] text-slate-900 font-semibold border-y border-sky-200/80">
                        <td className="py-1.5 px-2 text-center font-bold text-[11px] text-sky-900 border-r border-slate-300">
                          {sec.code}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-xs text-sky-950 uppercase border-r border-slate-300">
                          <div className="flex items-center justify-between gap-2">
                            <span>{sec.title}</span>
                            <Tooltip
                              title={`Thêm dòng vào mục ${sec.title}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  onAddRow(
                                    sec.title,
                                    'vat',
                                    sec.items.find(
                                      (item) => item.serviceCategoryId,
                                    )?.serviceCategoryId,
                                  )
                                }
                                className="inline-flex items-center justify-center w-5 h-5 rounded bg-white hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-300 hover:border-sky-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
                                aria-label={`Thêm dòng vào ${sec.title}`}
                              >
                                <PlusOutlined className="text-[10px]" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-[11px] font-bold text-sky-800 uppercase border-r border-slate-300">
                          {secIdx === 0 ? 'NHÀ CUNG CẤP' : ''}
                        </td>
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td className="border-r border-slate-300" />
                        <td />
                      </tr>
                      {sec.items.length === 0 ? (
                        <tr className="bg-slate-50/50 text-slate-400 italic text-[11px]">
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            -
                          </td>
                          <td
                            colSpan={10}
                            className="py-2 px-3 text-slate-400"
                          >
                            Chưa có dịch vụ trong mục này. Bấm dấu{' '}
                            <span className="font-bold text-sky-700 not-italic">
                              +
                            </span>{' '}
                            bên cạnh tiêu đề để thêm dòng mới.
                          </td>
                        </tr>
                      ) : (
                        sec.items.map((row) => (
                          <EditableCostRowItem
                            key={row.id}
                            row={row}
                            type="vat"
                            displayStt={currentStt++}
                            supplierOptions={supplierOptions}
                            onCellChange={onCellChange}
                            onDeleteRow={onDeleteRow}
                          />
                        ))
                      )}
                    </React.Fragment>
                  ))}

                  {/* PHẦN II: DỊCH VỤ ĐẦU VÀO CHƯA VAT */}
                  <tr className="bg-[#FFF2CC] text-amber-950 font-bold border-y border-amber-300">
                    <td className="py-2 px-2 text-center font-bold border-r border-amber-200">
                      II
                    </td>
                    <td
                      colSpan={10}
                      className="py-2 px-3 tracking-wide uppercase font-bold text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>DỊCH VỤ ĐẦU VÀO CHƯA VAT</span>
                        <Tooltip title="Thêm dòng dịch vụ chưa VAT">
                          <button
                            type="button"
                            onClick={() =>
                              onAddRow(
                                'DỊCH VỤ ĐẦU VÀO CHƯA VAT',
                                'novat',
                              )
                            }
                            className="inline-flex items-center justify-center w-5 h-5 rounded bg-white hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-400 hover:border-amber-600 transition-colors cursor-pointer shadow-2xs active:scale-95 mr-2"
                            aria-label="Thêm dòng dịch vụ chưa VAT"
                          >
                            <PlusOutlined className="text-[10px]" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  {costNoVatItems.length === 0 ? (
                    <tr className="bg-slate-50/50 text-slate-400 italic text-[11px]">
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        -
                      </td>
                      <td
                        colSpan={10}
                        className="py-2 px-3 text-slate-400"
                      >
                        Chưa có dịch vụ chưa VAT. Bấm dấu{' '}
                        <span className="font-bold text-amber-700 not-italic">
                          +
                        </span>{' '}
                        để thêm dòng mới.
                      </td>
                    </tr>
                  ) : (
                    costNoVatItems.map((row) => (
                      <EditableCostRowItem
                        key={row.id}
                        row={row}
                        type="novat"
                        displayStt={currentStt++}
                        supplierOptions={supplierOptions}
                        onCellChange={onCellChange}
                        onDeleteRow={onDeleteRow}
                      />
                    ))
                  )}
                </>
              );
            })()}
          </tbody>

          {/* Footer Row: TỔNG CỘNG */}
          <tfoot>
            <tr className="bg-[#FCE4D6] text-slate-900 font-bold border-t-2 border-slate-400">
              <td
                colSpan={8}
                className="py-2.5 px-3 text-center font-extrabold uppercase tracking-wider text-xs border-r border-slate-300"
              >
                TỔNG CỘNG
              </td>
              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-sm text-slate-950 border-r border-slate-300">
                {formatCurrency(grandTotalCost)}
              </td>
              <td colSpan={2} className="py-2.5 px-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Note Bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="italic">
          * Bảng chiết tính chi phí đầu vào phân loại tự động theo VAT
        </span>
        <span className="font-medium text-slate-500">
          Tổng cộng: {costRows.length} hạng mục dịch vụ
        </span>
      </div>
    </div>
  );
};
