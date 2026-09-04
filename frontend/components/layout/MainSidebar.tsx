'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { useUIStore } from '@/lib/stores/ui-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  getAccessibleRoutes,
  getActiveMenuKey,
  type UserContext,
} from '@/lib/routes.config';

const { Sider } = Layout;

function BrandLogo({ collapsed }: { collapsed: boolean }) {
  const [failed, setFailed] = useState(false);

  if (collapsed) {
    return (
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#D6A51F]/70 text-sm font-bold text-[#F0C020]">
        SL
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {!failed ? (
        <Image
          src="/logo/logo.png"
          alt="SkyLux Travel"
          width={180}
          height={180}
          className="h-[154px] w-[154px] object-contain"
          onError={() => setFailed(true)}
          priority
          unoptimized
        />
      ) : (
        <div className="flex h-[116px] w-[138px] items-center justify-center rounded-full border border-[#D6A51F]/70 text-center text-[#F0C020]">
          <div>
            <div className="text-xl font-bold leading-none">SKYLUX</div>
            <div className="mt-1 text-[10px] font-semibold">TRAVEL</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MainSidebarProps {
  userCtx: UserContext;
}

export function MainSidebar({ userCtx }: MainSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  const { isCeoAdmin, isOperator } = userCtx;

  // Prefetch accessible routes for 0ms transitions
  useEffect(() => {
    const accessibleRoutes = getAccessibleRoutes(userCtx);
    accessibleRoutes.forEach((r) => {
      router.prefetch(r.path);
    });
  }, [userCtx, router]);

  const menuItems: MenuProps['items'] = useMemo(() => {
    const accessibleRoutes = getAccessibleRoutes(userCtx);
    return accessibleRoutes.map((r) => ({
      key: r.key,
      icon: r.icon,
      label: typeof r.label === 'function' ? r.label(userCtx) : r.label,
    }));
  }, [userCtx]);

  const selectedKey = useMemo(() => {
    return getActiveMenuKey(pathname);
  }, [pathname]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key && key !== pathname) {
      router.push(key);
    }
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={238}
      collapsedWidth={isMobile ? 0 : 72}
      breakpoint="lg"
      onBreakpoint={(broken) => {
        setIsMobile(broken);
        setSidebarCollapsed(broken);
      }}
      theme="dark"
      className="skylux-sidebar"
      style={{
        overflow: 'auto',
        height: '100dvh',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        zIndex: isMobile ? 40 : undefined,
        backgroundColor: '#004533',
      }}
    >
      <div className="px-4 pb-6 pt-5">
        <BrandLogo collapsed={collapsed} />
      </div>

      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={handleMenuClick}
        className="skylux-side-menu border-r-0 px-3 font-semibold"
        style={{ background: 'transparent' }}
      />

      <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
        <div className="skylux-sidebar-support px-4 py-4 text-[#D3A11B]">
          {isCeoAdmin ? (
            !collapsed && (
              <div>
                <div className="text-xs font-medium text-white/75">Gói hệ thống</div>
                <div className="mt-1 text-sm font-semibold text-white">Chưa có dữ liệu gói từ API</div>
                <div className="mt-3 border-t border-white/10 pt-3 text-xs font-semibold text-[#E8C85D]">
                  Quản lý gói & thanh toán
                </div>
              </div>
            )
          ) : isOperator ? (
            !collapsed && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Lộ trình phát triển
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/75">
                  <span>Giai đoạn hiện tại</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
                    Chờ API
                  </span>
                </div>
                <div className="mt-3 h-1 rounded-full bg-white/15">
                  <div className="h-full w-[18%] rounded-full bg-[#E8C85D]" />
                </div>
                <div className="mt-2 text-xs font-medium text-[#E8C85D]">
                  Sắp tới: Phase 3–4 <span className="float-right">›</span>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center gap-3">
              <CustomerServiceOutlined className="text-lg text-white" />
              {!collapsed && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    Hỗ trợ & hướng dẫn
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">Gọi trợ giúp nội bộ</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sider>
  );
}

export default MainSidebar;
