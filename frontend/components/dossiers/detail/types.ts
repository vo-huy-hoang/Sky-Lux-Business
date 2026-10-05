import React from 'react';
import { formatCurrency } from '@/lib/financial-calculations';

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
  EDITING: { label: 'Đang sửa', className: 'skylux-status-warning', step: 3 },
  APPROVED: { label: 'Đã duyệt', className: 'skylux-status-valid', step: 4 },
  COMPLETED: { label: 'Hoàn tất', className: 'skylux-status-valid', step: 4 },
  LOCKED: { label: 'Đã khóa', className: 'skylux-status-info', step: 4 },
  REJECTED: { label: 'Từ chối', className: 'skylux-status-danger', step: 2 },
  SUPERSEDED: { label: 'Đã thay thế', className: 'skylux-status-info', step: 4 },
};

export interface WorkflowActionMeta {
  title: string;
  okText: string;
  description: string;
  placeholder: string;
  buttonClass: string;
  timelineLabel: string;
  color: string;
}

/**
 * TICKET-55.3: Bảng cấu hình tập trung cho toàn bộ workflow actions
 * Thay thế triệt để các chuỗi ternary / switch lặp lại ở Modal và Timeline
 */
export const WORKFLOW_ACTION_CONFIG: Record<
  Exclude<DossierWorkflowAction, null>,
  WorkflowActionMeta
> = {
  APPROVE: {
    title: 'Xác nhận phê duyệt hồ sơ tour',
    okText: 'Phê duyệt ngay',
    description: 'Bạn đang phê duyệt hồ sơ tour này. Sau khi duyệt, hồ sơ sẽ chuyển sang trạng thái ĐÃ DUYỆT.',
    placeholder: 'Nhập ghi chú hoặc lời nhắn nội bộ (Tùy chọn)...',
    buttonClass: 'skylux-primary-button',
    timelineLabel: 'Phê duyệt hồ sơ',
    color: 'green',
  },
  REQUEST_CHANGES: {
    title: 'Yêu cầu bổ sung hồ sơ tour',
    okText: 'Gửi yêu cầu bổ sung',
    description: 'Vui lòng nhập chi tiết các thông tin, tài liệu hoặc số liệu dự toán cần bổ sung:',
    placeholder: 'Nhập chi tiết yêu cầu bổ sung (Bắt buộc)...',
    buttonClass: 'bg-amber-600 hover:bg-amber-700',
    timelineLabel: 'Yêu cầu bổ sung',
    color: 'orange',
  },
  LOCK: {
    title: 'Khóa hồ sơ tour',
    okText: 'Xác nhận khóa',
    description: 'Hồ sơ sau khi khóa sẽ không thể chỉnh sửa thêm bất kỳ thông tin nào.',
    placeholder: 'Nhập ghi chú hoặc lời nhắn nội bộ (Tùy chọn)...',
    buttonClass: 'bg-red-600 hover:bg-red-700',
    timelineLabel: 'Khóa hồ sơ',
    color: 'red',
  },
  COMPLETE: {
    title: 'Hoàn tất hồ sơ tour',
    okText: 'Xác nhận hoàn tất',
    description: 'Xác nhận hoàn tất toàn bộ quy trình cho hồ sơ tour này.',
    placeholder: 'Nhập ghi chú hoặc lời nhắn nội bộ (Tùy chọn)...',
    buttonClass: 'skylux-primary-button',
    timelineLabel: 'Hoàn tất hồ sơ',
    color: 'blue',
  },
};

export const TIMELINE_ACTION_LABELS: Record<string, { label: string; color: string }> = {
  APPROVE: { label: 'Phê duyệt hồ sơ', color: 'green' },
  REQUEST_CHANGES: { label: 'Yêu cầu bổ sung', color: 'orange' },
  START_REVIEW: { label: 'Bắt đầu xem xét', color: 'blue' },
  RETURN_TO_OPERATIONS: { label: 'Gửi lại Điều hành', color: 'blue' },
  SUBMIT: { label: 'Gửi duyệt', color: 'blue' },
  RESUBMIT: { label: 'Submit lại', color: 'blue' },
  LOCK: { label: 'Khóa hồ sơ', color: 'red' },
  COMPLETE: { label: 'Hoàn tất hồ sơ', color: 'blue' },
};

export function money(value?: number, currency = 'VND') {
  return formatCurrency(value, currency);
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
