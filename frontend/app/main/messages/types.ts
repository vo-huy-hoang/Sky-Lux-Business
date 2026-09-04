export function formatMessageTime(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', color: 'default' },
  SUBMITTED: { label: 'Đã gửi duyệt', color: 'purple' },
  IN_REVIEW: { label: 'Đang xử lý', color: 'warning' },
  APPROVED: { label: 'Đã duyệt', color: 'success' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
  NEED_CHANGES: { label: 'Cần bổ sung', color: 'processing' },
};
