/**
 * Canonical In-Process Estimate Valuation & Cost-Section Grouping Core (Frontend)
 *
 * 1:1 parity with `backend/src/common/utils/estimate-valuation.util.ts`:
 * - Workbook Gross = quantity * multiplier * unitPrice
 * - Revenue Valued Net = workbookGross / EXCEL_VAT_DIVISOR (1.08)
 * - Cost Valued Net = vatRate > 0 ? workbookGross / 1.08 : workbookGross
 * - Gross Profit = Math.round(revenueNet - costNet)
 * - Margin (%) = revenueNet > 0 ? Number(((profitExact / revenueNet) * 100).toFixed(2)) : 0
 *
 * Pure TypeScript module: zero React, Ant Design, or I/O dependencies.
 */

export const EXCEL_VAT_DIVISOR = 1.08;

export interface ValuationLineInput {
  quantity?: number | string | null;
  multiplier?: number | string | null;
  unitPrice?: number | string | null;
  vatRate?: number | string | null;
  sourceAmount?: number | string | null;
  isTamperedFormula?: boolean;
}

export interface EstimateValuationSummary {
  revenueGross: number;
  revenueNet: number;
  costVatGross: number;
  costVatNet: number;
  costNoVatGross: number;
  costNoVatNet: number;
  costGross: number;
  costNet: number;
  profitExact: number;
  profit: number;
  marginPercent: number;
}

export interface EstimateSourceSummaryInput {
  totalRevenue?: number | null;
  totalCost?: number | null;
  totalProfit?: number | null;
}

export type ReconciliationStatus =
  | 'MATCHED'
  | 'ROUNDING_TOLERANCE'
  | 'MISMATCH';

export interface EstimateReconciliationResult {
  status: ReconciliationStatus;
  valuation: EstimateValuationSummary;
  calculatedProfit: number;
  calculatedMargin: number;
  revenueDelta: number;
  costDelta: number;
  profitDelta: number;
  hasLineTampering: boolean;
  warnings: string[];
}

export interface CostCategoryMeta {
  code: string;
  title: string;
  order: number;
}

export interface CostCategoryClassifiable {
  description?: string;
  serviceCategory?: { name?: string };
  categoryTitle?: string;
}

export interface CostSectionGroup<T> {
  code: string;
  title: string;
  order: number;
  items: T[];
  subTotal: number;
}

export interface GroupedCostSections<T> {
  vatSections: CostSectionGroup<T>[];
  noVatItems: T[];
  totalVatGross: number;
  totalNoVatGross: number;
  grandTotalGross: number;
}

export interface CostSummaryRow {
  key: 'service-vat' | 'service-no-vat' | 'total' | string;
  label: string;
  revenue: number;
  cost: number;
  grossRevenue?: number;
  grossCost?: number;
  grossProfit: number;
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return normalizeZero(fallback);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? normalizeZero(parsed)
    : normalizeZero(fallback);
}

/**
 * Normalizes VAT rates into percentage points (e.g., 8, 10, 0):
 * - Explicit percentage strings ('10%', '1%', '0.5%', '8,5%') keep their literal % value.
 * - Fractional decimals without '%' (0 < rate < 1, e.g., 0.08 -> 8, 0.1 -> 10) scale by 100.
 * - Whole/integer rates (>= 1, e.g., 1, 8, 10, 100) keep their percentage value.
 */
export function parseVatRate(vatRate?: number | string | null): number {
  if (vatRate === undefined || vatRate === null) return 0;

  const hasPercent = typeof vatRate === 'string' && vatRate.includes('%');
  let parsed: number;
  if (typeof vatRate === 'number') {
    parsed = vatRate;
  } else {
    const cleaned = String(vatRate)
      .trim()
      .replace(/%/g, '')
      .replace(/,/g, '.');
    if (cleaned === '') return 0;
    parsed = Number(cleaned);
  }

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (!hasPercent && parsed > 0 && parsed < 1) {
    return Math.round(parsed * 10000) / 100;
  }
  return parsed;
}

/**
 * Amount represented by the Excel workbook columns before applying the 1.08 summary divisor.
 */
export function calculateWorkbookGrossAmount(line: ValuationLineInput): number {
  const sourceAmount = toFiniteNumber(line.sourceAmount, Number.NaN);
  const rawUnitPrice = toFiniteNumber(line.unitPrice, Number.NaN);
  if (
    Number.isFinite(sourceAmount) &&
    (!Number.isFinite(rawUnitPrice) || rawUnitPrice === 0)
  ) {
    return normalizeZero(sourceAmount);
  }

  const quantity = toFiniteNumber(line.quantity, 1);
  const multiplier = toFiniteNumber(line.multiplier, 1);
  const unitPrice = toFiniteNumber(line.unitPrice, 0);
  return normalizeZero(quantity * multiplier * unitPrice);
}

/**
 * Applies the Sky-Lux Excel summary divisor (1.08) when the line is taxable.
 */
export function calculateValuedNetAmount(
  line: ValuationLineInput,
  isTaxable: boolean,
): number {
  const gross = calculateWorkbookGrossAmount(line);
  return normalizeZero(isTaxable ? gross / EXCEL_VAT_DIVISOR : gross);
}

/**
 * Evaluates full estimate totals from revenue and cost lines without I/O.
 */
export function valuateEstimate(
  revenueLines: ValuationLineInput[] = [],
  costLines: ValuationLineInput[] = [],
): EstimateValuationSummary {
  const revenueGross = normalizeZero(
    revenueLines.reduce(
      (sum, line) => sum + calculateWorkbookGrossAmount(line),
      0,
    ),
  );
  const revenueNet = normalizeZero(revenueGross / EXCEL_VAT_DIVISOR);

  let costVatGross = 0;
  let costNoVatGross = 0;

  for (const line of costLines) {
    const gross = calculateWorkbookGrossAmount(line);
    if (parseVatRate(line.vatRate) > 0) {
      costVatGross += gross;
    } else {
      costNoVatGross += gross;
    }
  }

  const costVatNet = normalizeZero(costVatGross / EXCEL_VAT_DIVISOR);
  const costNoVatNet = normalizeZero(costNoVatGross);
  const costGross = normalizeZero(costVatGross + costNoVatGross);
  const costNet = normalizeZero(costVatNet + costNoVatNet);

  const profitExact = normalizeZero(revenueNet - costNet);
  const profit = normalizeZero(Math.round(profitExact));
  const marginPercent =
    revenueNet > 0
      ? normalizeZero(Number(((profitExact / revenueNet) * 100).toFixed(2)))
      : 0;

  return {
    revenueGross,
    revenueNet,
    costVatGross: normalizeZero(costVatGross),
    costVatNet,
    costNoVatGross: normalizeZero(costNoVatGross),
    costNoVatNet,
    costGross,
    costNet,
    profitExact,
    profit,
    marginPercent,
  };
}

function isProvidedFiniteNumber(value: unknown): value is number {
  if (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return false;
  }
  return Number.isFinite(Number(value));
}

/**
 * Reconciles calculated estimate totals against an Excel workbook's declared summary totals.
 */
export function reconcileEstimateValuation(
  revenueLines: ValuationLineInput[] = [],
  costLines: ValuationLineInput[] = [],
  sourceSummary: EstimateSourceSummaryInput = {},
): EstimateReconciliationResult {
  const valuation = valuateEstimate(revenueLines, costLines);

  const netProfit = valuation.profitExact;
  const netMargin = valuation.marginPercent;

  const grossProfit = normalizeZero(valuation.revenueGross - valuation.costGross);
  const grossMargin =
    valuation.revenueGross > 0
      ? normalizeZero(
          Number(((grossProfit / valuation.revenueGross) * 100).toFixed(2)),
        )
      : 0;

  let calculatedProfit = grossProfit;
  let calculatedMargin = grossMargin;
  let profitDelta = 0;

  if (isProvidedFiniteNumber(sourceSummary.totalProfit)) {
    const expectedProfit = Number(sourceSummary.totalProfit);
    const netDelta = Math.abs(netProfit - expectedProfit);
    const grossDelta = Math.abs(grossProfit - expectedProfit);

    if (netDelta <= 1000 && netDelta < grossDelta) {
      calculatedProfit = netProfit;
      calculatedMargin = netMargin;
      profitDelta = netDelta;
    } else if (grossDelta <= 1000) {
      calculatedProfit = grossProfit;
      calculatedMargin = grossMargin;
      profitDelta = grossDelta;
    } else {
      if (netDelta < grossDelta) {
        calculatedProfit = netProfit;
        calculatedMargin = netMargin;
        profitDelta = netDelta;
      } else {
        calculatedProfit = grossProfit;
        calculatedMargin = grossMargin;
        profitDelta = grossDelta;
      }
    }
  }

  const revenueDelta = isProvidedFiniteNumber(sourceSummary.totalRevenue)
    ? Math.abs(valuation.revenueGross - Number(sourceSummary.totalRevenue))
    : 0;

  const costDelta = isProvidedFiniteNumber(sourceSummary.totalCost)
    ? Math.abs(valuation.costGross - Number(sourceSummary.totalCost))
    : 0;

  const hasLineTampering =
    revenueLines.some((r) => Boolean(r.isTamperedFormula)) ||
    costLines.some((c) => Boolean(c.isTamperedFormula));

  let status: ReconciliationStatus = 'MATCHED';
  if (
    revenueDelta > 1000 ||
    costDelta > 1000 ||
    profitDelta > 1000 ||
    hasLineTampering
  ) {
    status = 'MISMATCH';
  } else if (revenueDelta > 1 || costDelta > 1 || profitDelta > 1) {
    status = 'ROUNDING_TOLERANCE';
  }

  const warnings: string[] = [];
  if (hasLineTampering) {
    warnings.push('Phát hiện công thức bị can thiệp tại các dòng chi phí');
  }
  if (status === 'MISMATCH') {
    if (revenueDelta > 1000) {
      warnings.push(
        `Tổng doanh thu lệch ${revenueDelta.toLocaleString('vi-VN')} đ so với ô tổng kết của Excel`,
      );
    }
    if (costDelta > 1000) {
      warnings.push(
        `Tổng chi phí lệch ${costDelta.toLocaleString('vi-VN')} đ so với ô tổng kết của Excel`,
      );
    }
    if (profitDelta > 1000) {
      warnings.push(
        `Lợi nhuận gộp lệch ${profitDelta.toLocaleString('vi-VN')} đ so với ô tổng kết của Excel`,
      );
    }
  }

  return {
    status,
    valuation,
    calculatedProfit,
    calculatedMargin,
    revenueDelta,
    costDelta,
    profitDelta,
    hasLineTampering,
    warnings,
  };
}

/**
 * Classifies a VAT cost line into one of Sky-Lux's 5 standard operational cost sections.
 */
export function classifyCostCategory(
  line: CostCategoryClassifiable,
): CostCategoryMeta {
  const explicitCat = (line.categoryTitle || line.serviceCategory?.name || '')
    .toUpperCase()
    .trim();

  if (explicitCat === 'VÉ THAM QUAN')
    return { code: '1.1', title: 'VÉ THAM QUAN', order: 1 };
  if (explicitCat === 'KHÁCH SẠN')
    return { code: '1.2', title: 'KHÁCH SẠN', order: 2 };
  if (explicitCat === 'ĂN UỐNG')
    return { code: '1.2b', title: 'ĂN UỐNG', order: 3 };
  if (explicitCat === 'VẬN CHUYỂN')
    return { code: '1.3', title: 'VẬN CHUYỂN', order: 4 };
  if (explicitCat === 'CÁC DỊCH VỤ KHÁC')
    return { code: '1.4', title: 'CÁC DỊCH VỤ KHÁC', order: 5 };

  const desc = (line.description || '').toLowerCase();
  const cat = (line.serviceCategory?.name || '').toLowerCase();

  if (
    desc.includes('gala') ||
    desc.includes('team building') ||
    desc.includes('hội nghị') ||
    cat.includes('chi phí khác')
  ) {
    return { code: '1.4', title: 'CÁC DỊCH VỤ KHÁC', order: 5 };
  }
  if (
    desc.includes('vé tham quan') ||
    desc.includes('hội an') ||
    desc.includes('bà nà') ||
    desc.includes('đại nội') ||
    cat.includes('vé tham quan')
  ) {
    return { code: '1.1', title: 'VÉ THAM QUAN', order: 1 };
  }
  if (
    desc.includes('khách sạn') ||
    desc.includes('mường thanh') ||
    desc.includes('hương giang') ||
    desc.includes('phòng') ||
    cat.includes('khách sạn')
  ) {
    return { code: '1.2', title: 'KHÁCH SẠN', order: 2 };
  }
  if (
    desc.includes('ăn uống') ||
    desc.includes('madam lân') ||
    desc.includes('cơm niêu') ||
    desc.includes('trưa ngày') ||
    desc.includes('tối ngày') ||
    cat.includes('nhà hàng')
  ) {
    return { code: '1.2b', title: 'ĂN UỐNG', order: 3 };
  }
  if (
    desc.includes('xe') ||
    desc.includes('vận chuyển') ||
    desc.includes('triệu bảo ý') ||
    cat.includes('vận chuyển')
  ) {
    return { code: '1.3', title: 'VẬN CHUYỂN', order: 4 };
  }
  return { code: '1.4', title: 'CÁC DỊCH VỤ KHÁC', order: 5 };
}

/**
 * Groups cost lines into sorted Section I (VAT) categories and Section II (No-VAT),
 * computing subtotals and grand totals purely in-process.
 */
export function groupCostLinesByVatSection<
  TLine extends ValuationLineInput & CostCategoryClassifiable,
  TItem = TLine,
>(
  lines: TLine[] = [],
  options?: {
    mapItem?: (line: TLine, index: number, grossAmount: number) => TItem;
    getAmount?: (line: TLine) => number;
  },
): GroupedCostSections<TItem> {
  const vatMap = new Map<string, CostSectionGroup<TItem>>();
  const noVatItems: TItem[] = [];
  let totalNoVatGross = 0;

  lines.forEach((line, index) => {
    const grossAmount = options?.getAmount
      ? options.getAmount(line)
      : calculateWorkbookGrossAmount(line);
    const item = options?.mapItem
      ? options.mapItem(line, index, grossAmount)
      : (line as unknown as TItem);

    if (parseVatRate(line.vatRate) > 0) {
      const cat = classifyCostCategory(line);
      const group = vatMap.get(cat.title) || {
        code: cat.code,
        title: cat.title,
        order: cat.order,
        items: [],
        subTotal: 0,
      };
      group.items.push(item);
      group.subTotal += grossAmount;
      vatMap.set(cat.title, group);
    } else {
      noVatItems.push(item);
      totalNoVatGross += grossAmount;
    }
  });

  const vatSections = Array.from(vatMap.values()).sort(
    (a, b) => a.order - b.order,
  );
  const totalVatGross = vatSections.reduce((sum, sec) => sum + sec.subTotal, 0);

  return {
    vatSections,
    noVatItems,
    totalVatGross: normalizeZero(totalVatGross),
    totalNoVatGross: normalizeZero(totalNoVatGross),
    grandTotalGross: normalizeZero(totalVatGross + totalNoVatGross),
  };
}

/**
 * Builds the 3 canonical summary rows matching the Sky-Lux Excel budget sheet:
 * VAT services (divided by 1.08), Non-VAT services (unchanged), and Total.
 */
export function buildCostSummaryRows(
  costLines: ValuationLineInput[] = [],
  totalRevenueGross = 0,
): CostSummaryRow[] {
  const valuation = valuateEstimate(
    [{ quantity: 1, multiplier: 1, unitPrice: totalRevenueGross }],
    costLines,
  );

  const serviceVatRow: CostSummaryRow = {
    key: 'service-vat',
    label: 'Dịch vụ 10%',
    revenue: valuation.revenueNet,
    cost: valuation.costVatNet,
    grossRevenue: valuation.revenueGross,
    grossCost: valuation.costVatGross,
    grossProfit: normalizeZero(valuation.revenueNet - valuation.costVatNet),
  };

  const serviceNoVatRow: CostSummaryRow = {
    key: 'service-no-vat',
    label: 'Dịch vụ 0%',
    revenue: 0,
    cost: valuation.costNoVatNet,
    grossRevenue: 0,
    grossCost: valuation.costNoVatGross,
    grossProfit: normalizeZero(-valuation.costNoVatNet),
  };

  const totalRow: CostSummaryRow = {
    key: 'total',
    label: 'TỔNG CỘNG',
    revenue: valuation.revenueNet,
    cost: valuation.costNet,
    grossRevenue: valuation.revenueGross,
    grossCost: valuation.costGross,
    grossProfit: valuation.profitExact,
  };

  return [serviceVatRow, serviceNoVatRow, totalRow];
}

export { classifyCostCategory as classifyCategory };

