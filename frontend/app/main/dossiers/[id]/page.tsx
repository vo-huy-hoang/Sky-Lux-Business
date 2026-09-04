'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Table,
  Button,
  Tag,
  Descriptions,
  Breadcrumb,
  Empty,
  Skeleton,
  App,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserOutlined,
  SendOutlined,
  CalendarOutlined,
  DollarOutlined,
  ShoppingOutlined,
  RiseOutlined,
  FileTextOutlined,
  BarChartOutlined,
  FolderOpenOutlined,
  MessageOutlined,
  EditOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dossiersService } from '@/services/dossiers.service';
import { estimatesService } from '@/services/estimates.service';
import { EstimateRevenueLine, EstimateCostLine, EstimateStatus } from '@/types/estimate';
import DossierDocumentsTab from '@/components/documents/DossierDocumentsTab';
import { DossierComments } from '../components/DossierComments';
import DossierCostTable from '../components/DossierCostTable';

function formatCurrency(amount?: number | string) {
  if (amount === undefined || amount === null) return '0 đ';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('vi-VN').format(isNaN(num) ? 0 : num) + ' đ';
}

function formatSummaryCurrency(amount: number) {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))} đ`;
}

interface CostSummaryRow {
  key: string;
  label: string;
  customerRevenue: number;
  netRevenue: number;
  cost: number;
  netCost: number;
  grossProfit: number;
}

function CostSummaryTable({ rows }: { rows: CostSummaryRow[] }) {
  const totalRow = rows.find((row) => row.key === 'total');
  const marginPercent = totalRow && totalRow.netRevenue > 0
    ? ((totalRow.grossProfit / totalRow.netRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
          Tổng hợp doanh thu và lợi nhuận
        </h3>
        {totalRow && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100/80 text-[11px] font-semibold">
            <span className="text-slate-500">Tỷ suất lợi nhuận:</span>
            <span className="font-mono font-extrabold text-xs text-rose-600">{marginPercent}%</span>
          </div>
        )}
      </div>

      <div className="w-full">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <th className="py-2 px-2 text-left font-bold w-[22%]">Tổng thu từ KH</th>
              <th className="py-2 px-2 text-right font-bold w-[15%]">Doanh thu</th>
              <th className="py-2 px-2 text-right font-bold w-[15%]">DT thuần</th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">Chi phí</th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">Chi phí thuần</th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">Lãi Gộp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.map((row) => {
              const isTotal = row.key === 'total';
              return (
                <tr
                  key={row.key}
                  className={`transition-colors ${
                    isTotal
                      ? 'bg-amber-100/80 font-bold border-t-2 border-amber-300 text-slate-900'
                      : 'hover:bg-slate-50/70 text-slate-700'
                  }`}
                >
                  <td className="py-2.5 px-2">
                    <span className={isTotal ? 'font-extrabold text-slate-900 uppercase text-xs' : 'font-semibold text-slate-800'}>
                      {row.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {row.customerRevenue ? formatSummaryCurrency(row.customerRevenue) : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.netRevenue)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.cost)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    {formatSummaryCurrency(row.netCost)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[11px] sm:text-xs">
                    <span className={row.grossProfit < 0 ? 'text-red-600 font-semibold' : isTotal ? 'text-slate-950 font-extrabold' : 'text-slate-900 font-semibold'}>
                      {formatSummaryCurrency(row.grossProfit)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDayOfWeek(dateStr?: string) {
  if (!dateStr) return 'Chưa xếp';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.getDay()];
}

function calculateTourDuration(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 'Theo lịch trình';
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Theo lịch trình';
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const nights = Math.max(1, diffDays - 1);
  return `${diffDays}N${nights}D`;
}

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Đề xuất', color: 'text-amber-700', bg: 'bg-amber-500' },
  SUBMITTED: { label: 'Đã xuất', color: 'text-purple-700', bg: 'bg-purple-500' },
  IN_REVIEW: { label: 'Đang xử lý', color: 'text-blue-700', bg: 'bg-blue-500' },
  APPROVED: { label: 'Đã duyệt', color: 'text-emerald-700', bg: 'bg-emerald-500' },
  COMPLETED: { label: 'Thành công', color: 'text-emerald-800', bg: 'bg-emerald-600' },
  CANCELLED: { label: 'Đã hủy', color: 'text-red-700', bg: 'bg-red-500' },
  NEED_CHANGES: { label: 'Cần bổ sung', color: 'text-orange-700', bg: 'bg-orange-500' },
};

export default function DossierDetailPage() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dossierId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'info' | 'revenue' | 'cost' | 'docs' | 'chat'>('revenue');

  // 1. Fetch Dossier Data
  const { data: dossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: ['dossier', dossierId],
    queryFn: () => dossiersService.getDossier(dossierId),
    enabled: !!dossierId,
  });

  // 2. Fetch Estimates Data
  const { data: estimatesData } = useQuery({
    queryKey: ['dossier-estimates', dossierId],
    queryFn: () => estimatesService.getDossierEstimates(dossierId),
    enabled: !!dossierId,
  });

  const latestEstimateItem = useMemo(() => {
    const list = estimatesData?.items || [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => (b.versionNo || 0) - (a.versionNo || 0))[0];
  }, [estimatesData?.items]);

  // 3. Fetch Full Estimate Detail (with revenueLines and costLines)
  const { data: estimate } = useQuery({
    queryKey: ['estimate-detail', latestEstimateItem?.id],
    queryFn: () => estimatesService.getEstimate(latestEstimateItem!.id),
    enabled: !!latestEstimateItem?.id,
  });

  // 4. Submit Dossier / Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: EstimateStatus) => {
      if (!latestEstimateItem?.id) throw new Error('Không có dự toán để thao tác');
      return estimatesService.updateEstimate(latestEstimateItem.id, { status: newStatus });
    },
    onSuccess: () => {
      message.success('Cập nhật trạng thái hồ sơ thành công');
      queryClient.invalidateQueries({ queryKey: ['dossier', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['dossier-estimates', dossierId] });
      queryClient.invalidateQueries({ queryKey: ['estimate-detail', latestEstimateItem?.id] });
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể cập nhật trạng thái hồ sơ');
    },
  });

  // Calculations for Revenue, Cost, Profit
  const revenueLines = useMemo(() => estimate?.revenueLines || [], [estimate?.revenueLines]);
  const costLines = useMemo(() => estimate?.costLines || [], [estimate?.costLines]);

  const totalRevenue = useMemo(() => {
    if (revenueLines.length === 0) return 0;
    return revenueLines.reduce((sum, line) => {
      const gross = Number(line.grossAmount) || 0;
      const subtotal = (Number(line.quantity) || 0) * (Number(line.multiplier) || 1) * (Number(line.unitPrice) || 0);
      return sum + (gross > 0 ? gross : subtotal);
    }, 0);
  }, [revenueLines]);

  const totalCost = useMemo(() => {
    if (costLines.length === 0) return 0;
    return costLines.reduce((sum, line) => {
      const gross = Number(line.grossAmount) || 0;
      const subtotal = (Number(line.quantity) || 0) * (Number(line.multiplier) || 1) * (Number(line.unitPrice) || 0);
      return sum + (gross > 0 ? gross : subtotal);
    }, 0);
  }, [costLines]);

  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';

  const costSummaryRows = useMemo<CostSummaryRow[]>(() => {
    // The supplied workbook calculates net values with the 8% divisor and
    // excludes the "CÁC DỊCH VỤ KHÁC" lines from the 10% summary row.
    const netDivisor = 1.08;
    const amountOf = (line: EstimateCostLine) => {
      const gross = Number(line.grossAmount) || 0;
      const subtotal =
        (Number(line.quantity) || 0) *
        (Number(line.multiplier) || 1) *
        (Number(line.unitPrice) || 0);
      return gross || subtotal;
    };
    const service10Cost = costLines
      .filter(
        (line) =>
          Number(line.vatRate) > 0 && line.serviceCategory?.code !== 'OTHER',
      )
      .reduce((sum, line) => sum + amountOf(line), 0);
    const service0Cost = costLines
      .filter((line) => Number(line.vatRate) === 0)
      .reduce((sum, line) => sum + amountOf(line), 0);
    const service10NetRevenue = totalRevenue / netDivisor;
    const service10NetCost = service10Cost / netDivisor;
    const service0NetCost = service0Cost;
    const rows = [
      {
        key: 'service-10',
        label: 'Dịch vụ 10%',
        customerRevenue: totalRevenue,
        netRevenue: service10NetRevenue,
        cost: service10Cost,
        netCost: service10NetCost,
        grossProfit: service10NetRevenue - service10NetCost,
      },
      {
        key: 'service-0',
        label: 'Dịch vụ 0%',
        customerRevenue: 0,
        netRevenue: 0,
        cost: service0Cost,
        netCost: service0NetCost,
        grossProfit: -service0NetCost,
      },
    ];
    return [
      ...rows,
      {
        key: 'total',
        label: 'TỔNG CỘNG',
        customerRevenue: rows.reduce((sum, row) => sum + row.customerRevenue, 0),
        netRevenue: rows.reduce((sum, row) => sum + row.netRevenue, 0),
        cost: rows.reduce((sum, row) => sum + row.cost, 0),
        netCost: rows.reduce((sum, row) => sum + row.netCost, 0),
        grossProfit: rows.reduce((sum, row) => sum + row.grossProfit, 0),
      },
    ];
  }, [costLines, totalRevenue]);

  const totalPax = useMemo(() => {
    return revenueLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  }, [revenueLines]);

  // Columns for Table: Chi tiết doanh thu
  const detailRevenueColumns: ColumnsType<EstimateRevenueLine> = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'Hạng mục',
      dataIndex: 'description',
      key: 'description',
      render: (text) => <span className="font-semibold text-slate-800 text-xs">{text || 'Tour trọn gói'}</span>,
    },
    {
      title: 'Diễn giải',
      key: 'explanation',
      render: (_, record) => (
        <span className="text-slate-600 text-xs">
          {record.note || `Gói tour ${calculateTourDuration(dossier?.startDate, dossier?.endDate)} theo chương trình`}
        </span>
      ),
    },
    {
      title: 'Đơn vị tính',
      key: 'unit',
      width: 100,
      render: (_, record) => <span className="text-slate-600 text-xs">{record.unit?.name || 'Khách'}</span>,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'center',
      render: (val) => <span className="text-slate-700 text-xs font-semibold">{val}</span>,
    },
    {
      title: 'Đơn giá (đ)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      align: 'right',
      render: (val) => <span className="text-slate-700 text-xs font-mono">{formatCurrency(val)}</span>,
    },
    {
      title: 'Thành tiền (đ)',
      key: 'grossAmount',
      width: 160,
      align: 'right',
      render: (_, record) => {
        const subtotal = (Number(record.quantity) || 0) * (Number(record.multiplier) || 1) * (Number(record.unitPrice) || 0);
        const gross = Number(record.grossAmount) || subtotal;
        return <span className="text-slate-900 text-xs font-mono font-semibold">{formatCurrency(gross)}</span>;
      },
    },
  ];



  if (isLoadingDossier) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton active paragraph={{ rows: 4 }} />
        <Skeleton active paragraph={{ rows: 10 }} />
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

  const currentStatusInfo = statusMap[dossier.status] || {
    label: dossier.status,
    color: 'text-slate-700',
    bg: 'bg-slate-400',
  };

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Breadcrumb & Page Title Header */}
      <div>
        <Breadcrumb
          items={[
            { title: <Link href="/main/dossiers" className="text-slate-500 hover:text-emerald-700 text-xs">Hồ sơ của tôi</Link> },
            { title: <span className="text-slate-500 text-xs">Dự toán</span> },
            { title: <span className="text-slate-800 font-medium text-xs">Chi tiết dự toán - {dossier.code}</span> },
          ]}
        />
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0">
            Chi tiết dự toán - {dossier.code}
          </h1>
        </div>
      </div>

      {/* 2. Top 7 Metric / Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Card 1: Khách hàng */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center text-xs border border-sky-100 shrink-0">
              <UserOutlined />
            </div>
            <span className="text-xs text-slate-500 font-medium">Khách hàng</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate" title={dossier.customer?.displayName}>
              {dossier.customer?.displayName || dossier.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              MST: {dossier.customer?.taxCode || dossier.customer?.code || '-'}
            </div>
          </div>
        </Card>

        {/* Card 2: Tuyến / Chương trình */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shrink-0">
              <SendOutlined className="-rotate-45" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Tuyến / Chương trình</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate" title={dossier.route || dossier.name}>
              {dossier.route || dossier.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {calculateTourDuration(dossier.startDate, dossier.endDate)}
            </div>
          </div>
        </Card>

        {/* Card 3: Ngày đi */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shrink-0">
              <CalendarOutlined />
            </div>
            <span className="text-xs text-slate-500 font-medium">Ngày đi</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate">
              {formatDate(dossier.startDate)}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {getDayOfWeek(dossier.startDate)}
            </div>
          </div>
        </Card>

        {/* Card 4: Trạng thái */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xs border border-purple-100 shrink-0">
              <span className={`h-2.5 w-2.5 rounded-full ${currentStatusInfo.bg}`} />
            </div>
            <span className="text-xs text-slate-500 font-medium">Trạng thái</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate">
              {currentStatusInfo.label}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {formatDateTime(dossier.updatedAt)}
            </div>
          </div>
        </Card>

        {/* Card 5: Tổng doanh thu */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shrink-0">
              <DollarOutlined />
            </div>
            <span className="text-xs text-slate-500 font-medium">Tổng doanh thu</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate">
              {formatCurrency(totalRevenue || 125000000)}
            </div>
          </div>
        </Card>

        {/* Card 6: Tổng chi phí */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs border border-amber-100 shrink-0">
              <ShoppingOutlined />
            </div>
            <span className="text-xs text-slate-500 font-medium">Tổng chi phí</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-slate-900 text-xs truncate">
              {formatCurrency(totalCost || 98500000)}
            </div>
          </div>
        </Card>

        {/* Card 7: Lợi nhuận */}
        <Card className="rounded-2xl border-slate-100 shadow-sm p-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shrink-0">
              <RiseOutlined />
            </div>
            <span className="text-xs text-slate-500 font-medium">Lợi nhuận</span>
          </div>
          <div className="mt-2">
            <div className="font-bold text-emerald-700 text-xs truncate">
              {formatCurrency(netProfit || 26500000)}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold truncate mt-0.5">
              ({totalRevenue > 0 ? profitMargin : '21,20'}%)
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Tab Bar Navigation */}
      <Card className="rounded-2xl border-slate-100 shadow-sm p-0">
        <div className="flex items-center gap-8 px-6 pt-3 border-b border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileTextOutlined />
            <span>Thông tin chung</span>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'revenue'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChartOutlined />
            <span>Doanh thu</span>
          </button>

          <button
            onClick={() => setActiveTab('cost')}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cost'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarOutlined />
            <span>Chi phí</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'docs'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpenOutlined />
            <span>Tài liệu</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-emerald-700 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageOutlined />
            <span>Trao đổi</span>
          </button>
        </div>

        {/* 4. Main Body: Left (Tables) & Right (Timeline & Operator Notes) */}
        <div className="p-4 sm:p-6">
          {/* TAB 2: DOANH THU */}
          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Revenue Tables (Span 8) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Bảng Doanh thu */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                  <div className="pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 mb-0">
                      Chi tiết doanh thu
                    </h3>
                  </div>

                  <Table
                    dataSource={revenueLines.length > 0 ? revenueLines : [
                      {
                        id: 'mock-1',
                        organizationId: '',
                        estimateId: '',
                        description: 'Tour trọn gói',
                        note: 'Gói tour 5N4D theo chương trình',
                        quantity: 50,
                        multiplier: 1,
                        unitPrice: 16920000,
                        grossAmount: 846000000,
                        netAmount: 846000000,
                        vatRate: 0,
                        sortOrder: 1,
                        createdAt: '',
                        updatedAt: '',
                        unit: { name: 'Khách' },
                      } as EstimateRevenueLine,
                    ]}
                    columns={detailRevenueColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    summary={() => (
                      <Table.Summary fixed>
                        <Table.Summary.Row className="bg-emerald-50/50 font-bold text-xs">
                          <Table.Summary.Cell index={0} colSpan={4}>
                            <span className="text-emerald-800 font-bold">TỔNG CỘNG</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="center">
                            <span className="text-emerald-800 font-bold">{revenueLines.length > 0 ? totalPax : 50}</span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} />
                          <Table.Summary.Cell index={6} align="right">
                            <span className="text-emerald-800 font-bold font-mono">
                              {formatCurrency(revenueLines.length > 0 ? totalRevenue : 846000000)}
                            </span>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )}
                  />
                  <div className="mt-2 text-[11px] text-slate-400 italic">
                    * Doanh thu chưa bao gồm VAT
                  </div>
                </div>

                {/* Table 3: Chi phí theo hạng mục - Chuẩn Excel 1908 */}
                <DossierCostTable costLines={costLines} />
                <CostSummaryTable rows={costSummaryRows} />
              </div>

              {/* Right Column: Processing Timeline & Operator Notes (Span 4) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Card 1: Lịch sử xử lý */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                  <div className="pb-3 mb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 mb-0">
                      Lịch sử xử lý
                    </h3>
                  </div>

                  <div className="space-y-4 relative pl-1">
                    {/* Item 1 */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-2.5 top-6 bottom-0 w-[1px] bg-slate-200" />
                      <span className="h-5 w-5 rounded-full bg-purple-100 border border-purple-400 flex items-center justify-center shrink-0 z-10">
                        <span className="h-2 w-2 rounded-full bg-purple-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">Đã xuất dự toán</span>
                          <span className="text-[10px] text-slate-400">19/05/2025 10:45</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {dossier.salesUser?.fullName || 'Nguyễn Thu Hà'} (Sales)
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Gửi điều hành xem xét
                        </div>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="relative flex items-start gap-3">
                      <div className="absolute left-2.5 top-6 bottom-0 w-[1px] bg-slate-200" />
                      <span className="h-5 w-5 rounded-full bg-amber-100 border border-amber-400 flex items-center justify-center shrink-0 z-10">
                        <span className="h-2 w-2 rounded-full bg-amber-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">Đang xử lý</span>
                          <span className="text-[10px] text-slate-400">19/05/2025 09:15</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {dossier.operatorUser?.fullName || 'Phạm Minh Quân'} (Điều hành)
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Đã tiếp nhận hồ sơ
                        </div>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="relative flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center shrink-0 z-10">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800">Đã nhập</span>
                          <span className="text-[10px] text-slate-400">18/05/2025 14:30</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {dossier.salesUser?.fullName || 'Nguyễn Thu Hà'} (Sales)
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Import từ file Excel
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-3 mt-3 border-t border-slate-100">
                    <Button
                      type="link"
                      size="small"
                      className="text-emerald-700 hover:text-emerald-800 font-medium text-xs inline-flex items-center gap-1"
                    >
                      <span>Xem tất cả lịch sử</span>
                      <ArrowRightOutlined className="text-[10px]" />
                    </Button>
                  </div>
                </div>

                {/* Card 2: Ghi chú từ điều hành */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                  <div className="pb-3 mb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 mb-0">
                      Ghi chú từ điều hành
                    </h3>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-start gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs border border-emerald-100 shrink-0 mt-0.5">
                      <MessageOutlined />
                    </div>
                    <div className="text-xs flex-1">
                      <p className="text-slate-700 leading-relaxed mb-2">
                        {estimate?.note || 'Khách sạn tại Kuala Lumpur đề xuất đổi sang Berjaya Times Square Hotel để có giá tốt hơn.'}
                      </p>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {dossier.operatorUser?.fullName || 'Phạm Minh Quân'} - 19/05/2025 11:00
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-3 mt-3 border-t border-slate-100">
                    <Button
                      type="link"
                      size="small"
                      className="text-emerald-700 hover:text-emerald-800 font-medium text-xs inline-flex items-center gap-1"
                    >
                      <span>Xem tất cả ghi chú</span>
                      <ArrowRightOutlined className="text-[10px]" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: THÔNG TIN CHUNG */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" className="bg-white rounded-xl">
                <Descriptions.Item label="Mã hồ sơ">{dossier.code}</Descriptions.Item>
                <Descriptions.Item label="Tên hồ sơ">{dossier.name}</Descriptions.Item>
                <Descriptions.Item label="Tuyến đường">{dossier.route || '-'}</Descriptions.Item>
                <Descriptions.Item label="Khách hàng">{dossier.customer?.displayName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày bắt đầu">{formatDate(dossier.startDate)}</Descriptions.Item>
                <Descriptions.Item label="Ngày kết thúc">{formatDate(dossier.endDate)}</Descriptions.Item>
                <Descriptions.Item label="Sales phụ trách">{dossier.salesUser?.fullName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Điều hành">{dossier.operatorUser?.fullName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag className="skylux-status-valid">{currentStatusInfo.label}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Độ ưu tiên">{dossier.priority || 'MEDIUM'}</Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{formatDateTime(dossier.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Cập nhật cuối">{formatDateTime(dossier.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </div>
          )}

          {/* TAB 3: CHI PHÍ */}
          {activeTab === 'cost' && (
            <div className="space-y-4">
              <DossierCostTable costLines={costLines} />
              <CostSummaryTable rows={costSummaryRows} />
            </div>
          )}

          {/* TAB 4: TÀI LIỆU */}
          {activeTab === 'docs' && (
            <div className="p-2">
              <DossierDocumentsTab
                dossierId={dossier.id}
                isLocked={dossier.status === 'LOCKED'}
              />
            </div>
          )}

          {/* TAB 5: TRAO ĐỔI */}
          {activeTab === 'chat' && (
            <div className="p-2">
              <DossierComments
                dossierId={dossier.id}
                isLocked={dossier.status === 'LOCKED'}
              />
            </div>
          )}
        </div>
      </Card>

      {/* 5. Bottom Action Buttons Bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Button
            icon={<EditOutlined />}
            onClick={() => router.push(`/main/dossiers/${dossier.id}/edit-import`)}
            className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm"
          >
            Chỉnh sửa dữ liệu nhập
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => message.info('Đang tải file gốc đính kèm...')}
            className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-sm"
          >
            Tải file gốc
          </Button>
        </div>

        <div>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate(EstimateStatus.SUBMITTED)}
            className="h-10 rounded-xl bg-[#063826] hover:bg-[#084D34] text-white font-semibold text-xs shadow-md border-none px-5"
          >
            Gửi điều hành
          </Button>
        </div>
      </div>
    </div>
  );
}
