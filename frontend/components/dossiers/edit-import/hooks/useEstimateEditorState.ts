'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { estimatesService } from '@/services/estimates.service';
import { queryKeys } from '@/lib/query-keys';
import {
  EstimateStatus,
  EstimateRevenueLine,
  EstimateCostLine,
} from '@/types/estimate';
import {
  EditableRevenueRow,
  EditableCostRow,
  validateEstimateLines,
  calculateCostRowAmount,
  calculateRevenueRowAmount,
  ValidationResult,
} from '../validation/estimate-validator';
import { parseVatRate } from '@/components/dossiers/detail/utils';
import { classifyCategory } from '@/components/dossiers/detail/components/DossierCostTable';

export interface UseEstimateEditorStateProps {
  dossierId: string;
  dossier: any;
  estimate: any;
  latestEstimateItem: any;
  canOperate: boolean;
}

export function useEstimateEditorState({
  dossierId,
  dossier,
  estimate,
  latestEstimateItem,
  canOperate,
}: UseEstimateEditorStateProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nextNewRowId = useRef(0);

  // Local state for user edits and mutations
  const [editedRevenue, setEditedRevenue] = useState<
    Record<string, Partial<EditableRevenueRow>>
  >({});
  const [editedCost, setEditedCost] = useState<
    Record<string, Partial<EditableCostRow>>
  >({});
  const [addedRevenueRows, setAddedRevenueRows] = useState<
    EditableRevenueRow[]
  >([]);
  const [deletedRevenueIds, setDeletedRevenueIds] = useState<string[]>([]);
  const [addedCostRows, setAddedCostRows] = useState<EditableCostRow[]>([]);
  const [deletedCostIds, setDeletedCostIds] = useState<string[]>([]);
  const [operatorNote, setOperatorNote] = useState<string | null>(null);

  // Dynamic initialization of lastSavedTime from database timestamp (No hardcoded 2025!)
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    const rawDate = estimate?.updatedAt || dossier?.updatedAt;
    return rawDate ? dayjs(rawDate).format('DD/MM/YYYY HH:mm') : 'Chưa có bản lưu';
  });

  const effectiveOperatorNote =
    operatorNote ?? estimate?.note ?? dossier?.note ?? '';

  const rawRevenueLines = estimate?.revenueLines;
  const rawCostLines = estimate?.costLines;

  // 1. Compute base revenue rows (Zero-State Lifecycle: Empty array if no rows exist)
  const defaultRevenueRows: EditableRevenueRow[] = useMemo(() => {
    if (!rawRevenueLines || rawRevenueLines.length === 0) {
      return [];
    }
    return rawRevenueLines.map((line: EstimateRevenueLine, idx: number) => ({
      id: line.id || `rev-${idx + 1}`,
      stt: idx + 1,
      description: line.description ?? '',
      quantity: Number(line.quantity ?? 1),
      multiplier: Number(line.multiplier ?? 1),
      unit:
        typeof (line as any).unit === 'string'
          ? (line as any).unit
          : line.unit?.name || 'PAX',
      unitPrice: Number(line.unitPrice) || 0,
      vatRate: Number(line.vatRate) || 0,
      note: line.note || '-',
      status: 'VALID' as const,
    }));
  }, [rawRevenueLines]);

  // 2. Compute base cost rows (Zero-State Lifecycle: Empty array if no rows exist)
  const defaultCostRows: EditableCostRow[] = useMemo(() => {
    if (!rawCostLines || rawCostLines.length === 0) {
      return [];
    }
    return rawCostLines.map((line: EstimateCostLine, idx: number) => {
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
        description: line.description ?? '',
        serviceCategoryId: line.serviceCategoryId,
        supplierId: line.supplierId,
        supplierName: extractedSupplier,
        quantity: Number(line.quantity ?? 1),
        multiplier: Number(line.multiplier ?? 1),
        unit:
          typeof (line as any).unit === 'string'
            ? (line as any).unit
            : line.unit?.name || 'PAX',
        unitPrice: Number(line.unitPrice) || 0,
        vatRate: Number(line.vatRate) || 0,
        sourceAmount:
          line.sourceAmount !== null && line.sourceAmount !== undefined
            ? Number(line.sourceAmount)
            : null,
        note: line.note || '-',
        serviceCategory: line.serviceCategory,
        status: 'VALID' as const,
      };
    });
  }, [rawCostLines]);

  // 3. Merged Revenue and Cost Rows
  const unvalidatedRevenueRows: EditableRevenueRow[] = useMemo(() => {
    return [...defaultRevenueRows, ...addedRevenueRows]
      .filter((r) => !deletedRevenueIds.includes(r.id))
      .map((r) => ({
        ...r,
        ...(editedRevenue[r.id] || {}),
      }));
  }, [defaultRevenueRows, addedRevenueRows, deletedRevenueIds, editedRevenue]);

  const unvalidatedCostRows: EditableCostRow[] = useMemo(() => {
    const all = [...defaultCostRows, ...addedCostRows].filter(
      (c) => !deletedCostIds.includes(c.id),
    );
    return all.map((c) => ({
      ...c,
      ...(editedCost[c.id] || {}),
    }));
  }, [defaultCostRows, addedCostRows, deletedCostIds, editedCost]);

  // 4. Run Pure Validation Engine
  const validationResult: ValidationResult = useMemo(() => {
    return validateEstimateLines(unvalidatedRevenueRows, unvalidatedCostRows);
  }, [unvalidatedRevenueRows, unvalidatedCostRows]);

  const revenueRows = validationResult.validatedRevenueRows;
  const costRows = validationResult.validatedCostRows;
  const issuesList = validationResult.issues;
  const errorCount = validationResult.errorCount;
  const warningCount = validationResult.warningCount;

  // 5. Total Calculations
  const totalRevenueNoVat = useMemo(() => {
    return revenueRows.reduce(
      (acc, r) => acc + calculateRevenueRowAmount(r),
      0,
    );
  }, [revenueRows]);

  const {
    costVatSections,
    costNoVatItems,
    totalCostVat,
    totalCostNoVatSum,
    grandTotalCost,
  } = useMemo(() => {
    const vatMap = new Map<
      string,
      { code: string; title: string; order: number; items: EditableCostRow[] }
    >();
    const noVatList: EditableCostRow[] = [];

    costRows.forEach((row) => {
      const isVat = parseVatRate(row.vatRate) > 0;
      if (isVat) {
        const cat = classifyCategory(row);
        const group = vatMap.get(cat.title) || {
          code: cat.code,
          title: cat.title,
          order: cat.order,
          items: [],
        };
        group.items.push(row);
        vatMap.set(cat.title, group);
      } else {
        noVatList.push(row);
      }
    });

    const sections = Array.from(vatMap.values()).sort(
      (a, b) => a.order - b.order,
    );

    let tVat = 0;
    sections.forEach((sec) => {
      sec.items.forEach((item) => {
        tVat += calculateCostRowAmount(item);
      });
    });

    let tNoVat = 0;
    noVatList.forEach((item) => {
      tNoVat += calculateCostRowAmount(item);
    });

    return {
      costVatSections: sections,
      costNoVatItems: noVatList,
      totalCostVat: tVat,
      totalCostNoVatSum: tNoVat,
      grandTotalCost: tVat + tNoVat,
    };
  }, [costRows]);

  // 6. Action Handlers
  const handleRevenueCellChange = useCallback(
    (id: string, patch: Partial<EditableRevenueRow>) => {
      setEditedRevenue((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...patch },
      }));
    },
    [],
  );

  const handleAddRevenueRow = useCallback(() => {
    const newRow: EditableRevenueRow = {
      id: `revenue-new-${nextNewRowId.current++}`,
      stt: revenueRows.length + 1,
      description: '',
      quantity: 1,
      multiplier: 1,
      unit: 'PAX',
      unitPrice: 0,
      vatRate: 0,
      note: '-',
      status: 'VALID',
    };
    setAddedRevenueRows((prev) => [...prev, newRow]);
    message.success('Đã thêm dòng doanh thu mới');
  }, [revenueRows.length, message]);

  const handleDeleteRevenueRow = useCallback((id: string) => {
    if (id.startsWith('revenue-new-')) {
      setAddedRevenueRows((prev) => prev.filter((row) => row.id !== id));
    } else {
      setDeletedRevenueIds((prev) => [...prev, id]);
    }
    setEditedRevenue((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const handleCostCellChange = useCallback(
    (id: string, patch: Partial<EditableCostRow>) => {
      setEditedCost((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), ...patch },
      }));
    },
    [],
  );

  const handleAddCostRow = useCallback(
    (
      categoryTitle: string,
      type: 'vat' | 'novat',
      serviceCategoryId?: string,
    ) => {
      const newId = `cost-new-${nextNewRowId.current++}`;
      const newRow: EditableCostRow = {
        id: newId,
        stt: 0,
        description: '',
        serviceCategoryId,
        supplierName: undefined,
        supplierId: undefined,
        quantity: 1,
        multiplier: 1,
        unit: 'PAX',
        unitPrice: 0,
        vatRate: type === 'vat' ? 10 : 0,
        note: '-',
        categoryTitle,
        serviceCategory: { name: categoryTitle },
        status: 'VALID',
      };
      setAddedCostRows((prev) => [...prev, newRow]);
      message.success(`Đã thêm dòng mới vào mục ${categoryTitle}`);
    },
    [message],
  );

  const handleDeleteCostRow = useCallback(
    (id: string) => {
      if (id.startsWith('cost-new-')) {
        setAddedCostRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        setDeletedCostIds((prev) => [...prev, id]);
      }
      setEditedCost((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      message.info('Đã xóa dòng chi phí');
    },
    [message],
  );

  // 7. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (options?: {
      submitStatus?: EstimateStatus;
      navigateBack?: boolean;
    }) => {
      if (!latestEstimateItem?.id) {
        throw new Error('Chưa tìm thấy bản dự toán để lưu');
      }

      const submitStatus = options?.submitStatus;
      const persistedRevenueIds = new Set(
        (estimate?.revenueLines || []).map((line: any) => line.id),
      );
      const persistedCostIds = new Set(
        (estimate?.costLines || []).map((line: any) => line.id),
      );

      const payload = {
        status: submitStatus || latestEstimateItem.status,
        note: effectiveOperatorNote || undefined,
        revenueLines: revenueRows.map((r) => ({
          id: persistedRevenueIds.has(r.id) ? r.id : undefined,
          description: r.description,
          quantity: r.quantity,
          multiplier: r.multiplier,
          unitPrice: r.unitPrice,
          vatRate: r.vatRate,
          note: r.note,
        })),
        costLines: costRows.map((c) => ({
          id: persistedCostIds.has(c.id) ? c.id : undefined,
          description: c.description || 'Chi phí',
          serviceCategoryId: c.serviceCategoryId || undefined,
          supplierId: c.supplierId || undefined,
          quantity: c.quantity,
          multiplier: c.multiplier,
          unitPrice: c.unitPrice,
          vatRate: c.vatRate,
          sourceAmount: c.sourceAmount ?? null,
          note: c.note,
        })),
      };

      const res = await estimatesService.updateEstimate(
        latestEstimateItem.id,
        payload as any,
      );
      return { res, options };
    },
    onSuccess: async ({ res, options }) => {
      setLastSavedTime(dayjs().format('DD/MM/YYYY HH:mm'));

      if (res?.id) {
        queryClient.setQueryData(queryKeys.estimates.detail(res.id), res);
      }

      await Promise.all([
        queryClient.refetchQueries({
          queryKey: queryKeys.dossiers.detail(dossierId),
          type: 'all',
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.estimates.dossierList(dossierId),
          type: 'all',
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.estimates.detail(latestEstimateItem?.id),
          type: 'all',
        }),
      ]);

      if (options?.submitStatus === EstimateStatus.SUBMITTED) {
        message.success('Đã gửi điều hành xem xét thành công!');
        router.push(`/main/dossiers/${dossierId}`);
      } else if (options?.navigateBack) {
        message.success('Đã lưu thay đổi dự toán thành công!');
        router.push(`/main/dossiers/${dossierId}`);
      } else {
        message.success(
          canOperate
            ? 'Đã lưu tạm dự toán thành công'
            : 'Đã lưu nháp dữ liệu nhập thành công',
        );
      }
    },
    onError: (err: any) => {
      message.error(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu nhập');
    },
  });

  return {
    revenueRows,
    costRows,
    issuesList,
    errorCount,
    warningCount,
    totalRevenueNoVat,
    costVatSections,
    costNoVatItems,
    totalCostVat,
    totalCostNoVatSum,
    grandTotalCost,
    effectiveOperatorNote,
    setOperatorNote,
    lastSavedTime,
    handleRevenueCellChange,
    handleAddRevenueRow,
    handleDeleteRevenueRow,
    handleCostCellChange,
    handleAddCostRow,
    handleDeleteCostRow,
    saveMutation,
  };
}
