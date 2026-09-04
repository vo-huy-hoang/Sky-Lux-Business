import React from 'react';

export type DossierWorkflowAction = 'APPROVE' | 'REQUEST_CHANGES' | 'LOCK' | 'COMPLETE' | null;

export const estimateStatusMeta: Record<
  string,
  { label: string; className: string; step: number }
> = {
  DRAFT: { label: 'Draft', className: 'skylux-status-info', step: 0 },
  SUBMITTED: { label: 'Đã gửi điều hành', className: 'skylux-status-purple', step: 1 },
  RESUBMITTED: { label: 'Đã gửi lại', className: 'skylux-status-purple', step: 1 },
  IN_REVIEW: { label: 'Đang xem xét', className: 'skylux-status-warning', step: 2 },
  NEED_CHANGES: { label: 'Cần bổ sung', className: 'skylux-status-purple', step: 3 },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', step: 4 },
  COMPLETED: { label: 'Hoàn tất', className: 'skylux-status-valid', step: 4 },
  LOCKED: { label: 'Đã khóa', className: 'skylux-status-info', step: 4 },
  REJECTED: { label: 'Từ chối', className: 'skylux-status-danger', step: 2 },
  SUPERSEDED: { label: 'Đã thay thế', className: 'skylux-status-info', step: 4 },
};

export function money(value?: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function date(value?: string) {
  return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(value)) : '-';
}

export function dateTime(value?: string) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '-';
}
