'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { ReloadOutlined } from '@ant-design/icons';

/**
 * Chỉ báo nhẹ (Subtle Connection Indicator) cho Server-Sent Events (SSE)
 * - Khi mất kết nối > 5 giây: hiển thị dot màu vàng cam ở góc màn hình: "Đang tự động kết nối lại dữ liệu thời gian thực..."
 * - Khi kết nối lại thành công: chuyển sang xanh lá "Đã kết nối dữ liệu thời gian thực" và tự động ẩn sau 2 giây.
 * - Khi đạt giới hạn retry thất bại: hiển thị nút "Thử lại ngay".
 */
export function RealtimeConnectionIndicator() {
  const connectionStatus = useUIStore((state) => state.connectionStatus);
  const triggerReconnect = useUIStore((state) => state.triggerReconnect);

  const [indicatorState, setIndicatorState] = useState<
    'hidden' | 'reconnecting' | 'reconnected' | 'reconnect_failed'
  >('hidden');

  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasShowingAlertRef = useRef<boolean>(false);

  useEffect(() => {
    if (connectionStatus === 'reconnecting') {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      // Nếu đang hiển thị reconnect_failed hoặc reconnecting thì giữ nguyên trạng thái reconnecting
      if (wasShowingAlertRef.current) {
        setIndicatorState('reconnecting');
      } else if (!disconnectTimerRef.current) {
        // Đặt hẹn giờ 5 giây trước khi hiển thị chỉ báo nhẹ tránh nhấp nháy giao diện
        disconnectTimerRef.current = setTimeout(() => {
          wasShowingAlertRef.current = true;
          setIndicatorState('reconnecting');
        }, 5000);
      }
    } else if (connectionStatus === 'reconnect_failed') {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      wasShowingAlertRef.current = true;
      setIndicatorState('reconnect_failed');
    } else if (connectionStatus === 'connected') {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }

      // Nếu trước đó người dùng đã thấy thông báo mất kết nối (>5s), chuyển sang xanh lá trong 2s
      if (wasShowingAlertRef.current) {
        wasShowingAlertRef.current = false;
        setIndicatorState('reconnected');

        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
        dismissTimerRef.current = setTimeout(() => {
          setIndicatorState('hidden');
          dismissTimerRef.current = null;
        }, 2000);
      } else {
        setIndicatorState('hidden');
      }
    } else if (connectionStatus === 'offline') {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      wasShowingAlertRef.current = true;
      setIndicatorState('reconnect_failed');
    }

    return () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [connectionStatus]);

  if (indicatorState === 'hidden') {
    return null;
  }

  const isReconnected = indicatorState === 'reconnected';
  const isFailed = indicatorState === 'reconnect_failed';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-medium shadow-xl backdrop-blur-md transition-all duration-300 border"
      style={{
        backgroundColor: isReconnected
          ? 'rgba(16, 185, 129, 0.95)'
          : isFailed
            ? 'rgba(239, 68, 68, 0.95)'
            : 'rgba(245, 158, 11, 0.95)',
        color: '#ffffff',
        borderColor: isReconnected
          ? 'rgba(5, 150, 105, 0.6)'
          : isFailed
            ? 'rgba(185, 28, 28, 0.6)'
            : 'rgba(217, 119, 6, 0.6)',
      }}
    >
      {/* Pulsing or solid dot */}
      <span className="relative flex h-2.5 w-2.5">
        {!isReconnected && !isFailed && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        )}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>

      <span className="tracking-wide">
        {indicatorState === 'reconnecting' &&
          'Đang tự động kết nối lại dữ liệu thời gian thực...'}
        {indicatorState === 'reconnected' &&
          'Đã kết nối dữ liệu thời gian thực'}
        {indicatorState === 'reconnect_failed' &&
          'Mất kết nối thời gian thực'}
      </span>

      {isFailed && (
        <button
          type="button"
          onClick={() => triggerReconnect()}
          className="ml-1 inline-flex items-center gap-1 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5 font-bold text-white transition-colors cursor-pointer"
        >
          <ReloadOutlined className="text-[10px]" /> Thử lại
        </button>
      )}
    </div>
  );
}

export default RealtimeConnectionIndicator;
