'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Drawer, List, Typography, Empty, Tag, Button, Space } from 'antd';
import { useUIStore } from '@/lib/stores/ui-store';
import { useNotificationStore } from '@/lib/stores/notification-store';
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/hooks/useNotificationsRealtime';

export function NotificationDrawer() {
  const router = useRouter();
  const open = useUIStore((state) => state.notificationsDrawerOpen);
  const setOpen = useUIStore((state) => state.setNotificationsDrawerOpen);

  const notifications = useNotificationStore((state) => state.notifications);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const serverUnreadCount = useNotificationStore((state) => state.serverUnreadCount);

  const markNotificationReadMutation = useMarkNotificationReadMutation();
  const markAllNotificationsReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount =
    serverUnreadCount !== null
      ? serverUnreadCount
      : notifications.filter((n) => !n.read).length;

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Thông báo ({unreadCount} chưa đọc)</span>
          {notifications.length > 0 && (
            <Space size={8}>
              <Button
                size="small"
                type="link"
                onClick={() => markAllNotificationsReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllNotificationsReadMutation.isPending}
                className="text-xs"
              >
                Đọc tất cả
              </Button>
              <Button
                size="small"
                type="text"
                danger
                onClick={clearAll}
                className="text-xs"
              >
                Xóa hết
              </Button>
            </Space>
          )}
        </div>
      }
      placement="right"
      onClose={() => setOpen(false)}
      open={open}
      size="default"
    >
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Không có thông báo mới"
          className="py-12"
        />
      ) : (
        <List
          itemLayout="vertical"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              onClick={() => {
                if (!item.read) {
                  markNotificationReadMutation.mutate(item.id);
                }
                if (item.actionUrl) {
                  router.push(item.actionUrl);
                  setOpen(false);
                }
              }}
              className={`cursor-pointer rounded-lg p-3 transition-colors mb-2 ${
                item.read
                  ? 'bg-slate-50 hover:bg-slate-100 opacity-75'
                  : 'bg-emerald-50/50 hover:bg-emerald-50 border-l-4 border-[#007A55]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <Typography.Text strong className="text-sm text-slate-800">
                  {item.title}
                </Typography.Text>
                <Tag
                  color={
                    item.type === 'success'
                      ? 'success'
                      : item.type === 'warning'
                      ? 'warning'
                      : item.type === 'error'
                      ? 'error'
                      : 'processing'
                  }
                  className="m-0 text-[10px]"
                >
                  {item.type.toUpperCase()}
                </Tag>
              </div>
              <Typography.Paragraph className="text-xs text-slate-600 mb-1 mt-1">
                {item.message}
              </Typography.Paragraph>
              <span className="text-[11px] text-slate-400">
                {item.createdAt && !isNaN(new Date(item.createdAt).getTime())
                  ? new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })
                  : ''}
              </span>
            </List.Item>
          )}
        />
      )}
    </Drawer>
  );
}

export default NotificationDrawer;
