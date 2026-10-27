'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer, Tooltip, Popconfirm } from 'antd';
import {
  BellOutlined,
  BellFilled,
  CheckOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  DeleteOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  FileProtectOutlined,
  FolderOpenFilled,
  ExclamationCircleFilled,
  CloseCircleFilled,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/lib/stores/ui-store';
import { useNotificationStore, AppNotification } from '@/lib/stores/notification-store';
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/hooks/useNotificationsRealtime';
import { themeTokens } from '@/lib/theme/tokens.config';

function formatNotificationTime(createdAt?: string): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return `Hôm nay ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1 || (diffHours < 48 && now.getDate() - date.getDate() === 1)) {
    return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
}

interface NotificationMeta {
  category: string;
  icon: React.ReactNode;
  statusClass: string;
}

function getNotificationMeta(item: AppNotification): NotificationMeta {
  const title = (item.title || '').toLowerCase();
  const message = (item.message || '').toLowerCase();
  const type = item.type;

  if (
    type === 'success' ||
    title.includes('hoàn thành') ||
    message.includes('hoàn thành') ||
    title.includes('phê duyệt') ||
    message.includes('phê duyệt') ||
    title.includes('thành công')
  ) {
    return {
      category: title.includes('hoàn thành') ? 'Hoàn thành' : 'Đã duyệt',
      icon: <CheckCircleOutlined className="text-sm" />,
      statusClass: 'skylux-status-valid',
    };
  }

  if (
    title.includes('thẩm định') ||
    message.includes('thẩm định') ||
    title.includes('tiếp nhận') ||
    message.includes('tiếp nhận') ||
    title.includes('xét duyệt') ||
    message.includes('xét duyệt')
  ) {
    return {
      category: 'Thẩm định',
      icon: <FileProtectOutlined className="text-sm" />,
      statusClass: 'skylux-status-info',
    };
  }

  if (
    type === 'warning' ||
    title.includes('yêu cầu sửa') ||
    message.includes('yêu cầu sửa') ||
    title.includes('cảnh báo') ||
    message.includes('cảnh báo') ||
    title.includes('lưu ý')
  ) {
    return {
      category: 'Cần chú ý',
      icon: <ExclamationCircleFilled className="text-sm" />,
      statusClass: 'skylux-status-warning',
    };
  }

  if (
    type === 'error' ||
    title.includes('từ chối') ||
    message.includes('từ chối') ||
    title.includes('hủy') ||
    message.includes('hủy') ||
    title.includes('thất bại') ||
    message.includes('thất bại')
  ) {
    return {
      category: 'Từ chối',
      icon: <CloseCircleFilled className="text-sm" />,
      statusClass: 'skylux-status-danger',
    };
  }

  if (
    title.includes('hồ sơ') ||
    title.includes('dos-') ||
    title.includes('imp-') ||
    title.includes('nhập')
  ) {
    return {
      category: 'Hồ sơ',
      icon: <FolderOpenFilled className="text-sm" />,
      statusClass: 'skylux-status-purple',
    };
  }

  return {
    category: 'Hệ thống',
    icon: <BellOutlined className="text-sm" />,
    statusClass: 'skylux-status-info',
  };
}

export function NotificationDrawer() {
  const router = useRouter();
  const open = useUIStore((state) => state.notificationsDrawerOpen);
  const setOpen = useUIStore((state) => state.setNotificationsDrawerOpen);

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 480);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const notifications = useNotificationStore((state) => state.notifications);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const serverUnreadCount = useNotificationStore((state) => state.serverUnreadCount);

  const markNotificationReadMutation = useMarkNotificationReadMutation();
  const markAllNotificationsReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount =
    serverUnreadCount !== null
      ? serverUnreadCount
      : notifications.filter((n) => !n.read).length;

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleCardClick = (item: AppNotification) => {
    if (!item.read) {
      markNotificationReadMutation.mutate(item.id);
    }
    if (item.actionUrl) {
      router.push(item.actionUrl);
      setOpen(false);
    }
  };

  const handleMarkSingleRead = (e: React.MouseEvent, item: AppNotification) => {
    e.stopPropagation();
    if (!item.read) {
      markNotificationReadMutation.mutate(item.id);
    }
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeNotification(id);
  };

  return (
    <Drawer
      closable={false}
      placement="right"
      onClose={() => setOpen(false)}
      open={open}
      size={isMobile ? '100%' : 440}
      className="max-w-full"
      styles={{
        header: { display: 'none' },
        body: { padding: 0, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Luxury Corporate Header synchronized with globals.css tokens */}
      <div
        className="sticky top-0 z-10 px-5 pt-4 pb-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h3
                className="text-base font-bold tracking-tight m-0"
                style={{ color: 'var(--color-text)' }}
              >
                Thông báo
              </h3>
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{
                    background: 'var(--color-primary-soft)',
                    color: 'var(--color-primary-800)',
                    border: '1px solid var(--color-primary-soft-2)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-gold-strong)' }}
                  />
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p
              className="text-xs m-0 mt-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Tiến trình hồ sơ và cập nhật phê duyệt
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 pt-0.5">
            {notifications.length > 0 && (
              <>
                <Tooltip title="Đánh dấu tất cả đã đọc" placement="bottom">
                  <button
                    type="button"
                    onClick={() => markAllNotificationsReadMutation.mutate()}
                    disabled={unreadCount === 0 || markAllNotificationsReadMutation.isPending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-transparent"
                    style={{
                      color: 'var(--color-primary-700)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (unreadCount > 0) {
                        e.currentTarget.style.background = 'var(--color-primary-soft)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <CheckOutlined className="text-xs" />
                    <span className="hidden sm:inline">Đọc tất cả</span>
                  </button>
                </Tooltip>

                <Popconfirm
                  title="Xóa tất cả thông báo?"
                  description="Bạn có chắc chắn muốn làm sạch toàn bộ danh sách thông báo?"
                  onConfirm={clearAll}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, size: 'small' }}
                  cancelButtonProps={{ size: 'small' }}
                  placement="bottomRight"
                >
                  <Tooltip title="Xóa tất cả" placement="bottom">
                    <button
                      type="button"
                      className="w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent hover:bg-rose-50 hover:text-rose-600 text-slate-400"
                      aria-label="Xóa tất cả"
                    >
                      <DeleteOutlined className="text-sm" />
                    </button>
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer border-0 bg-transparent"
              aria-label="Đóng"
            >
              <CloseOutlined className="text-sm" />
            </button>
          </div>
        </div>

        {/* Minimalist Corporate Underline Tabs */}
        <div className="flex items-center gap-6 mt-3">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="relative pb-2.5 text-xs font-semibold transition-all cursor-pointer border-0 bg-transparent flex items-center gap-2"
            style={{
              color: activeFilter === 'all' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
            }}
          >
            <span>Tất cả</span>
            <span
              className="text-[11px] px-1.5 py-0.2 rounded-full font-medium"
              style={{
                background: activeFilter === 'all' ? 'var(--color-primary-soft)' : 'var(--color-divider)',
                color: activeFilter === 'all' ? 'var(--color-primary-800)' : 'var(--color-text-soft)',
              }}
            >
              {notifications.length}
            </span>
            {activeFilter === 'all' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"
                style={{ background: 'var(--color-primary-700)' }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className="relative pb-2.5 text-xs font-semibold transition-all cursor-pointer border-0 bg-transparent flex items-center gap-2"
            style={{
              color: activeFilter === 'unread' ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
            }}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 ? (
              <span
                className="text-[11px] px-1.5 py-0.2 rounded-full font-semibold"
                style={{
                  background: 'var(--color-gold-soft)',
                  color: 'var(--color-gold-strong)',
                  border: '1px solid var(--color-gold-border)',
                }}
              >
                {unreadCount}
              </span>
            ) : (
              <span
                className="text-[11px] px-1.5 py-0.2 rounded-full font-medium"
                style={{
                  background: 'var(--color-divider)',
                  color: 'var(--color-text-soft)',
                }}
              >
                0
              </span>
            )}
            {activeFilter === 'unread' && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"
                style={{ background: 'var(--color-primary-700)' }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3.5 text-lg shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
              }}
            >
              {activeFilter === 'unread' ? (
                <CheckCircleOutlined style={{ color: 'var(--color-primary-700)' }} />
              ) : (
                <BellOutlined style={{ color: 'var(--color-text-soft)' }} />
              )}
            </div>
            <h4
              className="text-sm font-bold mb-1"
              style={{ color: 'var(--color-text)' }}
            >
              {activeFilter === 'unread'
                ? 'Không có thông báo chưa đọc'
                : 'Bạn đã xem hết thông báo'}
            </h4>
            <p
              className="text-xs max-w-[240px] leading-relaxed m-0"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {activeFilter === 'unread'
                ? 'Tuyệt vời! Bạn đã cập nhật mọi thông tin quan trọng trong hệ thống.'
                : 'Khi có thay đổi về tiến trình hồ sơ hoặc phê duyệt, thông báo sẽ hiển thị ở đây.'}
            </p>
            {activeFilter === 'unread' && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="mt-4 text-xs font-semibold cursor-pointer bg-transparent border-0 flex items-center gap-1 mx-auto hover:underline"
                style={{ color: 'var(--color-primary-700)' }}
              >
                <span>Xem tất cả ({notifications.length} thông báo)</span>
                <ArrowRightOutlined className="text-[10px]" />
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const meta = getNotificationMeta(item);
            const isUnread = !item.read;

            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className="group relative rounded-xl p-3.5 transition-all duration-200 cursor-pointer border"
                style={{
                  background: isUnread ? themeTokens.neutral.surface : 'var(--color-surface)',
                  borderColor: isUnread ? 'var(--color-primary-soft-2)' : 'var(--color-border)',
                  boxShadow: isUnread
                    ? '0 2px 8px rgba(0, 56, 42, 0.05)'
                    : '0 1px 2px rgba(0, 0, 0, 0.02)',
                }}
              >
                {/* Subtle Luxury Left Accent for Unread: Gold Indicator */}
                {isUnread && (
                  <div
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                    style={{ background: 'var(--color-gold-strong)' }}
                  />
                )}

                <div className="flex items-start gap-3 pl-1">
                  {/* Status Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm mt-0.5 transition-colors"
                    style={{
                      background: isUnread ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                      color: isUnread ? 'var(--color-primary-700)' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {meta.icon}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Title + Category Tag + Unread Dot */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUnread && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: 'var(--color-gold-strong)' }}
                            title="Chưa đọc"
                          />
                        )}
                        <h4
                          className="text-[13px] font-semibold leading-snug line-clamp-1 m-0 transition-colors"
                          style={{
                            color: isUnread ? 'var(--color-text)' : 'var(--color-text-muted)',
                          }}
                        >
                          {item.title}
                        </h4>
                      </div>

                      {/* Tag using system status class from globals.css */}
                      <span
                        className={`ant-tag ${meta.statusClass} shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full`}
                        style={{ margin: 0, height: 'auto', lineHeight: '18px' }}
                      >
                        {meta.category}
                      </span>
                    </div>

                    {/* Message Body */}
                    <p
                      className="text-xs mt-1 mb-2 leading-relaxed line-clamp-2"
                      style={{
                        color: isUnread ? 'var(--color-text)' : 'var(--color-text-muted)',
                        opacity: isUnread ? 0.9 : 0.75,
                      }}
                    >
                      {item.message}
                    </p>

                    {/* Footer Row: Timestamp + Actions */}
                    <div
                      className="flex items-center justify-between pt-1.5 text-[11px]"
                      style={{
                        borderTop: '1px solid var(--color-divider)',
                        color: 'var(--color-text-soft)',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <ClockCircleOutlined className="text-[10px]" />
                        <span>{formatNotificationTime(item.createdAt)}</span>
                      </div>

                      {/* Right Action Area */}
                      <div className="flex items-center gap-1.5">
                        {item.actionUrl && (
                          <span
                            className="inline-flex items-center gap-0.5 text-xs font-semibold transition-colors"
                            style={{ color: 'var(--color-primary-700)' }}
                          >
                            <span>Chi tiết</span>
                            <ArrowRightOutlined className="text-[10px] transform group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}

                        {/* Quick Action Icons visible on mobile or desktop hover */}
                        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1.5">
                          {isUnread && (
                            <Tooltip title="Đánh dấu đã đọc" placement="top">
                              <button
                                type="button"
                                onClick={(e) => handleMarkSingleRead(e, item)}
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent hover:bg-[var(--color-primary-soft)]"
                                style={{ color: 'var(--color-primary-700)' }}
                                aria-label="Đánh dấu đã đọc"
                              >
                                <CheckOutlined className="text-[10px]" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip title="Xóa" placement="top">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSingle(e, item.id)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
                              aria-label="Xóa"
                            >
                              <DeleteOutlined className="text-[10px]" />
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
}

export default NotificationDrawer;
