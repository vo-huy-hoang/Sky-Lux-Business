'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

const STORAGE_KEY = 'optrip_cookie_consent_v1';

export function ClientCookieConsent() {
  const [visible, setVisible] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Fallback nếu localStorage bị chặn
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'declined');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating Bottom Capsule (Base.vn exact pattern with Double-Bezel) */}
      <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] sm:w-[92%] max-w-4xl z-50 animate-slide-up-center select-none">
        <div className="p-1 rounded-[1.8rem] bg-slate-900/[0.04] ring-1 ring-slate-900/[0.06] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
          <div className="rounded-[calc(1.8rem-0.25rem)] bg-white/95 backdrop-blur-xl p-3.5 sm:p-5 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
            {/* Top-Right Close Button */}
            <button
              onClick={handleDecline}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md cursor-pointer"
              aria-label="Đóng thông báo"
            >
              <CloseOutlined className="text-xs" />
            </button>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 pr-6 lg:pr-0">
              {/* Left Content */}
              <div className="text-left space-y-1 max-w-2xl">
                <h4 className="font-extrabold text-xs sm:text-sm text-(--color-text)">
                  Chúng tôi quan tâm đến sự riêng tư của bạn
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-medium">
                  Chúng tôi sử dụng cookie trên trang web của mình để cung cấp cho bạn trải nghiệm phù hợp nhất bằng cách ghi nhớ các sở thích của bạn và truy cập lặp lại. Bằng cách nhấp vào &ldquo;Tôi đồng ý&rdquo;, bạn đồng ý với việc sử dụng TẤT CẢ các cookie.
                </p>
              </div>

              {/* Right Buttons */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-end lg:self-center">
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="text-xs font-bold text-slate-500 hover:text-(--color-primary-700) hover:underline px-2 py-1 cursor-pointer transition-colors"
                >
                  Cài đặt
                </button>

                <button
                  onClick={handleDecline}
                  className="text-xs font-bold px-3.5 sm:px-4 py-1.5 rounded-full border border-(--color-primary-700) text-(--color-primary-700) hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                >
                  Từ chối
                </button>

                <button
                  onClick={handleAccept}
                  className="text-xs font-bold px-4 sm:px-5 py-1.5 rounded-full text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                  style={{ backgroundColor: themeTokens.brand.primary[900] }}
                >
                  Tôi đồng ý
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        title="Tùy Chọn Quyền Riêng Tư & Cookie"
        open={settingsModalOpen}
        onOk={() => {
          handleAccept();
          setSettingsModalOpen(false);
        }}
        onCancel={() => setSettingsModalOpen(false)}
        okText="Lưu cài đặt"
        cancelText="Đóng"
        okButtonProps={{
          style: {
            backgroundColor: themeTokens.brand.primary[900],
            borderColor: themeTokens.brand.primary[900],
          },
        }}
      >
        <div className="py-3 space-y-3 text-xs text-slate-600 font-medium">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-slate-800 font-bold">Cookie Xác Thực Phiên Làm Việc (Bắt buộc)</strong>
              <span className="text-[10px] font-black text-(--color-success) bg-emerald-50 px-2 py-0.5 rounded">
                LUÔN BẬT
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Cần thiết để duy trì phiên làm việc bảo mật JWT, bảo vệ chống tấn công CSRF và quản lý quyền truy cập.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-slate-800 font-bold">Cookie Tùy Chọn Giao Diện Báo Cáo</strong>
              <span className="text-[10px] font-black text-(--color-info) bg-sky-50 px-2 py-0.5 rounded">
                HOẠT ĐỘNG
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Ghi nhớ bộ lọc tìm kiếm hồ sơ tour, tỷ giá ngoại tệ hiển thị mặc định và phân trang bảng tính.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
