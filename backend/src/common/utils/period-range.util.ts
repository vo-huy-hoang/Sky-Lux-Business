/**
 * Timezone-Safe Period Range Resolver (Default: Asia/Ho_Chi_Minh, UTC+7)
 *
 * Eliminates the classic `new Date(y, m, 1).toISOString().slice(0, 10)` bug
 * where midnight local dates in UTC+7 shift backward into the previous UTC day.
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

export type PeriodKind = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface ResolvedPeriodRange {
  periodStart: string;
  periodEnd: string;
  startUtc: Date;
  endUtc: Date;
  year: number;
  month: number; // 1..12
  quarter: number; // 1..4
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function getDateTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dateTimeFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    dateTimeFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  // Date.UTC(year, month, 0) where month is 1-based returns last day of that month
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12) return false;
  const maxDay = daysInMonth(year, month);
  return day >= 1 && day <= maxDay;
}

/**
 * Extracts calendar parts (year, month 1..12, day 1..31) in the target IANA timezone.
 */
function extractCalendarPartsInTimezone(
  referenceDate: Date | string | undefined,
  timeZone: string,
): { year: number; month: number; day: number } {
  if (typeof referenceDate === 'string') {
    const trimmed = referenceDate.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      if (isValidCalendarDate(year, month, day)) {
        return { year, month, day };
      }
      // Invalid calendar date (e.g., 2026-13-01 or 2026-02-31): fall back to current date in timeZone
      return extractCalendarPartsInTimezone(new Date(), timeZone);
    }
  }

  const instant =
    referenceDate instanceof Date
      ? referenceDate
      : referenceDate
        ? new Date(referenceDate)
        : new Date();

  const safeInstant = Number.isNaN(instant.getTime()) ? new Date() : instant;

  const parts = getDateFormatter(timeZone).formatToParts(safeInstant);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

/**
 * Computes the UTC offset in milliseconds for a given UTC wall-clock date in `timeZone`.
 * Positive for zones east of UTC (e.g., Asia/Ho_Chi_Minh = +7h = +25_200_000 ms).
 */
function getTimezoneOffsetMs(utcWallMs: number, timeZone: string): number {
  const wholeSecondMs = Math.floor(utcWallMs / 1000) * 1000;
  const parts = getDateTimeFormatter(timeZone).formatToParts(
    new Date(wholeSecondMs),
  );
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asUtcMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtcMs - wholeSecondMs;
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string,
): Date {
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offset1 = getTimezoneOffsetMs(naiveUtcMs, timeZone);
  const candidate = naiveUtcMs - offset1;
  const offset2 = getTimezoneOffsetMs(candidate, timeZone);
  return new Date(naiveUtcMs - offset2);
}

/**
 * Resolves exact calendar strings (`YYYY-MM-DD`) and UTC boundary instants
 * for MONTHLY, QUARTERLY, or YEARLY periods in the configured business timezone.
 */
export function resolvePeriodRange(
  periodType: PeriodKind | string,
  referenceDate?: Date | string,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): ResolvedPeriodRange {
  const { year, month } = extractCalendarPartsInTimezone(
    referenceDate,
    timeZone,
  );
  const quarter = Math.floor((month - 1) / 3) + 1;
  const normalizedType = String(periodType || 'MONTHLY').toUpperCase();

  let startMonth: number;
  let endMonth: number;

  if (normalizedType === 'YEARLY') {
    startMonth = 1;
    endMonth = 12;
  } else if (normalizedType === 'QUARTERLY') {
    startMonth = (quarter - 1) * 3 + 1;
    endMonth = startMonth + 2;
  } else {
    startMonth = month;
    endMonth = month;
  }

  const endDay = daysInMonth(year, endMonth);
  const periodStart = formatCalendarDate(year, startMonth, 1);
  const periodEnd = formatCalendarDate(year, endMonth, endDay);

  const startUtc = zonedDateTimeToUtc(
    year,
    startMonth,
    1,
    0,
    0,
    0,
    0,
    timeZone,
  );
  const endUtc = zonedDateTimeToUtc(
    year,
    endMonth,
    endDay,
    23,
    59,
    59,
    999,
    timeZone,
  );

  return {
    periodStart,
    periodEnd,
    startUtc,
    endUtc,
    year,
    month,
    quarter,
  };
}

/**
 * Resolves explicit calendar bounds (`periodStart` .. `periodEnd`, accepting either
 * `YYYY-MM-DD` or ISO timestamp strings) into exact UTC boundary Date instants
 * in the configured business timezone (default: `Asia/Ho_Chi_Minh`, UTC+7).
 */
export function resolveCalendarBounds(
  periodStart: string,
  periodEnd: string,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): { startUtc: Date; endUtc: Date; periodStart: string; periodEnd: string } {
  const startParts = extractCalendarPartsInTimezone(periodStart, timeZone);
  const endParts = extractCalendarPartsInTimezone(periodEnd, timeZone);

  return {
    periodStart: formatCalendarDate(
      startParts.year,
      startParts.month,
      startParts.day,
    ),
    periodEnd: formatCalendarDate(endParts.year, endParts.month, endParts.day),
    startUtc: zonedDateTimeToUtc(
      startParts.year,
      startParts.month,
      startParts.day,
      0,
      0,
      0,
      0,
      timeZone,
    ),
    endUtc: zonedDateTimeToUtc(
      endParts.year,
      endParts.month,
      endParts.day,
      23,
      59,
      59,
      999,
      timeZone,
    ),
  };
}
