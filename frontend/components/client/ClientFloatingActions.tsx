'use client';

import React from 'react';
import { Tooltip, message } from 'antd';
import { PhoneOutlined } from '@ant-design/icons';
import { themeTokens } from '@/lib/theme/tokens.config';

export function ClientFloatingActions() {
  const [messageApi, contextHolder] = message.useMessage();

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    messageApi.success('Hotline tư vấn triển khai: 1900 6868 (8:00 - 18:00)');
  };

  const handleZaloClick = (e: React.MouseEvent) => {
    e.preventDefault();
    messageApi.info('Đang kết nối chuyên viên tư vấn OPTRIP qua Zalo OA...');
    window.open('https://zalo.me', '_blank');
  };

  return (
    <>
      {contextHolder}
      <aside aria-label="Kênh hỗ trợ nhanh" className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-center gap-3 select-none">
        {/* Zalo Consultation Floating Button */}
        <Tooltip title="Tư vấn giải pháp qua Zalo OA" placement="left">
          <button
            onClick={handleZaloClick}
            className="w-11.5 h-11.5 sm:w-13 sm:h-13 rounded-full bg-(--color-brand-zalo) text-white flex flex-col items-center justify-center shadow-lg hover:shadow-2xl hover:scale-108 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-pointer"
            aria-label="Tư vấn qua Zalo"
          >
            <span className="font-black text-xs sm:text-[13px] tracking-tight leading-none group-hover:scale-110 transition-transform">
              Zalo
            </span>
          </button>
        </Tooltip>

        {/* Hotline Call Floating Button with Gentle Pulse Ring */}
        <Tooltip title="Hotline tư vấn: 1900 6868" placement="left">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-(--color-primary-600) animate-ping opacity-25 pointer-events-none" />
            <button
              onClick={handlePhoneClick}
              className="relative w-11.5 h-11.5 sm:w-13 sm:h-13 rounded-full text-white flex flex-col items-center justify-center shadow-lg hover:shadow-2xl hover:scale-108 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-pointer"
              style={{ backgroundColor: themeTokens.brand.primary[900] }}
              aria-label="Gọi hotline hỗ trợ"
            >
              <PhoneOutlined className="text-base sm:text-lg group-hover:rotate-12 transition-transform duration-300" />
            </button>
          </div>
        </Tooltip>
      </aside>
    </>
  );
}
