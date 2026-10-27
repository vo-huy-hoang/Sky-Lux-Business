import { Dayjs } from 'dayjs';
import { DossierItem } from '@/types/dossier';

export type BusinessSegmentKey = 'TOUR' | 'XE_CHO_THUE' | 'VE_LE' | 'SU_KIEN';

export interface SegmentConfig {
  key: BusinessSegmentKey;
  label: string;
  primaryColor: string;
  accentBorder: string;
  bgTint: string;
  borderColor: string;
  textColor: string;
}

import { themeTokens } from '@/lib/theme/tokens.config';

export const SEGMENT_CONFIGS: Record<BusinessSegmentKey, SegmentConfig> = {
  TOUR: {
    key: 'TOUR',
    label: themeTokens.segments.tour.label,
    primaryColor: themeTokens.segments.tour.primary,
    accentBorder: themeTokens.segments.tour.accent,
    bgTint: themeTokens.segments.tour.bg,
    borderColor: themeTokens.segments.tour.border,
    textColor: themeTokens.segments.tour.text,
  },
  XE_CHO_THUE: {
    key: 'XE_CHO_THUE',
    label: themeTokens.segments.vehicle.label,
    primaryColor: themeTokens.segments.vehicle.primary,
    accentBorder: themeTokens.segments.vehicle.accent,
    bgTint: themeTokens.segments.vehicle.bg,
    borderColor: themeTokens.segments.vehicle.border,
    textColor: themeTokens.segments.vehicle.text,
  },
  VE_LE: {
    key: 'VE_LE',
    label: themeTokens.segments.ticket.label,
    primaryColor: themeTokens.segments.ticket.primary,
    accentBorder: themeTokens.segments.ticket.accent,
    bgTint: themeTokens.segments.ticket.bg,
    borderColor: themeTokens.segments.ticket.border,
    textColor: themeTokens.segments.ticket.text,
  },
  SU_KIEN: {
    key: 'SU_KIEN',
    label: themeTokens.segments.event.label,
    primaryColor: themeTokens.segments.event.primary,
    accentBorder: themeTokens.segments.event.accent,
    bgTint: themeTokens.segments.event.bg,
    borderColor: themeTokens.segments.event.border,
    textColor: themeTokens.segments.event.text,
  },
};

export function resolveSegment(dossier: DossierItem): SegmentConfig {
  const blName = (dossier.businessLineName || '').toUpperCase();
  const dName = (dossier.name || '').toUpperCase();
  const dRoute = (dossier.route || '').toUpperCase();
  const combined = `${blName} ${dName} ${dRoute}`;

  if (
    combined.includes('XE') ||
    combined.includes('CAR') ||
    combined.includes('THUÊ XE') ||
    combined.includes('RENTAL')
  ) {
    return SEGMENT_CONFIGS.XE_CHO_THUE;
  }
  if (
    combined.includes('VÉ') ||
    combined.includes('TICKET') ||
    combined.includes('VISA')
  ) {
    return SEGMENT_CONFIGS.VE_LE;
  }
  if (
    combined.includes('SỰ KIỆN') ||
    combined.includes('EVENT') ||
    combined.includes('MICE') ||
    combined.includes('HỘI NGHỊ')
  ) {
    return SEGMENT_CONFIGS.SU_KIEN;
  }
  return SEGMENT_CONFIGS.TOUR;
}

export type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';

export interface CalendarDay {
  date: Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
}

export interface WeekRow {
  days: CalendarDay[];
  startOfWeek: Dayjs;
  endOfWeek: Dayjs;
}

export interface WeekEventSpan {
  dossier: DossierItem;
  segment: SegmentConfig;
  customerName: string;
  startIndex: number;
  endIndex: number;
  span: number;
  isStartOfEvent: boolean;
  isEndOfEvent: boolean;
  lane: number;
}

export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
