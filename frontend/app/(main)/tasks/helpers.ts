import { TaskItem, TaskPriority, TaskStatus } from '@/types/task';

export type TimeRange = 'TODAY' | 'WEEK' | 'ALL';

export const statusMeta: Record<
  TaskStatus,
  { label: string; dotClass: string; tagClass: string }
> = {
  TODO: {
    label: 'Cần làm',
    dotClass: 'bg-[var(--color-primary-600)]',
    tagClass: 'skylux-status-info',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    dotClass: 'bg-[var(--color-gold)]',
    tagClass: 'skylux-status-warning',
  },
  WAITING: {
    label: 'Chờ phản hồi',
    dotClass: 'bg-[var(--color-warning)]',
    tagClass: 'skylux-status-warning',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    dotClass: 'bg-[var(--color-success)]',
    tagClass: 'skylux-status-valid',
  },
  CANCELLED: {
    label: 'Đã hủy',
    dotClass: 'bg-[var(--color-danger)]',
    tagClass: 'skylux-status-danger',
  },
};

export const priorityMeta: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  LOW: { label: 'Thấp', color: 'text-[var(--color-primary-600)]' },
  MEDIUM: { label: 'Trung bình', color: 'text-[var(--color-warning)]' },
  HIGH: { label: 'Cao', color: 'text-[var(--color-danger)]' },
  URGENT: { label: 'Khẩn cấp', color: 'text-[var(--color-danger)]' },
};

export const boardColumns: Array<{ status: TaskStatus; title: string }> = [
  { status: 'TODO', title: 'Cần làm' },
  { status: 'IN_PROGRESS', title: 'Đang xử lý' },
  { status: 'COMPLETED', title: 'Hoàn thành' },
];

export function isSameDay(value: string | undefined, compared = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === compared.getFullYear() &&
    date.getMonth() === compared.getMonth() &&
    date.getDate() === compared.getDate()
  );
}

export function isInLastSevenDays(value?: string) {
  if (!value) return false;
  const date = new Date(value).getTime();
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - 7);
  return date >= earliest.getTime() && date <= Date.now();
}

export function formatDateTime(value?: string) {
  if (!value) return 'Chưa đặt hạn';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(value?: string) {
  if (!value) return 'Chưa đặt hạn';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function getDossierLabel(task: TaskItem) {
  const code = task.dossier?.code;
  const customer = task.dossier?.customer?.displayName || task.dossier?.name;
  if (code && customer) return `Hồ sơ: ${code} - ${customer}`;
  if (code) return `Hồ sơ: ${code}`;
  if (task.dossierId) return 'Đã gắn hồ sơ liên quan';
  return 'Chưa gắn hồ sơ';
}

export function getBoardStatus(status: TaskStatus) {
  if (status === 'WAITING') return 'IN_PROGRESS';
  if (status === 'CANCELLED') return 'TODO';
  return status;
}
