import {
  DEFAULT_BUSINESS_TIMEZONE,
  resolveCalendarBounds,
  resolvePeriodRange,
} from './period-range.util';

describe('resolvePeriodRange (UTC+7 Timezone-Safe Period Core)', () => {
  it('uses Asia/Ho_Chi_Minh as default business timezone', () => {
    expect(DEFAULT_BUSINESS_TIMEZONE).toBe('Asia/Ho_Chi_Minh');
  });

  it('never shifts backward by 1 day for YYYY-MM-01 00:00+07:00 (previous day in UTC)', () => {
    // 2026-11-01T00:00:00+07:00 === 2026-10-31T17:00:00.000Z
    const monthly = resolvePeriodRange('MONTHLY', '2026-11-01T00:00:00+07:00');
    expect(monthly.periodStart).toBe('2026-11-01');
    expect(monthly.periodEnd).toBe('2026-11-30');
    expect(monthly.year).toBe(2026);
    expect(monthly.month).toBe(11);
    expect(monthly.quarter).toBe(4);
    expect(monthly.startUtc.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(monthly.endUtc.toISOString()).toBe('2026-11-30T16:59:59.999Z');
  });

  it('keeps New Year midnight in UTC+7 inside the new year (not Dec 31 of prior year)', () => {
    // 2026-01-01T00:30:00+07:00 === 2025-12-31T17:30:00.000Z
    const yearly = resolvePeriodRange('yearly', '2026-01-01T00:30:00+07:00');
    expect(yearly.periodStart).toBe('2026-01-01');
    expect(yearly.periodEnd).toBe('2026-12-31');
    expect(yearly.year).toBe(2026);
    expect(yearly.startUtc.toISOString()).toBe('2025-12-31T17:00:00.000Z');
    expect(yearly.endUtc.toISOString()).toBe('2026-12-31T16:59:59.999Z');
  });

  it('resolves quarterly boundaries accurately across all 4 quarters', () => {
    expect(resolvePeriodRange('QUARTERLY', '2026-01-15')).toMatchObject({
      periodStart: '2026-01-01',
      periodEnd: '2026-03-31',
      quarter: 1,
    });
    expect(
      resolvePeriodRange('quarterly', '2026-04-01T00:00:00+07:00'),
    ).toMatchObject({
      periodStart: '2026-04-01',
      periodEnd: '2026-06-30',
      quarter: 2,
    });
    expect(resolvePeriodRange('QUARTERLY', '2026-09-30')).toMatchObject({
      periodStart: '2026-07-01',
      periodEnd: '2026-09-30',
      quarter: 3,
    });
    expect(resolvePeriodRange('QUARTERLY', '2026-12-01')).toMatchObject({
      periodStart: '2026-10-01',
      periodEnd: '2026-12-31',
      quarter: 4,
    });
  });

  it('handles leap year vs non-leap year February month ends', () => {
    const leap = resolvePeriodRange('MONTHLY', '2024-02-10');
    expect(leap.periodStart).toBe('2024-02-01');
    expect(leap.periodEnd).toBe('2024-02-29');

    const nonLeap = resolvePeriodRange('MONTHLY', '2026-02-10');
    expect(nonLeap.periodStart).toBe('2026-02-01');
    expect(nonLeap.periodEnd).toBe('2026-02-28');
  });

  it('accepts Date instances and custom timeZones', () => {
    const date = new Date('2026-06-30T17:00:00.000Z'); // 2026-07-01 00:00+07:00
    const vn = resolvePeriodRange('MONTHLY', date, 'Asia/Ho_Chi_Minh');
    expect(vn.periodStart).toBe('2026-07-01');
    expect(vn.periodEnd).toBe('2026-07-31');

    const utc = resolvePeriodRange('MONTHLY', date, 'UTC');
    expect(utc.periodStart).toBe('2026-06-01');
    expect(utc.periodEnd).toBe('2026-06-30');
    expect(utc.startUtc.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('rejects invalid calendar dates like 2026-13-01 or 2026-02-31 by falling back to a valid range', () => {
    const invalidMonth = resolvePeriodRange('MONTHLY', '2026-13-01');
    expect(invalidMonth.month).toBeGreaterThanOrEqual(1);
    expect(invalidMonth.month).toBeLessThanOrEqual(12);
    expect(invalidMonth.quarter).toBeGreaterThanOrEqual(1);
    expect(invalidMonth.quarter).toBeLessThanOrEqual(4);

    const invalidDay = resolvePeriodRange('MONTHLY', '2026-02-31');
    expect(invalidDay.month).toBeGreaterThanOrEqual(1);
    expect(invalidDay.month).toBeLessThanOrEqual(12);

    const garbage = resolvePeriodRange('MONTHLY', 'not-a-date');
    expect(garbage.month).toBeGreaterThanOrEqual(1);
    expect(garbage.month).toBeLessThanOrEqual(12);
  });

  it('resolveCalendarBounds converts both YYYY-MM-DD and ISO timestamps into UTC+7 bounds', () => {
    const bounds = resolveCalendarBounds(
      '2026-11-01T00:00:00+07:00',
      '2026-11-30',
    );
    expect(bounds.periodStart).toBe('2026-11-01');
    expect(bounds.periodEnd).toBe('2026-11-30');
    expect(bounds.startUtc.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    expect(bounds.endUtc.toISOString()).toBe('2026-11-30T16:59:59.999Z');
  });
});
