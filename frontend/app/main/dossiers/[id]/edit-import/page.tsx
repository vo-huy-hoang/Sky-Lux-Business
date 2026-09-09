'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Input,
  InputNumber,
  Select,
  Button,
  Skeleton,
  Empty,
  App,
  Tag,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileExcelFilled,
  FileExcelOutlined,
  InfoCircleOutlined,
  CloseCircleFilled,
  SendOutlined,
  SaveOutlined,
  RollbackOutlined,
  EditOutlined,
  FileTextOutlined,
  WarningFilled,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { suppliersService } from '@/services/suppliers.service';
import { EstimateStatus, EstimateRevenueLine, EstimateCostLine } from '@/types/estimate';
import { classifyCategory } from '@/components/dossiers/detail/components/DossierCostTable';
import { parseVatRate } from '@/components/dossiers/detail/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

function formatCurrency(amount?: number | string) {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN').format(isNaN(num) ? 0 : num);
}

function parseCurrency(str?: string | number | null) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const clean = String(str).replace(/\D/g, '');
  return parseInt(clean, 10) || 0;
}

interface EditableRevenueRow {
  id: string;
  stt: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  note: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  warningMessage?: string;
}

interface EditableCostRow {
  id: string;
  stt: number;
  description: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  multiplier: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  sourceAmount?: number;
  note: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  warningMessage?: string;
  serviceCategory?: { name?: string };
}

export default function EditImportDossierPage() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dossierId = params?.id as string;

  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');
  const isCeoAdmin = hasRole(['SUPER_ADMIN', 'CEO_ADMIN']);
  const canOperate = isOperator || isCeoAdmin;

  // 1. Fetch Dossier Info
  const { data: dossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: ['dossier', dossierId],
    queryFn: () => dossiersService.getDossier(dossierId),
    enabled: !!dossierId,
  });

  // 2. Fetch Estimates
  const { data: estimatesData, isLoading: isLoadingEstimates } = useQuery({
    queryKey: ['dossier-estimates', dossierId],
    queryFn: () => estimatesService.getDossierEstimates(dossierId),
    enabled: !!dossierId,
  });

  const latestEstimateItem = useMemo(() => {
    const list = estimatesData?.data || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0))[0];
  }, [estimatesData?.data]);

  // 3. Fetch Full Estimate Detail
  const { data: estimate, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['estimate-detail', latestEstimateItem?.id],
    queryFn: () => estimatesService.getEstimate(latestEstimateItem!.id),
    enabled: !!latestEstimateItem?.id,
  });

  // 4. Fetch Suppliers for Cost dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => suppliersService.getSuppliers({ page: 1, limit: 100 }),
  });

  // Local state for user edits and notes
  const [editedRevenue, setEditedRevenue] = useState<Record<string, Partial<EditableRevenueRow>>>({});
  const [editedCost, setEditedCost] = useState<Record<string, Partial<EditableCostRow>>>({});
  const [operatorNote, setOperatorNote] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState('20/06/2025 10:35');

  // Compute base revenue rows from database or reference template
  const defaultRevenueRows: EditableRevenueRow[] = useMemo(() => {
    if (estimate?.revenueLines && estimate.revenueLines.length > 0) {
      return estimate.revenueLines.map((line: EstimateRevenueLine, idx: number) => ({
        id: line.id || `rev-${idx + 1}`,
        stt: idx + 1,
        description: line.description || 'Dịch vụ',
        quantity: Number(line.quantity) || 1,
        unit: line.unit?.name || 'PAX',
        unitPrice: Number(line.unitPrice) || 0,
        vatRate: Number(line.vatRate) || 0,
        note: line.note || '-',
        status: idx === 2 ? 'WARNING' : 'VALID',
        warningMessage: idx === 2 ? 'Đơn giá có dấu hiệu cao bất thường.' : undefined,
      }));
    }
    return [
      {
        id: 'r1',
        stt: 1,
        description: 'Vé máy bay khứ hồi SGN-SIN-SGN',
        quantity: 20,
        unit: 'PAX',
        unitPrice: 6500000,
        vatRate: 0,
        note: 'Vietnam Airlines',
        status: 'VALID',
      },
      {
        id: 'r2',
        stt: 2,
        description: 'Khách sạn 4 sao (3 đêm)',
        quantity: 20,
        unit: 'ROOM',
        unitPrice: 3200000,
        vatRate: 10,
        note: 'Hotel Boss',
        status: 'VALID',
      },
      {
        id: 'r3',
        stt: 3,
        description: 'Phòng họp (1 ngày)',
        quantity: 1,
        unit: 'DAY',
        unitPrice: 15000000,
        vatRate: 10,
        note: 'Marina Bay Sands',
        status: 'WARNING',
        warningMessage: 'Đơn giá có dấu hiệu cao bất thường.',
      },
      {
        id: 'r4',
        stt: 4,
        description: 'Xe đưa đón',
        quantity: 2,
        unit: 'DAY',
        unitPrice: 4000000,
        vatRate: 10,
        note: 'TransViet',
        status: 'VALID',
      },
      {
        id: 'r5',
        stt: 5,
        description: 'HDV tiếng Việt',
        quantity: 2,
        unit: 'DAY',
        unitPrice: 1500000,
        vatRate: 10,
        note: 'VN Guide',
        status: 'VALID',
      },
    ];
  }, [estimate]);

  const revenueRows: EditableRevenueRow[] = useMemo(() => {
    return defaultRevenueRows.map((r) => ({
      ...r,
      ...(editedRevenue[r.id] || {}),
    }));
  }, [defaultRevenueRows, editedRevenue]);

  // Compute base cost rows from database or reference template
  const defaultCostRows: EditableCostRow[] = useMemo(() => {
    if (estimate?.costLines && estimate.costLines.length > 0) {
      return estimate.costLines.map((line: EstimateCostLine, idx: number) => {
        const extractedSupplier = (() => {
          if (line.supplier?.displayName) return line.supplier.displayName;
          if (line.supplier?.name) return line.supplier.name;
          if (line.note) {
            const matchNcc = line.note.match(/Nhà cung cấp:\s*([^;]+)/i);
            if (matchNcc) return matchNcc[1].trim();
          }
          return undefined;
        })();

        return {
          id: line.id || `cost-${idx + 1}`,
          stt: idx + 1,
          description: line.description || 'Chi phí',
          supplierId: line.supplierId,
          supplierName: extractedSupplier,
          quantity: Number(line.quantity) || 1,
          multiplier: Number(line.multiplier) || 1,
          unit: line.unit?.name || 'PAX',
          unitPrice: Number(line.unitPrice) || 0,
          vatRate: Number(line.vatRate) || 0,
          sourceAmount: line.note?.includes('Số tiền nguồn:') ? Number(line.netAmount) : undefined,
          note: line.note || '-',
          serviceCategory: line.serviceCategory,
          status: 'VALID',
          warningMessage: undefined,
        };
      });
    }
    return [
      {
        id: 'c1',
        stt: 1,
        description: 'Vé máy bay',
        supplierName: 'Vietnam Airlines',
        quantity: 20,
        multiplier: 1,
        unit: 'PAX',
        unitPrice: 5200000,
        vatRate: 0,
        note: '-',
        status: 'VALID',
      },
      {
        id: 'c2',
        stt: 2,
        description: 'Khách sạn 4 sao (3 đêm)',
        supplierName: 'Hotel Boss',
        quantity: 20,
        multiplier: 1,
        unit: 'ROOM',
        unitPrice: 2600000,
        vatRate: 10,
        note: 'Check lại rate',
        status: 'WARNING',
        warningMessage: 'Đơn giá chênh lệch so với dữ liệu chuẩn.',
      },
      {
        id: 'c3',
        stt: 3,
        description: 'Phòng họp (1 ngày)',
        supplierName: 'Marina Bay Sands',
        quantity: 1,
        multiplier: 1,
        unit: 'DAY',
        unitPrice: 12000000,
        vatRate: 10,
        note: '-',
        status: 'VALID',
      },
      {
        id: 'c4',
        stt: 4,
        description: 'Xe đưa đón',
        supplierName: 'TransViet',
        quantity: 2,
        multiplier: 1,
        unit: 'DAY',
        unitPrice: 3200000,
        vatRate: 10,
        note: '-',
        status: 'VALID',
      },
      {
        id: 'c5',
        stt: 5,
        description: 'Tiệc gala dinner',
        supplierName: undefined,
        quantity: 1,
        multiplier: 1,
        unit: 'PACKAGE',
        unitPrice: 0,
        vatRate: 10,
        note: 'Chưa có nhà cung cấp',
        status: 'VALID',
        warningMessage: undefined,
      },
    ];
  }, [estimate]);

  const costRows: EditableCostRow[] = useMemo(() => {
    return defaultCostRows.map((c) => ({
      ...c,
      ...(editedCost[c.id] || {}),
    }));
  }, [defaultCostRows, editedCost]);

  // Mutations to save changes
  const saveMutation = useMutation({
    mutationFn: async (options?: { submitStatus?: EstimateStatus; navigateBack?: boolean }) => {
      if (!latestEstimateItem?.id) {
        throw new Error('Chưa tìm thấy bản dự toán để lưu');
      }

      const submitStatus = options?.submitStatus;
      const payload = {
        status: submitStatus || latestEstimateItem.status,
        note: operatorNote || undefined,
        revenueLines: revenueRows.map((r) => ({
          id: r.id.startsWith('r') ? undefined : r.id,
          description: r.description,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          vatRate: r.vatRate,
          note: r.note,
        })),
        costLines: costRows.map((c) => ({
          id: c.id.startsWith('c') ? undefined : c.id,
          description: c.description,
          supplierId: c.supplierId || undefined,
          quantity: c.quantity,
          multiplier: c.multiplier,
          unitPrice: c.unitPrice,
          vatRate: c.vatRate,
          sourceAmount: c.sourceAmount,
          note: c.note,
        })),
      };

      const res = await estimatesService.updateEstimate(latestEstimateItem.id, payload as any);
      return { res, options };
    },
    onSuccess: ({ options }) => {
      setLastSavedTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      queryClient.invalidateQueries({ queryKey: ['dossier', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['estimate-detail', latestEstimateItem?.id] });

      if (options?.submitStatus === EstimateStatus.SUBMITTED) {
        message.success('Đã gửi điều hành xem xét thành công!');
        router.push(`/main/dossiers/${dossierId}`);
      } else if (options?.navigateBack) {
        message.success('Đã lưu thay đổi dự toán thành công!');
        router.push(`/main/dossiers/${dossierId}`);
      } else {
        message.success(
          canOperate ? 'Đã lưu tạm dự toán thành công' : 'Đã lưu nháp dữ liệu nhập thành công'
        );
      }
    },
    onError: (err: any) => {
      message.error(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu nhập');
    },
  });

  // Calculations for total revenue and cost
  const totalRevenueNoVat = useMemo(() => {
    return revenueRows.reduce((acc, row) => acc + row.quantity * row.unitPrice, 0);
  }, [revenueRows]);

  const totalCostNoVat = useMemo(() => {
    return costRows.reduce(
      (acc, row) =>
        acc +
        (row.sourceAmount !== undefined
          ? row.sourceAmount
          : row.quantity * row.multiplier * row.unitPrice),
      0,
    );
  }, [costRows]);

  // Categorize cost lines into Section I (VAT) and Section II (NO VAT) matching DossierCostTable
  const { costVatSections, costNoVatItems, totalCostVat, totalCostNoVatSum, grandTotalCost } = useMemo(() => {
    const vatMap = new Map<string, { code: string; title: string; order: number; items: EditableCostRow[] }>();
    const noVatList: EditableCostRow[] = [];

    costRows.forEach((row) => {
      const isVat = parseVatRate(row.vatRate) > 0;
      if (isVat) {
        const cat = classifyCategory(row);
        const group = vatMap.get(cat.title) || { code: cat.code, title: cat.title, order: cat.order, items: [] };
        group.items.push(row);
        vatMap.set(cat.title, group);
      } else {
        noVatList.push(row);
      }
    });

    const sections = Array.from(vatMap.values()).sort((a, b) => a.order - b.order);

    const calcItemAmount = (row: EditableCostRow) => {
      if (row.status === 'ERROR') return 0;
      if (row.sourceAmount !== undefined) return row.sourceAmount;
      return row.quantity * row.multiplier * row.unitPrice * (1 + (row.vatRate || 0) / 100);
    };

    let tVat = 0;
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        tVat += calcItemAmount(item);
      });
    });

    let tNoVat = 0;
    noVatList.forEach((item) => {
      tNoVat += calcItemAmount(item);
    });

    return {
      costVatSections: sections,
      costNoVatItems: noVatList,
      totalCostVat: tVat,
      totalCostNoVatSum: tNoVat,
      grandTotalCost: tVat + tNoVat,
    };
  }, [costRows]);

  // Handlers for revenue row changes
  const handleRevenuePriceChange = (id: string, newPriceVal?: string | number | null) => {
    const newPrice = typeof newPriceVal === 'number' ? newPriceVal : parseCurrency(newPriceVal);
    setEditedRevenue((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), unitPrice: newPrice },
    }));
  };

  const handleRevenueVatChange = (id: string, vatRate: number) => {
    setEditedRevenue((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), vatRate },
    }));
  };

  // Handlers for cost row changes
  const handleCostSupplierChange = (id: string, supplierName: string) => {
    const selectedSupplier = suppliersData?.data?.find((s) => s.name === supplierName);
    setEditedCost((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        supplierName,
        supplierId: selectedSupplier?.id,
        status: 'VALID',
      },
    }));
  };

  const handleCostPriceChange = (id: string, newPriceVal?: string | number | null) => {
    const newPrice = typeof newPriceVal === 'number' ? newPriceVal : parseCurrency(newPriceVal);
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), unitPrice: newPrice, sourceAmount: undefined },
    }));
  };

  const handleCostVatChange = (id: string, vatRate: number) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), vatRate, sourceAmount: undefined },
    }));
  };

  if (isLoadingDossier || isLoadingEstimates || isLoadingDetail) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl shadow-sm">
        <Empty description="Không tìm thấy thông tin hồ sơ tour" />
        <Button
          type="primary"
          className="mt-4 skylux-primary-button"
          onClick={() => router.push('/main/dossiers')}
        >
          Quay lại danh sách hồ sơ
        </Button>
      </div>
    );
  }

  const supplierOptions = (suppliersData?.data || []).map((s) => ({
    label: s.name,
    value: s.name,
  }));

  if (supplierOptions.length === 0) {
    supplierOptions.push(
      { label: 'Vietnam Airlines', value: 'Vietnam Airlines' },
      { label: 'Hotel Boss', value: 'Hotel Boss' },
      { label: 'Marina Bay Sands', value: 'Marina Bay Sands' },
      { label: 'TransViet', value: 'TransViet' },
      { label: 'VN Guide', value: 'VN Guide' },
    );
  }

  const renderCostRow = (row: EditableCostRow, type: 'vat' | 'novat') => {
    const rowTotal =
      row.sourceAmount !== undefined
        ? row.sourceAmount
        : row.quantity * row.multiplier * row.unitPrice * (1 + (row.vatRate || 0) / 100);
    const isWarning = row.status === 'WARNING';
    const isError = row.status === 'ERROR';

    const hoverBg = isError
      ? 'bg-red-50/50 hover:bg-red-50/80'
      : isWarning
      ? 'bg-amber-50/40 hover:bg-amber-50/70'
      : type === 'vat'
      ? 'hover:bg-sky-50/40 bg-white'
      : 'hover:bg-amber-50/40 bg-white';

    return (
      <tr
        key={row.id}
        className={`transition-colors duration-100 ${hoverBg}`}
      >
        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200">
          {row.stt}
        </td>
        <td className="py-2 px-3 font-medium text-slate-900 text-xs border-r border-slate-200">
          {row.description}
        </td>
        <td className="py-2 px-2 border-r border-slate-200">
          <Select
            size="small"
            placeholder="Chọn nhà cung cấp"
            value={row.supplierName || undefined}
            onChange={(val) => handleCostSupplierChange(row.id, val)}
            className={`w-full text-xs ${
              isError ? 'border-red-400 rounded-md ring-1 ring-red-400/30' : ''
            }`}
            options={supplierOptions}
          />
        </td>
        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-800 text-xs border-r border-slate-200">
          {row.quantity}
        </td>
        <td className="py-2 px-2 text-center font-mono text-slate-600 text-xs border-r border-slate-200">
          {row.unit}
        </td>
        <td className="py-2 px-2 text-right border-r border-slate-200">
          <InputNumber<number>
            size="small"
            value={row.unitPrice}
            onChange={(val) => handleCostPriceChange(row.id, val ?? 0)}
            formatter={(value) =>
              value !== undefined && value !== null
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                : ''
            }
            parser={(displayValue) => (displayValue ? Number(displayValue.replace(/\D/g, '')) : 0)}
            controls={false}
            className={`w-full text-right font-mono font-medium text-xs h-7 rounded-md [&_input]:text-right ${
              isError
                ? 'border-red-400 bg-white text-red-700'
                : isWarning
                ? 'border-amber-400 bg-amber-50/50 text-amber-900'
                : 'border-slate-200 text-slate-800'
            }`}
          />
        </td>
        <td className="py-2 px-2 text-center border-r border-slate-200">
          <Select
            size="small"
            value={row.vatRate}
            onChange={(val) => handleCostVatChange(row.id, val)}
            className="w-14 text-xs"
            options={[
              { label: '0', value: 0 },
              { label: '8', value: 8 },
              { label: '10', value: 10 },
            ]}
          />
        </td>
        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 text-xs border-r border-slate-200">
          {isError ? (
            <span className="inline-block border border-red-300 rounded px-2 py-0.5 text-red-600 bg-white">
              0
            </span>
          ) : (
            formatCurrency(rowTotal)
          )}
        </td>
        <td className="py-2 px-2 border-r border-slate-200">
          <span
            className={`truncate block max-w-[120px] font-medium text-xs ${
              isError
                ? 'text-red-500 font-semibold'
                : isWarning
                ? 'text-amber-600 font-semibold'
                : 'text-slate-400'
            }`}
            title={row.note}
          >
            {row.note}
          </span>
        </td>
        <td className="py-2 px-2 text-center">
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
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Lỗi
            </span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. Page Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/main/dossiers/${dossier.id}`)}
            className="rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 font-medium"
          >
            Chi tiết hồ sơ
          </Button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0">
            Chỉnh sửa dữ liệu nhập - {dossier.code}
          </h1>
        </div>
      </div>

      {/* 2. Top Warning Notification Banner */}
      <div className="rounded-xl border border-amber-200 bg-[#FFFBEB] px-4 py-2.5 flex items-center gap-2.5 text-amber-800 text-xs shadow-xs">
        <InfoCircleOutlined className="text-amber-600 text-sm shrink-0" />
        <span className="font-medium">
          Dữ liệu được tạo từ file Excel, chỉ chỉnh sửa thông tin đã import
        </span>
      </div>

      {/* 3. File & Session Summary Metadata Card */}
      <Card className="rounded-2xl border-slate-100 shadow-sm p-2 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* File icon and filename (Col 4) */}
          <div className="md:col-span-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <FileExcelFilled className="text-2xl text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">File nguồn</span>
              <span className="font-semibold text-slate-800 text-xs block truncate" title={`${dossier.code}_TourSingapore_MICE_200625.xlsx`}>
                {`${dossier.code}_TourSingapore_MICE_200625.xlsx`}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">(128 KB)</span>
            </div>
          </div>

          {/* Import time and user (Col 3) */}
          <div className="md:col-span-3 border-l-0 md:border-l border-slate-100 md:pl-4">
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Thời gian import</span>
            <div className="font-semibold text-slate-800 text-xs">
              {dossier.createdAt ? new Date(dossier.createdAt).toLocaleDateString('vi-VN') + ' 09:15' : '20/06/2025 09:15'}
            </div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
              Bởi: {dossier.salesUser?.fullName || 'Nguyễn Thu Hà'}
            </div>
          </div>

          {/* Metrics: Tổng dòng, Dòng hợp lệ, Dòng lỗi (Col 5) */}
          <div className="md:col-span-5 grid grid-cols-3 gap-2 border-l-0 md:border-l border-slate-100 md:pl-4 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Tổng dòng</span>
              <div className="text-sm font-bold text-slate-800">
                {revenueRows.length + costRows.length} dòng
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Dòng hợp lệ</span>
              <div className="text-sm font-bold text-emerald-600">
                {revenueRows.filter((r) => r.status === 'VALID').length +
                  costRows.filter((c) => c.status === 'VALID').length} dòng
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Dòng lỗi</span>
              <div className="text-sm font-bold text-red-500">
                {revenueRows.filter((r) => r.status === 'ERROR').length +
                  costRows.filter((c) => c.status === 'ERROR').length} dòng
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Main 2-Column Grid: Left (Tables) & Right (Errors & Notes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Span 8) */}
        <div className="lg:col-span-8 space-y-5">
          {/* SECTION 1: DOANH THU */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 mb-0">1. Doanh thu</h2>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-2 py-0.5 rounded-md">
                Chỉnh sửa trực tiếp trên bảng
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-medium">
                    <th className="py-2.5 px-2 text-center w-10">STT</th>
                    <th className="py-2.5 px-2 min-w-[180px]">Mô tả dịch vụ</th>
                    <th className="py-2.5 px-2 text-center w-16">Số lượng</th>
                    <th className="py-2.5 px-2 text-center w-16">Đơn vị</th>
                    <th className="py-2.5 px-2 text-right w-32">Đơn giá (VNĐ)</th>
                    <th className="py-2.5 px-2 text-center w-18">VAT (%)</th>
                    <th className="py-2.5 px-2 text-right w-32">Thành tiền (VNĐ)</th>
                    <th className="py-2.5 px-2 min-w-[120px]">Ghi chú</th>
                    <th className="py-2.5 px-2 text-center w-24">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueRows.map((row) => {
                    const rowTotal = row.quantity * row.unitPrice * (1 + row.vatRate / 100);
                    const isWarning = row.status === 'WARNING';
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isWarning ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-2.5 px-2 text-center text-slate-400 font-medium">{row.stt}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span>{row.description}</span>
                            <EditOutlined className="text-slate-300 text-[10px]" />
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-semibold text-slate-800">{row.quantity}</td>
                        <td className="py-2.5 px-2 text-center text-slate-500 font-medium">{row.unit}</td>
                        <td className="py-2.5 px-2 text-right">
                          <InputNumber<number>
                            size="small"
                            value={row.unitPrice}
                            onChange={(val) => handleRevenuePriceChange(row.id, val ?? 0)}
                            formatter={(value) => (value !== undefined && value !== null ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')}
                            parser={(displayValue) => (displayValue ? Number(displayValue.replace(/\D/g, '')) : 0)}
                            controls={false}
                            className={`w-full text-right font-mono font-medium text-xs h-7 rounded-md [&_input]:text-right ${
                              isWarning
                                ? 'border-amber-400 bg-amber-50/50 text-amber-900 focus:border-amber-500'
                                : 'border-slate-200 text-slate-800'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Select
                            size="small"
                            value={row.vatRate}
                            onChange={(val) => handleRevenueVatChange(row.id, val)}
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
                            className={`truncate block max-w-[130px] font-medium ${
                              isWarning ? 'text-amber-700 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {row.note}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Revenue Footer */}
            <div className="flex items-center justify-end gap-6 pt-3 mt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Tổng doanh thu (chưa VAT):</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                {formatCurrency(totalRevenueNoVat || 228000000)}
              </span>
            </div>
          </div>

          {/* SECTION 2: CHI PHÍ */}
          <div className="border border-slate-200/90 rounded-2xl bg-white shadow-sm overflow-hidden">
            {/* Header Bar: Title & Summary badges */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
                  <FileExcelOutlined className="text-base" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                      2. Chi phí theo hạng mục
                    </h3>
                    <Tag color="green" className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 bg-emerald-50 text-emerald-700">
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
                  Có VAT: <span className="font-mono font-bold">{formatCurrency(totalCostVat)}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100/80 text-amber-900 font-medium text-[11px]">
                  Chưa VAT: <span className="font-mono font-bold">{formatCurrency(totalCostNoVatSum)}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100/80 text-rose-900 font-bold text-[11px]">
                  Tổng chi phí: <span className="font-mono font-bold">{formatCurrency(grandTotalCost)}</span>
                </div>
              </div>
            </div>

            {/* Main Spreadsheet Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold text-[11px] uppercase tracking-wider border-b border-slate-300">
                    <th className="py-2.5 px-2 text-center w-10 border-r border-slate-300">STT</th>
                    <th className="py-2.5 px-2.5 min-w-[140px] border-r border-slate-300">Mô tả chi phí</th>
                    <th className="py-2.5 px-2.5 min-w-[150px] border-r border-slate-300">Nhà cung cấp</th>
                    <th className="py-2.5 px-1.5 text-center w-14 border-r border-slate-300">SL</th>
                    <th className="py-2.5 px-1.5 text-center w-14 border-r border-slate-300">ĐVT</th>
                    <th className="py-2.5 px-2 text-right w-28 border-r border-slate-300">Đơn giá (VNĐ)</th>
                    <th className="py-2.5 px-1.5 text-center w-16 border-r border-slate-300">VAT (%)</th>
                    <th className="py-2.5 px-2.5 text-right w-32 border-r border-slate-300">Thành tiền (VNĐ)</th>
                    <th className="py-2.5 px-2 min-w-[110px] border-r border-slate-300">Ghi chú</th>
                    <th className="py-2.5 px-2 text-center w-24">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/90 text-slate-800">
                  {/* PHẦN I: DỊCH VỤ ĐẦU VÀO CÓ VAT */}
                  <tr className="bg-[#D9EAF7] text-slate-900 font-bold border-y border-sky-300">
                    <td className="py-2 px-2 text-center font-bold border-r border-sky-200">I</td>
                    <td colSpan={9} className="py-2 px-3 tracking-wide uppercase font-bold text-xs">
                      DỊCH VỤ ĐẦU VÀO CÓ VAT
                    </td>
                  </tr>

                  {costVatSections.map((sec, secIdx) => (
                    <React.Fragment key={sec.title}>
                      <tr className="bg-[#EAF3FA] text-slate-900 font-semibold border-y border-sky-200/80">
                        <td className="py-1.5 px-2 text-center font-bold text-[11px] text-sky-900 border-r border-slate-300">
                          {sec.code}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-xs text-sky-950 uppercase border-r border-slate-300">
                          {sec.title}
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
                        <td />
                      </tr>
                      {sec.items.map((row) => renderCostRow(row, 'vat'))}
                    </React.Fragment>
                  ))}

                  {/* PHẦN II: DỊCH VỤ ĐẦU VÀO CHƯA VAT */}
                  <tr className="bg-[#FFF2CC] text-amber-950 font-bold border-y border-amber-300">
                    <td className="py-2 px-2 text-center font-bold border-r border-amber-200">II</td>
                    <td colSpan={9} className="py-2 px-3 tracking-wide uppercase font-bold text-xs">
                      DỊCH VỤ ĐẦU VÀO CHƯA VAT
                    </td>
                  </tr>
                  {costNoVatItems.map((row) => renderCostRow(row, 'novat'))}
                </tbody>

                {/* Footer Row: TỔNG CỘNG */}
                <tfoot>
                  <tr className="bg-[#FCE4D6] text-slate-900 font-bold border-t-2 border-slate-400">
                    <td
                      colSpan={7}
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
              <span className="italic">* Bảng chiết tính chi phí đầu vào theo định dạng chuẩn file mẫu 1908 DỰ TRÙ - APP.xlsx</span>
              <span className="font-medium text-slate-500">
                Tổng cộng: {costRows.length} hạng mục dịch vụ
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Lỗi cần xử lý & Ghi chú từ điều hành (Span 4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Lỗi cần xử lý (4) */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 pb-3 mb-3 border-b border-slate-100">
              Lỗi cần xử lý (4)
            </h3>

            <div className="space-y-4">
              {/* Error item 1 */}
              <div className="flex items-start gap-2.5 text-xs">
                <CloseCircleFilled className="text-red-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs mb-0.5">
                    Dòng 5 - Tiệc gala dinner
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-0">
                    Chưa chọn nhà cung cấp.
                  </p>
                </div>
              </div>

              {/* Warning item 2 */}
              <div className="flex items-start gap-2.5 text-xs">
                <WarningFilled className="text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs mb-0.5">
                    Dòng 3 - Phòng họp (1 ngày)
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-0">
                    Đơn giá có dấu hiệu cao bất thường.
                  </p>
                </div>
              </div>

              {/* Warning item 3 */}
              <div className="flex items-start gap-2.5 text-xs">
                <WarningFilled className="text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs mb-0.5">
                    Dòng 2 - Khách sạn 4 sao (3 đêm)
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-0">
                    Đơn giá chênh lệch so với dữ liệu chuẩn.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Button
                block
                className="h-9 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold hover:text-emerald-700 hover:border-emerald-700"
              >
                Xem tất cả lỗi
              </Button>
            </div>
          </div>

          {/* Card 2: Ghi chú của điều hành */}
          <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 pb-3 mb-3 border-b border-slate-100">
              Ghi chú của điều hành
            </h3>

            <div className="mb-4">
              <Input.TextArea
                rows={2}
                placeholder="Nhập ghi chú của điều hành..."
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                className="rounded-xl border-slate-200 text-xs"
              />
            </div>

            {/* Empty state illustration */}
            <div className="py-6 text-center border-t border-slate-100">
              <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-300">
                <FileTextOutlined className="text-2xl" />
              </div>
              <div className="text-xs font-bold text-slate-700 mb-1">
                Chưa có ghi chú nào
              </div>
              <div className="text-[11px] text-slate-400 leading-normal max-w-[200px] mx-auto">
                Ghi chú sẽ được hiển thị tại đây khi điều hành phản hồi.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between">
        {/* Left: Last saved status */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Đã lưu lần cuối: {lastSavedTime}</span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Tự động lưu
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <Button
            icon={<RollbackOutlined />}
            onClick={() => router.push(`/main/dossiers/${dossierId}`)}
            className="h-10 rounded-xl border-slate-200 text-slate-700 font-medium text-xs px-4"
          >
            Hủy
          </Button>

          {canOperate ? (
            <>
              <Button
                icon={<SaveOutlined />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate({ navigateBack: false })}
                className="h-10 rounded-xl border-slate-300 text-slate-700 font-semibold text-xs px-4 hover:border-emerald-700 hover:text-emerald-700"
              >
                Lưu tạm
              </Button>

              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate({ navigateBack: true })}
                className="h-10 rounded-xl bg-[#063826] hover:bg-[#084D34] text-white font-semibold text-xs px-5 border-none shadow-md"
              >
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <>
              <Button
                icon={<SaveOutlined />}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate({ navigateBack: false })}
                className="h-10 rounded-xl border-slate-300 text-slate-700 font-semibold text-xs px-4"
              >
                Lưu nháp
              </Button>

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    submitStatus: EstimateStatus.SUBMITTED,
                    navigateBack: true,
                  })
                }
                className="h-10 rounded-xl bg-[#063826] hover:bg-[#084D34] text-white font-semibold text-xs px-5 border-none shadow-md"
              >
                {dossier?.status === 'NEED_CHANGES' ? 'Gửi điều hành lại' : 'Gửi điều hành duyệt'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
