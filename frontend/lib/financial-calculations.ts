export type FinancialLine = {
  quantity?: number | string | null;
  multiplier?: number | string | null;
  unitPrice?: number | string | null;
  vatRate?: number | string | null;
  netAmount?: number | string | null;
  grossAmount?: number | string | null;
};

// The supplied Excel template applies a fixed 8% VAT divisor in its summary.
export const EXCEL_VAT_DIVISOR = 1.08;

function numericValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateLineNetAmount(line: FinancialLine): number {
  return (
    numericValue(line.quantity, 1) *
    numericValue(line.multiplier, 1) *
    numericValue(line.unitPrice, 0)
  );
}

export function calculateLineGrossAmount(line: FinancialLine): number {
  const netAmount = calculateLineNetAmount(line);
  return netAmount * (1 + numericValue(line.vatRate, 0) / 100);
}

export function getLineNetAmount(line: FinancialLine): number {
  const netAmount = Number(line.netAmount);
  return Number.isFinite(netAmount) ? netAmount : calculateLineNetAmount(line);
}

export function getLineGrossAmount(line: FinancialLine): number {
  const grossAmount = Number(line.grossAmount);
  return Number.isFinite(grossAmount)
    ? grossAmount
    : calculateLineGrossAmount(line);
}

export function sumLineNetAmounts(lines: FinancialLine[] = []): number {
  return lines.reduce((sum, line) => sum + getLineNetAmount(line), 0);
}

/** Amount represented by the Excel source columns before the summary divisor. */
export function getWorkbookGrossAmount(line: FinancialLine): number {
  return calculateLineNetAmount(line);
}

/** Matches the DỰ TOÁN!D55/F55 formulas: taxable values are divided by 1.08. */
export function getWorkbookNetAmount(
  line: FinancialLine,
  isVatService: boolean,
): number {
  const grossAmount = getWorkbookGrossAmount(line);
  return isVatService ? grossAmount / EXCEL_VAT_DIVISOR : grossAmount;
}

export function sumWorkbookGrossAmounts(lines: FinancialLine[] = []): number {
  return lines.reduce((sum, line) => sum + getWorkbookGrossAmount(line), 0);
}

export function sumWorkbookNetAmounts(
  lines: FinancialLine[] = [],
  isVatService: boolean,
): number {
  return lines.reduce(
    (sum, line) => sum + getWorkbookNetAmount(line, isVatService),
    0,
  );
}
