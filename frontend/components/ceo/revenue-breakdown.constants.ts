import { themeTokens } from '@/lib/theme/tokens.config';

// Shared palette for the revenue donut charts on the CEO dashboard and revenue page.
// Single source of truth is now themeTokens.charts.revenueBreakdownDonut
export const REVENUE_BREAKDOWN_COLORS: string[] = [
  ...themeTokens.charts.revenueBreakdownDonut,
];

