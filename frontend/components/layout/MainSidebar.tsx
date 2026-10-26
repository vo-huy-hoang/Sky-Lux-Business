'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useUIStore } from '@/lib/stores/ui-store';
import {
  getAccessibleRoutes,
  getActiveMenuKey,
  type UserContext,
} from '@/lib/routes.config';

const { Sider } = Layout;

const BrandLogo = React.memo(function BrandLogo({ collapsed }: { collapsed: boolean }) {
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
});

interface MainSidebarProps {
  userCtx: UserContext;
}

export function MainSidebar({ userCtx }: MainSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());


  // Prefetch only the route the user is about to open. Eagerly prefetching
  // every route makes Next.js compile every page in development on mount.
  const prefetchRoute = useCallback(
    (path: string) => {
      if (prefetchedRoutesRef.current.has(path)) return;
      prefetchedRoutesRef.current.add(path);
      router.prefetch(path);
    },
    [router],
  );

  const menuItems: MenuProps['items'] = useMemo(() => {
    const navigationRoutes = getAccessibleRoutes(userCtx).filter(
      (route) =>
        route.path !== '/messages' &&
        !route.hideFromNavigationRoles?.some((role) => userCtx.roles?.includes(role)),
    );
    return navigationRoutes.map((r) => ({
      key: r.key,
      icon: r.icon,
      label: (
        <span
          onMouseEnter={() => prefetchRoute(r.path)}
          onFocus={() => prefetchRoute(r.path)}
        >
          {typeof r.label === 'function' ? r.label(userCtx) : r.label}
        </span>
      ),
    }));
  }, [prefetchRoute, userCtx]);

  const selectedKey = useMemo(() => {
    return getActiveMenuKey(pathname);
  }, [pathname]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key && key !== pathname) {
      router.push(key);
    }
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <>
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}
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
          className="skylux-side-menu border-r-0 px-3 pb-6 font-semibold"
          style={{ background: 'transparent' }}
        />
      </Sider>
    </>
  );
}

export default MainSidebar;
