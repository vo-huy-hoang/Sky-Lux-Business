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

export const SEGMENT_CONFIGS: Record<BusinessSegmentKey, SegmentConfig> = {
  TOUR: {
    key: 'TOUR',
    label: 'TOUR',
    primaryColor: '#237ACB',
    accentBorder: '#1D70B8',
    bgTint: '#EBF5FE',
    borderColor: '#BFDBFE',
    textColor: '#1E40AF',
  },
  XE_CHO_THUE: {
    key: 'XE_CHO_THUE',
    label: 'XE CHO THUÊ',
    primaryColor: '#FFFF00',
    accentBorder: '#EAB308',
    bgTint: '#FEF9C3',
    borderColor: '#FDE047',
    textColor: '#854D0E',
  },
  VE_LE: {
    key: 'VE_LE',
    label: 'VÉ LẺ',
    primaryColor: '#77E3FF',
    accentBorder: '#0284C7',
    bgTint: '#E0F7FA',
    borderColor: '#7DD3FC',
    textColor: '#0369A1',
  },
  SU_KIEN: {
    key: 'SU_KIEN',
    label: 'SỰ KIỆN',
    primaryColor: '#C189F7',
    accentBorder: '#9333EA',
    bgTint: '#F3E8FF',
    borderColor: '#D8B4FE',
    textColor: '#7E22CE',
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
