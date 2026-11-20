import { EXCEL_VAT_DIVISOR } from '../../common/utils/estimate-valuation.util';

/**
 * Canonical SQL fragments shared across FinancialReadModelService,
 * Dashboards, Reports, KPIs, Estimates, Suppliers, and Customers.
 *
 * Single source of truth for:
 * 1. Latest non-deleted APPROVED estimate per dossier (zero multi-revision double-counting)
 * 2. Canonical Excel 1.08 VAT valuation in PostgreSQL matching EstimateValuation 1:1
 */

export const LATEST_APPROVED_ESTIMATE_SUBQUERY = `(
  SELECT latest.id
  FROM estimates latest
  WHERE latest.dossier_id = dossier.id
    AND latest.organization_id = :organizationId
    AND latest.status = :approvedEstimateStatus
    AND latest.deleted_at IS NULL
  ORDER BY latest.version_no DESC, latest.approved_at DESC NULLS LAST, latest.created_at DESC
  LIMIT 1
)`;

export function latestApprovedEstimateJoinCondition(
  dossierAlias = 'dossier',
  estimateAlias = 'estimate',
): string {
  return `${estimateAlias}.status = :approvedEstimateStatus AND ${estimateAlias}.id = (
    SELECT latest.id
    FROM estimates latest
    WHERE latest.dossier_id = ${dossierAlias}.id
      AND latest.organization_id = :organizationId
      AND latest.status = :approvedEstimateStatus
      AND latest.deleted_at IS NULL
    ORDER BY latest.version_no DESC, latest.approved_at DESC NULLS LAST, latest.created_at DESC
    LIMIT 1
  )`;
}

/**
 * Canonical workbook gross expression stored on `estimate_revenue_lines` / `estimate_cost_lines`.
 */
export function WORKBOOK_GROSS_SQL(alias = 'line'): string {
  return `COALESCE(${alias}.net_amount, 0)`;
}

/**
 * Canonical valued net revenue SQL matching `EstimateValuation.revenueNet` (workbook gross / 1.08).
 */
export function VALUED_REVENUE_NET_SQL(alias = 'line'): string {
  return `(COALESCE(${alias}.net_amount, 0) / ${EXCEL_VAT_DIVISOR})`;
}

/**
 * Canonical valued net cost SQL matching `EstimateValuation.costNet`:
 * VAT lines (`vat_rate > 0`) divide by 1.08; 0% lines keep their full amount.
 */
export function VALUED_COST_NET_SQL(alias = 'line'): string {
  return `(CASE WHEN COALESCE(${alias}.vat_rate, 0) > 0 THEN COALESCE(${alias}.net_amount, 0) / ${EXCEL_VAT_DIVISOR} ELSE COALESCE(${alias}.net_amount, 0) END)`;
}

/**
 * Safe PostgreSQL `TO_CHAR(... AT TIME ZONE ...)` expression for month bucketing.
 */
export function zonedMonthKeySql(
  columnSql: string,
  timeZone = 'Asia/Ho_Chi_Minh',
): string {
  // Whitelist IANA timezone characters to prevent SQL injection if caller passes dynamic zone
  const safeTz = /^[A-Za-z0-9_/+.-]+$/.test(timeZone)
    ? timeZone
    : 'Asia/Ho_Chi_Minh';
  return `TO_CHAR((${columnSql} AT TIME ZONE '${safeTz}'), 'YYYY-MM')`;
}
