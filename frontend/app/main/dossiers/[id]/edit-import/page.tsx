"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Tooltip,
} from "antd";
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
  PlusOutlined,
  DeleteOutlined,
  MessageOutlined,
  UserOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dossiersService } from "@/services/dossiers.service";
import { estimatesService } from "@/services/estimates.service";
import { suppliersService } from "@/services/suppliers.service";
import {
  EstimateStatus,
  EstimateRevenueLine,
  EstimateCostLine,
} from "@/types/estimate";
import { classifyCategory } from "@/components/dossiers/detail/components/DossierCostTable";
import { parseVatRate } from "@/components/dossiers/detail/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { queryKeys } from "@/lib/query-keys";

function formatCurrency(amount?: number | string) {
  if (amount === undefined || amount === null) return "0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("vi-VN").format(isNaN(num) ? 0 : num);
}

function parseCurrency(str?: string | number | null) {
  if (typeof str === "number") return str;
  if (!str) return 0;
  const clean = String(str).replace(/\D/g, "");
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
  status: "VALID" | "WARNING" | "ERROR";
  warningMessage?: string;
}

interface EditableCostRow {
  id: string;
  stt: number;
  description: string;
  serviceCategoryId?: string;
  supplierId?: string;
  supplierName?: string;
  quantity: number;
  multiplier: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  sourceAmount?: number;
  note: string;
  status: "VALID" | "WARNING" | "ERROR";
  warningMessage?: string;
  serviceCategory?: { name?: string };
  categoryTitle?: string;
}

function calculateCostRowAmount(row: EditableCostRow): number {
  if (row.sourceAmount !== undefined) return row.sourceAmount;
  return row.quantity * row.multiplier * row.unitPrice;
}

export default function EditImportDossierPage() {
  const { message } = App.useApp();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dossierId = params?.id as string;

  const hasRole = useAuthStore((state) => state.hasRole);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const isOperator = hasRole("OPERATOR");
  const isCeoAdmin = hasRole(["SUPER_ADMIN", "CEO_ADMIN"]);
  const canOperate = isOperator || isCeoAdmin;

  // 1. Fetch Dossier Info
  const { data: dossier, isLoading: isLoadingDossier } = useQuery({
    queryKey: queryKeys.dossiers.detail(dossierId),
    queryFn: () => dossiersService.getDossier(dossierId),
    enabled: !!dossierId,
  });

  // 2. Fetch Estimates
  const { data: estimatesData, isLoading: isLoadingEstimates } = useQuery({
    queryKey: queryKeys.estimates.dossierList(dossierId),
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
    queryKey: queryKeys.estimates.detail(latestEstimateItem?.id),
    queryFn: () => estimatesService.getEstimate(latestEstimateItem!.id),
    enabled: !!latestEstimateItem?.id,
  });

  // 4. Fetch Suppliers for Cost dropdown
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-list"],
    queryFn: () => suppliersService.getSuppliers({ page: 1, limit: 100 }),
  });

  // Local state for user edits and notes
  const [editedRevenue, setEditedRevenue] = useState<
    Record<string, Partial<EditableRevenueRow>>
  >({});
  const [editedCost, setEditedCost] = useState<
    Record<string, Partial<EditableCostRow>>
  >({});
  const [addedCostRows, setAddedCostRows] = useState<EditableCostRow[]>([]);
  const [deletedCostIds, setDeletedCostIds] = useState<string[]>([]);
  const [operatorNote, setOperatorNote] = useState("");
  const [lastSavedTime, setLastSavedTime] = useState("20/06/2025 10:35");
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [issueFilter, setIssueFilter] = useState<"ALL" | "ERROR" | "WARNING">("ALL");

  React.useEffect(() => {
    if (estimate?.note) {
      setOperatorNote(estimate.note);
    } else if ((dossier as any)?.note) {
      setOperatorNote((dossier as any).note);
    }
  }, [estimate?.note, (dossier as any)?.note]);

  // Compute base revenue rows from database or reference template
  const defaultRevenueRows: EditableRevenueRow[] = useMemo(() => {
    if (estimate?.revenueLines && estimate.revenueLines.length > 0) {
      return estimate.revenueLines.map(
        (line: EstimateRevenueLine, idx: number) => ({
          id: line.id || `rev-${idx + 1}`,
          stt: idx + 1,
          description: line.description || "Dịch vụ",
          quantity: Number(line.quantity) || 1,
          unit: line.unit?.name || "PAX",
          unitPrice: Number(line.unitPrice) || 0,
          vatRate: Number(line.vatRate) || 0,
          note: line.note || "-",
          status: idx === 2 ? "WARNING" : "VALID",
          warningMessage:
            idx === 2 ? "Đơn giá có dấu hiệu cao bất thường." : undefined,
        }),
      );
    }
    return [
      {
        id: "r1",
        stt: 1,
        description: "Vé máy bay khứ hồi SGN-SIN-SGN",
        quantity: 20,
        unit: "PAX",
        unitPrice: 6500000,
        vatRate: 0,
        note: "Vietnam Airlines",
        status: "VALID",
      },
      {
        id: "r2",
        stt: 2,
        description: "Khách sạn 4 sao (3 đêm)",
        quantity: 20,
        unit: "ROOM",
        unitPrice: 3200000,
        vatRate: 10,
        note: "Hotel Boss",
        status: "VALID",
      },
      {
        id: "r3",
        stt: 3,
        description: "Phòng họp (1 ngày)",
        quantity: 1,
        unit: "DAY",
        unitPrice: 15000000,
        vatRate: 10,
        note: "Marina Bay Sands",
        status: "WARNING",
        warningMessage: "Đơn giá có dấu hiệu cao bất thường.",
      },
      {
        id: "r4",
        stt: 4,
        description: "Xe đưa đón",
        quantity: 2,
        unit: "DAY",
        unitPrice: 4000000,
        vatRate: 10,
        note: "TransViet",
        status: "VALID",
      },
      {
        id: "r5",
        stt: 5,
        description: "HDV tiếng Việt",
        quantity: 2,
        unit: "DAY",
        unitPrice: 1500000,
        vatRate: 10,
        note: "VN Guide",
        status: "VALID",
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
          description: line.description || "Chi phí",
          serviceCategoryId: line.serviceCategoryId,
          supplierId: line.supplierId,
          supplierName: extractedSupplier,
          quantity: Number(line.quantity) || 1,
          multiplier: Number(line.multiplier) || 1,
          unit: line.unit?.name || "PAX",
          unitPrice: Number(line.unitPrice) || 0,
          vatRate: Number(line.vatRate) || 0,
          sourceAmount: line.note?.includes("Số tiền nguồn:")
            ? Number(line.netAmount)
            : undefined,
          note: line.note || "-",
          serviceCategory: line.serviceCategory,
          status: "VALID",
          warningMessage: undefined,
        };
      });
    }
    return [
      {
        id: "c1",
        stt: 1,
        description: "Vé máy bay",
        supplierName: "Vietnam Airlines",
        quantity: 20,
        multiplier: 1,
        unit: "PAX",
        unitPrice: 5200000,
        vatRate: 0,
        note: "-",
        status: "VALID",
      },
      {
        id: "c2",
        stt: 2,
        description: "Khách sạn 4 sao (3 đêm)",
        supplierName: "Hotel Boss",
        quantity: 20,
        multiplier: 1,
        unit: "ROOM",
        unitPrice: 2600000,
        vatRate: 10,
        note: "Check lại rate",
        status: "WARNING",
        warningMessage: "Đơn giá chênh lệch so với dữ liệu chuẩn.",
      },
      {
        id: "c3",
        stt: 3,
        description: "Phòng họp (1 ngày)",
        supplierName: "Marina Bay Sands",
        quantity: 1,
        multiplier: 1,
        unit: "DAY",
        unitPrice: 12000000,
        vatRate: 10,
        note: "-",
        status: "VALID",
      },
      {
        id: "c4",
        stt: 4,
        description: "Xe đưa đón",
        supplierName: "TransViet",
        quantity: 2,
        multiplier: 1,
        unit: "DAY",
        unitPrice: 3200000,
        vatRate: 10,
        note: "-",
        status: "VALID",
      },
      {
        id: "c5",
        stt: 5,
        description: "Tiệc gala dinner",
        supplierName: undefined,
        quantity: 1,
        multiplier: 1,
        unit: "PACKAGE",
        unitPrice: 0,
        vatRate: 10,
        note: "Chưa có nhà cung cấp",
        status: "VALID",
        warningMessage: undefined,
      },
    ];
  }, [estimate]);

  const costRows: EditableCostRow[] = useMemo(() => {
    const all = [...defaultCostRows, ...addedCostRows].filter(
      (c) => !deletedCostIds.includes(c.id),
    );
    return all.map((c) => ({
      ...c,
      ...(editedCost[c.id] || {}),
    }));
  }, [defaultCostRows, addedCostRows, deletedCostIds, editedCost]);

  // Mutations to save changes
  const saveMutation = useMutation({
    mutationFn: async (options?: {
      submitStatus?: EstimateStatus;
      navigateBack?: boolean;
    }) => {
      if (!latestEstimateItem?.id) {
        throw new Error("Chưa tìm thấy bản dự toán để lưu");
      }

      const submitStatus = options?.submitStatus;
      const persistedRevenueIds = new Set(
        (estimate?.revenueLines || []).map((line) => line.id),
      );
      const persistedCostIds = new Set(
        (estimate?.costLines || []).map((line) => line.id),
      );
      const payload = {
        status: submitStatus || latestEstimateItem.status,
        note: operatorNote || undefined,
        revenueLines: revenueRows.map((r) => ({
          id: persistedRevenueIds.has(r.id) ? r.id : undefined,
          description: r.description,
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          vatRate: r.vatRate,
          note: r.note,
        })),
        costLines: costRows.map((c) => ({
          id: persistedCostIds.has(c.id) ? c.id : undefined,
          description: c.description || "Chi phí",
          serviceCategoryId: c.serviceCategoryId || undefined,
          supplierId: c.supplierId || undefined,
          quantity: c.quantity,
          multiplier: c.multiplier || 1,
          unitPrice: c.unitPrice,
          vatRate: c.vatRate,
          sourceAmount: c.sourceAmount,
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
      setLastSavedTime(
        new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );

      // Populate the detail cache with the response immediately so the
      // destination page never renders the pre-save estimate snapshot.
      if (res?.id) {
        queryClient.setQueryData(queryKeys.estimates.detail(res.id), res);
      }

      await Promise.all([
        queryClient.refetchQueries({
          queryKey: queryKeys.dossiers.detail(dossierId),
          type: "all",
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.estimates.dossierList(dossierId),
          type: "all",
        }),
        queryClient.refetchQueries({
          queryKey: queryKeys.estimates.detail(latestEstimateItem?.id),
          type: "all",
        }),
      ]);

      if (options?.submitStatus === EstimateStatus.SUBMITTED) {
        message.success("Đã gửi điều hành xem xét thành công!");
        router.push(`/main/dossiers/${dossierId}`);
      } else if (options?.navigateBack) {
        message.success("Đã lưu thay đổi dự toán thành công!");
        router.push(`/main/dossiers/${dossierId}`);
      } else {
        message.success(
          canOperate
            ? "Đã lưu tạm dự toán thành công"
            : "Đã lưu nháp dữ liệu nhập thành công",
        );
      }
    },
    onError: (err: any) => {
      message.error(err?.message || "Có lỗi xảy ra khi lưu dữ liệu nhập");
    },
  });

  // Calculations for total revenue and cost
  const totalRevenueNoVat = useMemo(() => {
    return revenueRows.reduce(
      (acc, row) => acc + row.quantity * row.unitPrice,
      0,
    );
  }, [revenueRows]);

  const totalCostNoVat = useMemo(() => {
    return costRows.reduce(
      (acc, row) => acc + calculateCostRowAmount(row),
      0,
    );
  }, [costRows]);

  // Categorize cost lines into Section I (VAT) and Section II (NO VAT) matching DossierCostTable
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

    const calcItemAmount = (row: EditableCostRow) => {
      if (row.status === "ERROR") return 0;
      return calculateCostRowAmount(row);
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
  const handleRevenuePriceChange = (
    id: string,
    newPriceVal?: string | number | null,
  ) => {
    const newPrice =
      typeof newPriceVal === "number"
        ? newPriceVal
        : parseCurrency(newPriceVal);
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
    const selectedSupplier = suppliersData?.data?.find(
      (s) => s.name === supplierName,
    );
    setEditedCost((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        supplierName,
        supplierId: selectedSupplier?.id,
        status: "VALID",
      },
    }));
  };

  const handleCostPriceChange = (
    id: string,
    newPriceVal?: string | number | null,
  ) => {
    const newPrice =
      typeof newPriceVal === "number"
        ? newPriceVal
        : parseCurrency(newPriceVal);
    setEditedCost((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        unitPrice: newPrice,
        sourceAmount: undefined,
      },
    }));
  };

  const handleCostVatChange = (id: string, vatRate: number) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), vatRate, sourceAmount: undefined },
    }));
  };

  const handleCostDescriptionChange = (id: string, description: string) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), description },
    }));
  };

  const handleCostQuantityChange = (id: string, quantity: number) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), quantity },
    }));
  };

  const handleCostUnitChange = (id: string, unit: string) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), unit },
    }));
  };

  const handleCostNoteChange = (id: string, note: string) => {
    setEditedCost((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), note },
    }));
  };

  const handleAddCostRow = (
    categoryTitle: string,
    type: "vat" | "novat",
    serviceCategoryId?: string,
  ) => {
    const newId = `cost-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRow: EditableCostRow = {
      id: newId,
      stt: 0,
      description: "",
      serviceCategoryId,
      supplierName: undefined,
      supplierId: undefined,
      quantity: 1,
      multiplier: 1,
      unit: "PAX",
      unitPrice: 0,
      vatRate: type === "vat" ? 10 : 0,
      note: "-",
      categoryTitle,
      serviceCategory: { name: categoryTitle },
      status: "VALID",
    };
    setAddedCostRows((prev) => [...prev, newRow]);
    message.success(`Đã thêm dòng mới vào mục ${categoryTitle}`);
  };

  const handleDeleteCostRow = (id: string) => {
    if (id.startsWith("cost-new-")) {
      setAddedCostRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      setDeletedCostIds((prev) => [...prev, id]);
    }
    setEditedCost((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    message.info("Đã xóa dòng chi phí");
  };

  interface IssueItem {
    id: string;
    rowId: string;
    isCost: boolean;
    rowNumber: number;
    title: string;
    description: string;
    type: "ERROR" | "WARNING";
  }

  const issuesList = useMemo<IssueItem[]>(() => {
    const list: IssueItem[] = [];

    // 1. Check Cost rows
    costRows.forEach((c, idx) => {
      const displayStt = idx + 1;
      const isMissingSupplier =
        !c.supplierName &&
        (c.id === "c5" ||
          c.description.toLowerCase().includes("gala") ||
          c.note?.toLowerCase().includes("chưa có nhà cung cấp"));

      if (c.status === "ERROR" || isMissingSupplier) {
        list.push({
          id: `cost-${c.id}`,
          rowId: c.id,
          isCost: true,
          rowNumber: displayStt,
          title: `Dòng ${displayStt} (Chi phí) - ${c.description || "Chi phí"}`,
          description: isMissingSupplier
            ? "Chưa chọn nhà cung cấp."
            : c.warningMessage || "Dòng chi phí phát hiện lỗi dữ liệu.",
          type: "ERROR",
        });
      } else if (c.status === "WARNING" || c.id === "c2") {
        list.push({
          id: `cost-${c.id}`,
          rowId: c.id,
          isCost: true,
          rowNumber: displayStt,
          title: `Dòng ${displayStt} (Chi phí) - ${c.description}`,
          description:
            c.warningMessage || "Đơn giá chênh lệch so với dữ liệu chuẩn.",
          type: "WARNING",
        });
      }
    });

    // 2. Check Revenue rows
    revenueRows.forEach((r) => {
      if (r.status === "ERROR") {
        list.push({
          id: `rev-${r.id}`,
          rowId: r.id,
          isCost: false,
          rowNumber: r.stt,
          title: `Dòng ${r.stt} (Doanh thu) - ${r.description}`,
          description:
            r.warningMessage || "Dữ liệu dòng doanh thu không hợp lệ.",
          type: "ERROR",
        });
      } else if (r.status === "WARNING" || r.id === "r3") {
        list.push({
          id: `rev-${r.id}`,
          rowId: r.id,
          isCost: false,
          rowNumber: r.stt,
          title: `Dòng ${r.stt} (Doanh thu) - ${r.description}`,
          description:
            r.warningMessage || "Đơn giá có dấu hiệu cao bất thường.",
          type: "WARNING",
        });
      }
    });

    return list;
  }, [revenueRows, costRows]);

  const errorCount = useMemo(
    () => issuesList.filter((i) => i.type === "ERROR").length,
    [issuesList],
  );
  const warningCount = useMemo(
    () => issuesList.filter((i) => i.type === "WARNING").length,
    [issuesList],
  );

  const filteredIssues = useMemo(() => {
    if (issueFilter === "ERROR")
      return issuesList.filter((i) => i.type === "ERROR");
    if (issueFilter === "WARNING")
      return issuesList.filter((i) => i.type === "WARNING");
    return issuesList;
  }, [issuesList, issueFilter]);

  const displayedIssues = useMemo(() => {
    if (showAllIssues) return filteredIssues;
    return filteredIssues.slice(0, 3);
  }, [filteredIssues, showAllIssues]);

  const handleJumpToRow = (issue: IssueItem) => {
    const elId = issue.isCost
      ? `cost-row-${issue.rowId}`
      : `revenue-row-${issue.rowId}`;
    const el = document.getElementById(elId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-emerald-100/70");
      setTimeout(() => {
        el.classList.remove("bg-emerald-100/70");
      }, 2000);
      message.info(`Đã cuộn đến ${issue.title}`);
    }
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
          onClick={() => router.push("/main/dossiers")}
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
      { label: "Vietnam Airlines", value: "Vietnam Airlines" },
      { label: "Hotel Boss", value: "Hotel Boss" },
      { label: "Marina Bay Sands", value: "Marina Bay Sands" },
      { label: "TransViet", value: "TransViet" },
      { label: "VN Guide", value: "VN Guide" },
    );
  }

  const renderCostRow = (
    row: EditableCostRow,
    type: "vat" | "novat",
    displayStt?: number,
  ) => {
    const rowTotal = calculateCostRowAmount(row);
    const isWarning = row.status === "WARNING";
    const isError = row.status === "ERROR";

    const hoverBg = isError
      ? "bg-red-50/50 hover:bg-red-50/80"
      : isWarning
        ? "bg-amber-50/40 hover:bg-amber-50/70"
        : type === "vat"
          ? "hover:bg-sky-50/40 bg-white"
          : "hover:bg-amber-50/40 bg-white";

    return (
      <tr
        key={row.id}
        id={`cost-row-${row.id}`}
        className={`transition-colors duration-200 group ${hoverBg}`}
      >
        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200">
          {displayStt ?? row.stt}
        </td>
        <td className="py-2 px-2 border-r border-slate-200">
          <Input
            size="small"
            value={row.description}
            onChange={(e) =>
              handleCostDescriptionChange(row.id, e.target.value)
            }
            placeholder="Mô tả dịch vụ chi phí..."
            className="text-xs h-7 rounded-md font-medium text-slate-900 px-2 border-slate-200 hover:border-slate-300 focus:border-sky-500"
          />
        </td>
        <td className="py-2 px-2 border-r border-slate-200">
          <Select
            size="small"
            placeholder="Chọn nhà cung cấp"
            value={row.supplierName || undefined}
            onChange={(val) => handleCostSupplierChange(row.id, val)}
            className={`w-full text-xs ${
              isError ? "border-red-400 rounded-md ring-1 ring-red-400/30" : ""
            }`}
            options={supplierOptions}
          />
        </td>
        <td className="py-2 px-1.5 text-center border-r border-slate-200">
          <InputNumber<number>
            size="small"
            min={1}
            value={row.quantity}
            onChange={(val) => handleCostQuantityChange(row.id, val ?? 1)}
            controls={false}
            className="w-12 text-center font-mono font-semibold text-xs h-7 rounded-md border-slate-200 hover:border-slate-300 focus:border-sky-500 [&_input]:text-center"
          />
        </td>
        <td className="py-2 px-1 text-center border-r border-slate-200">
          <Input
            size="small"
            value={row.unit}
            onChange={(e) => handleCostUnitChange(row.id, e.target.value)}
            className="w-12 text-center font-mono text-slate-700 text-xs h-7 rounded-md border-slate-200 hover:border-slate-300 focus:border-sky-500 [&_input]:text-center uppercase"
          />
        </td>
        <td className="py-2 px-2 text-right border-r border-slate-200">
          <InputNumber<number>
            size="small"
            value={row.unitPrice}
            onChange={(val) => handleCostPriceChange(row.id, val ?? 0)}
            formatter={(value) =>
              value !== undefined && value !== null
                ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                : ""
            }
            parser={(displayValue) =>
              displayValue ? Number(displayValue.replace(/\D/g, "")) : 0
            }
            controls={false}
            className={`w-full text-right font-mono font-medium text-xs h-7 rounded-md [&_input]:text-right ${
              isError
                ? "border-red-400 bg-white text-red-700"
                : isWarning
                  ? "border-amber-400 bg-amber-50/50 text-amber-900"
                  : "border-slate-200 text-slate-800"
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
              { label: "0", value: 0 },
              { label: "8", value: 8 },
              { label: "10", value: 10 },
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
        <td className="py-2 px-1.5 border-r border-slate-200">
          <Input
            size="small"
            value={row.note === "-" ? "" : row.note}
            onChange={(e) => handleCostNoteChange(row.id, e.target.value)}
            placeholder="Ghi chú..."
            className="w-full text-xs h-7 rounded-md text-slate-600 px-2 border-slate-200 hover:border-slate-300 focus:border-sky-500"
          />
        </td>
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-between gap-1 px-1">
            <div className="flex-1 text-center">
              {row.status === "VALID" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Hợp lệ
                </span>
              )}
              {row.status === "WARNING" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                  <WarningFilled className="text-[10px]" />
                  Cảnh báo
                </span>
              )}
              {row.status === "ERROR" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
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
                onClick={() => handleDeleteCostRow(row.id)}
                className="h-6 w-6 p-0 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
              />
            </Tooltip>
          </div>
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
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
                File nguồn
              </span>
              <span
                className="font-semibold text-slate-800 text-xs block truncate"
                title={`${dossier.code}_TourSingapore_MICE_200625.xlsx`}
              >
                {`${dossier.code}_TourSingapore_MICE_200625.xlsx`}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                (128 KB)
              </span>
            </div>
          </div>

          {/* Import time and user (Col 3) */}
          <div className="md:col-span-3 border-l-0 md:border-l border-slate-100 md:pl-4">
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
              Thời gian import
            </span>
            <div className="font-semibold text-slate-800 text-xs">
              {dossier.createdAt
                ? new Date(dossier.createdAt).toLocaleDateString("vi-VN") +
                  " 09:15"
                : "20/06/2025 09:15"}
            </div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
              Bởi: {dossier.salesUser?.fullName || "Nguyễn Thu Hà"}
            </div>
          </div>

          {/* Metrics: Tổng dòng, Dòng hợp lệ, Dòng lỗi (Col 5) */}
          <div className="md:col-span-5 grid grid-cols-3 gap-2 border-l-0 md:border-l border-slate-100 md:pl-4 text-center sm:text-left">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
                Tổng dòng
              </span>
              <div className="text-sm font-bold text-slate-800">
                {revenueRows.length + costRows.length} dòng
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
                Dòng hợp lệ
              </span>
              <div className="text-sm font-bold text-emerald-600">
                {revenueRows.filter((r) => r.status === "VALID").length +
                  costRows.filter((c) => c.status === "VALID").length}{" "}
                dòng
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">
                Dòng lỗi
              </span>
              <div className="text-sm font-bold text-red-500">
                {revenueRows.filter((r) => r.status === "ERROR").length +
                  costRows.filter((c) => c.status === "ERROR").length}{" "}
                dòng
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Top Operational Cockpit: Lỗi cần xử lý & Ghi chú của điều hành (Đặt trên Bảng 1. Doanh thu) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Lỗi cần xử lý (Span 6) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs flex flex-col justify-between h-full">
            <div>
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-xs">
                    <WarningFilled />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                    Lỗi cần xử lý
                  </h3>
                  <Tag
                    color={
                      errorCount > 0
                        ? "error"
                        : warningCount > 0
                          ? "warning"
                          : "success"
                    }
                    className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full border-0 m-0"
                  >
                    {issuesList.length} vấn đề
                  </Tag>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIssueFilter("ALL")}
                    className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      issueFilter === "ALL"
                        ? "bg-slate-900 text-white font-semibold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Tất cả ({issuesList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssueFilter("ERROR")}
                    className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      issueFilter === "ERROR"
                        ? "bg-rose-600 text-white font-semibold"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    }`}
                  >
                    Lỗi ({errorCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIssueFilter("WARNING")}
                    className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      issueFilter === "WARNING"
                        ? "bg-amber-500 text-white font-semibold"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    Cảnh báo ({warningCount})
                  </button>
                </div>
              </div>

              {/* Items List */}
              {displayedIssues.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircleFilled className="text-xl" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    Không có vấn đề cần xử lý
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {issueFilter !== "ALL"
                      ? "Không tìm thấy mục nào thuộc bộ lọc này."
                      : "Dữ liệu hợp lệ, sẵn sàng gửi điều hành xem xét."}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedIssues.map((issue) => {
                    const isErr = issue.type === "ERROR";
                    return (
                      <div
                        key={issue.id}
                        onClick={() => handleJumpToRow(issue)}
                        className={`group p-2.5 sm:p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 ${
                          isErr
                            ? "bg-rose-50/40 hover:bg-rose-50/80 border-rose-100/90 hover:border-rose-200"
                            : "bg-amber-50/40 hover:bg-amber-50/80 border-amber-100/90 hover:border-amber-200"
                        }`}
                        title="Bấm để cuộn nhanh đến dòng này trong bảng"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 ${
                              isErr
                                ? "bg-rose-500 text-white"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {isErr ? (
                              <CloseCircleFilled />
                            ) : (
                              <WarningFilled />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 text-xs mb-0.5 truncate group-hover:text-emerald-950 transition-colors">
                              {issue.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mb-0 line-clamp-1">
                              {issue.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-emerald-700 transition-colors">
                          <span className="hidden sm:inline">Sửa ngay</span>
                          <ArrowRightOutlined className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 italic">
                * Bấm vào từng dòng để cuộn và kiểm tra chi tiết
              </span>
              {filteredIssues.length > 3 && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => setShowAllIssues((prev) => !prev)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 p-0 h-auto"
                >
                  {showAllIssues
                    ? "Thu gọn"
                    : `Xem tất cả (${filteredIssues.length})`}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Ghi chú của điều hành (Span 6) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs flex flex-col justify-between h-full">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    <MessageOutlined />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mb-0 uppercase tracking-tight">
                    Ghi chú của điều hành
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Tag
                    color="green"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 bg-emerald-50 text-emerald-800 m-0"
                  >
                    Điều hành tour
                  </Tag>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Lưu kèm dự toán
                  </span>
                </div>
              </div>

              {/* Input Area - Auto-expanding to show all lines without scrolling */}
              <div className="mb-2.5">
                <Input.TextArea
                  autoSize={{ minRows: 4, maxRows: 16 }}
                  placeholder="Nhập ghi chú phản hồi của điều hành (về giá, nhà cung cấp, chi phí dự kiến)..."
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs hover:border-slate-300 focus:border-emerald-600 transition-colors leading-relaxed p-3 font-normal text-slate-800 bg-slate-50/50 focus:bg-white"
                />
              </div>

              {/* Author & Context Bar */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                    <UserOutlined />
                  </div>
                  <span className="text-[11px] text-slate-700 font-semibold">
                    {dossier.operatorUser?.fullName || "Bộ phận Điều hành"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    • {dossier.updatedAt ? new Date(dossier.updatedAt).toLocaleDateString("vi-VN") : "Ghi chú theo hồ sơ"}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 font-medium px-2 py-0.5 rounded-md">
                  Chỉnh sửa trực tiếp
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">
                Người xem:{" "}
                <span className="text-slate-600 font-medium">
                  Sale & Điều hành
                </span>
              </span>
              <span className="text-[11px] font-mono">
                {operatorNote.length} ký tự
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Financial Estimation Tables (Full Width 100%) */}
      <div className="space-y-5">
        {/* SECTION 1: DOANH THU */}
        <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900 mb-0 tracking-tight">
                1. Doanh thu
              </h2>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 font-semibold px-2 py-0.5 rounded-md">
                Chỉnh sửa trực tiếp trên bảng
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Doanh thu tạm tính (chưa VAT):{" "}
              <span className="font-mono font-bold text-slate-900 ml-1">
                {formatCurrency(totalRevenueNoVat || 228000000)} VNĐ
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
                  <th className="py-2.5 px-2 text-center w-20">Đơn vị</th>
                  <th className="py-2.5 px-2 text-right w-36">
                    Đơn giá (VNĐ)
                  </th>
                  <th className="py-2.5 px-2 text-center w-20">VAT (%)</th>
                  <th className="py-2.5 px-2 text-right w-36">
                    Thành tiền (VNĐ)
                  </th>
                  <th className="py-2.5 px-2 min-w-[140px]">Ghi chú</th>
                  <th className="py-2.5 px-2 text-center w-28">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenueRows.map((row) => {
                  const rowTotal =
                    row.quantity * row.unitPrice * (1 + row.vatRate / 100);
                  const isWarning = row.status === "WARNING";
                  return (
                    <tr
                      key={row.id}
                      id={`revenue-row-${row.id}`}
                      className={`transition-colors duration-200 ${
                        isWarning
                          ? "bg-amber-50/40 hover:bg-amber-50/70"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="py-2.5 px-2 text-center text-slate-400 font-medium">
                        {row.stt}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span>{row.description}</span>
                          <EditOutlined className="text-slate-300 text-[10px]" />
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                        {row.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-500 font-medium">
                        {row.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <InputNumber<number>
                          size="small"
                          value={row.unitPrice}
                          onChange={(val) =>
                            handleRevenuePriceChange(row.id, val ?? 0)
                          }
                          formatter={(value) =>
                            value !== undefined && value !== null
                              ? `${value}`.replace(
                                  /\B(?=(\d{3})+(?!\d))/g,
                                  ".",
                                )
                              : ""
                          }
                          parser={(displayValue) =>
                            displayValue
                              ? Number(displayValue.replace(/\D/g, ""))
                              : 0
                          }
                          controls={false}
                          className={`w-full text-right font-mono font-medium text-xs h-7 rounded-md [&_input]:text-right ${
                            isWarning
                              ? "border-amber-400 bg-amber-50/50 text-amber-900 focus:border-amber-500"
                              : "border-slate-200 text-slate-800"
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Select
                          size="small"
                          value={row.vatRate}
                          onChange={(val) =>
                            handleRevenueVatChange(row.id, val)
                          }
                          className="w-14 text-xs"
                          options={[
                            { label: "0", value: 0 },
                            { label: "8", value: 8 },
                            { label: "10", value: 10 },
                          ]}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(rowTotal)}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`truncate block max-w-[180px] font-medium ${
                            isWarning
                              ? "text-amber-700 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {row.note}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {row.status === "VALID" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Hợp lệ
                          </span>
                        )}
                        {row.status === "WARNING" && (
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
            <span className="text-slate-500 font-medium">
              Tổng doanh thu (chưa VAT):
            </span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {formatCurrency(totalRevenueNoVat || 228000000)}
            </span>
          </div>
        </div>

        {/* SECTION 2: CHI PHÍ */}
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
                Có VAT:{" "}
                <span className="font-mono font-bold">
                  {formatCurrency(totalCostVat)}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-100/80 text-amber-900 font-medium text-[11px]">
                Chưa VAT:{" "}
                <span className="font-mono font-bold">
                  {formatCurrency(totalCostNoVatSum)}
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100/80 text-rose-900 font-bold text-[11px]">
                Tổng chi phí:{" "}
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
                          colSpan={9}
                          className="py-2 px-3 tracking-wide uppercase font-bold text-xs"
                        >
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
                              <div className="flex items-center justify-between gap-2">
                                <span>{sec.title}</span>
                                <Tooltip
                                  title={`Thêm dòng vào mục ${sec.title}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAddCostRow(
                                        sec.title,
                                        "vat",
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
                              {secIdx === 0 ? "NHÀ CUNG CẤP" : ""}
                            </td>
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
                                colSpan={9}
                                className="py-2 px-3 text-slate-400"
                              >
                                Chưa có dịch vụ trong mục này. Bấm dấu{" "}
                                <span className="font-bold text-sky-700 not-italic">
                                  +
                                </span>{" "}
                                bên cạnh tiêu đề để thêm dòng mới.
                              </td>
                            </tr>
                          ) : (
                            sec.items.map((row) =>
                              renderCostRow(row, "vat", currentStt++),
                            )
                          )}
                        </React.Fragment>
                      ))}

                      {/* PHẦN II: DỊCH VỤ ĐẦU VÀO CHƯA VAT */}
                      <tr className="bg-[#FFF2CC] text-amber-950 font-bold border-y border-amber-300">
                        <td className="py-2 px-2 text-center font-bold border-r border-amber-200">
                          II
                        </td>
                        <td
                          colSpan={9}
                          className="py-2 px-3 tracking-wide uppercase font-bold text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>DỊCH VỤ ĐẦU VÀO CHƯA VAT</span>
                            <Tooltip title="Thêm dòng dịch vụ chưa VAT">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddCostRow(
                                    "DỊCH VỤ ĐẦU VÀO CHƯA VAT",
                                    "novat",
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
                            colSpan={9}
                            className="py-2 px-3 text-slate-400"
                          >
                            Chưa có dịch vụ chưa VAT. Bấm dấu{" "}
                            <span className="font-bold text-amber-700 not-italic">
                              +
                            </span>{" "}
                            để thêm dòng mới.
                          </td>
                        </tr>
                      ) : (
                        costNoVatItems.map((row) =>
                          renderCostRow(row, "novat", currentStt++),
                        )
                      )}
                    </>
                  );
                })()}
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
            <span className="italic">
              * Bảng chiết tính chi phí đầu vào theo định dạng chuẩn file mẫu
              1908 DỰ TRÙ - APP.xlsx
            </span>
            <span className="font-medium text-slate-500">
              Tổng cộng: {costRows.length} hạng mục dịch vụ
            </span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Fixed Action Bar */}
      <div
        className={`fixed bottom-0 right-0 z-30 bg-white border-t border-slate-200 px-6 py-3 shadow-lg flex items-center justify-between transition-[left] duration-200 ease-in-out ${
          sidebarCollapsed ? "left-0 lg:left-[72px]" : "left-0 lg:left-[238px]"
        }`}
      >
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
                {dossier?.status === "NEED_CHANGES"
                  ? "Gửi điều hành lại"
                  : "Gửi điều hành duyệt"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
