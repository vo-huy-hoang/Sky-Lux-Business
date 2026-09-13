'use client';

import React, { useState, useMemo } from 'react';
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
  iconBg: string;
  badgeClass: string;
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
      icon: <CheckCircleFilled className="text-base text-emerald-600" />,
      iconBg: 'bg-emerald-50/80 border border-emerald-100',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
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
      icon: <FileProtectOutlined className="text-base text-sky-600" />,
      iconBg: 'bg-sky-50/80 border border-sky-100',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/70',
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
      icon: <ExclamationCircleFilled className="text-base text-amber-500" />,
      iconBg: 'bg-amber-50/80 border border-amber-100',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70',
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
      icon: <CloseCircleFilled className="text-base text-rose-500" />,
      iconBg: 'bg-rose-50/80 border border-rose-100',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70',
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
      icon: <FolderOpenFilled className="text-base text-teal-600" />,
      iconBg: 'bg-teal-50/80 border border-teal-100',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/70',
    };
  }

  return {
    category: 'Hệ thống',
    icon: <BellFilled className="text-base text-indigo-500" />,
    iconBg: 'bg-indigo-50/80 border border-indigo-100',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  };
}

export function NotificationDrawer() {
  const router = useRouter();
  const open = useUIStore((state) => state.notificationsDrawerOpen);
  const setOpen = useUIStore((state) => state.setNotificationsDrawerOpen);

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

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
      size={440}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, background: '#F8FAF9', display: 'flex', flexDirection: 'column' },
      }}
    >
      {/* Custom Sleek Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 pt-4 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
              <BellOutlined className="text-base" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-slate-800 tracking-tight m-0">
                  Thông báo
                </h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500 text-white shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {unreadCount} mới
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <Tooltip title="Đánh dấu tất cả đã đọc" placement="bottom">
                  <button
                    onClick={() => markAllNotificationsReadMutation.mutate()}
                    disabled={unreadCount === 0 || markAllNotificationsReadMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-600 border border-transparent hover:border-emerald-200/50 cursor-pointer disabled:cursor-not-allowed"
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
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent">
                      <DeleteOutlined className="text-xs" />
                    </button>
                  </Tooltip>
                </Popconfirm>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer border-0 bg-transparent"
              aria-label="Đóng"
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>
        </div>

        {/* Filter Segment Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
              activeFilter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                activeFilter === 'all'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-200/70 text-slate-500'
              }`}
            >
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('unread')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
              activeFilter === 'unread'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Chưa đọc</span>
            {unreadCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                {unreadCount}
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-slate-200/70 text-slate-500">
                0
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center mb-3.5 text-emerald-600 shadow-xs">
              <CheckCircleOutlined className="text-2xl" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              {activeFilter === 'unread'
                ? 'Không có thông báo chưa đọc'
                : 'Bạn đã xem hết thông báo'}
            </h4>
            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed m-0">
              {activeFilter === 'unread'
                ? 'Tuyệt vời! Bạn đã cập nhật mọi thông tin quan trọng trong hệ thống.'
                : 'Khi có thay đổi về tiến trình hồ sơ hoặc phê duyệt, thông báo sẽ hiển thị ở đây.'}
            </p>
            {activeFilter === 'unread' && notifications.length > 0 && (
              <button
                onClick={() => setActiveFilter('all')}
                className="mt-3.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer bg-transparent border-0"
              >
                Xem tất cả ({notifications.length} thông báo) →
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
                className={`group relative overflow-hidden rounded-xl p-3.5 transition-all duration-200 cursor-pointer border ${
                  isUnread
                    ? 'bg-white border-emerald-200/90 shadow-[0_2px_8px_rgba(0,122,85,0.06)] hover:shadow-md hover:border-emerald-300'
                    : 'bg-white/80 border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Subtle Luxury Left Accent for Unread */}
                {isUnread && (
                  <div className="absolute left-0 top-3 bottom-3 w-[3.5px] rounded-r-full bg-emerald-600" />
                )}

                <div className="flex items-start gap-3 pl-1">
                  {/* Category / Status Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${meta.iconBg}`}
                  >
                    {meta.icon}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Title + Category Tag + Unread Dot */}
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-[13px] font-semibold leading-snug line-clamp-1 m-0 ${
                          isUnread
                            ? 'text-slate-900 group-hover:text-emerald-700 transition-colors'
                            : 'text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                        >
                          {meta.category}
                        </span>

                        {isUnread && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Body */}
                    <p
                      className={`text-xs mt-1 mb-2 leading-relaxed line-clamp-2 ${
                        isUnread ? 'text-slate-600' : 'text-slate-500'
                      }`}
                    >
                      {item.message}
                    </p>

                    {/* Footer Row: Timestamp + Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <ClockCircleOutlined className="text-[10px]" />
                        <span>{formatNotificationTime(item.createdAt)}</span>
                      </div>

                      {/* Right Action Area */}
                      <div className="flex items-center gap-1.5">
                        {item.actionUrl && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-700 group-hover:text-emerald-800 transition-colors">
                            <span>Chi tiết</span>
                            <ArrowRightOutlined className="text-[10px] transform group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        )}

                        {/* Quick Action Icons visible on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                          {isUnread && (
                            <Tooltip title="Đánh dấu đã đọc" placement="top">
                              <button
                                onClick={(e) => handleMarkSingleRead(e, item)}
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer border-0 bg-transparent"
                              >
                                <CheckOutlined className="text-[10px]" />
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip title="Xóa" placement="top">
                            <button
                              onClick={(e) => handleDeleteSingle(e, item.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-0 bg-transparent"
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
