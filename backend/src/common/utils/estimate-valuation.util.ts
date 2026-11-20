/**
 * Canonical In-Process Estimate Valuation Core (Backend)
 *
 * Single source of truth for Sky-Lux Excel workbook valuation:
 * - Workbook Gross = quantity * multiplier * unitPrice
 * - Revenue Valued Net = workbookGross / EXCEL_VAT_DIVISOR (1.08)
 * - Cost Valued Net = vatRate > 0 ? workbookGross / 1.08 : workbookGross
 * - Gross Profit = Math.round(revenueNet - costNet)
 * - Margin (%) = revenueNet > 0 ? Number(((profitExact / revenueNet) * 100).toFixed(2)) : 0
 */

export const EXCEL_VAT_DIVISOR = 1.08;

export interface ValuationLineInput {
  quantity?: number | string | null;
  multiplier?: number | string | null;
  unitPrice?: number | string | null;
  vatRate?: number | string | null;
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
 * Preserves explicit zero quantities and multipliers (0 * mult * price === 0).
 */
export function calculateWorkbookGrossAmount(line: ValuationLineInput): number {
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

  let calculatedProfit = netProfit;
  let calculatedMargin = netMargin;
  let profitDelta = 0;

  if (isProvidedFiniteNumber(sourceSummary.totalProfit)) {
    const expectedProfit = Number(sourceSummary.totalProfit);
    const netDelta = Math.abs(netProfit - expectedProfit);
    const grossDelta = Math.abs(grossProfit - expectedProfit);

    if (netDelta <= grossDelta) {
      calculatedProfit = netProfit;
      calculatedMargin = netMargin;
      profitDelta = netDelta;
    } else {
      calculatedProfit = grossProfit;
      calculatedMargin = grossMargin;
      profitDelta = grossDelta;
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

  return {
    status,
    valuation,
    calculatedProfit,
    calculatedMargin,
    revenueDelta,
    costDelta,
    profitDelta,
    hasLineTampering,
  };
}
