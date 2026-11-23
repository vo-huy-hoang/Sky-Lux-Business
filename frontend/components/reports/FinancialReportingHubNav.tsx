'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileTextOutlined,
  BarChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/lib/stores/auth-store';
import { isExecutiveAdmin } from '@/lib/authorization-policy';

export interface ReportingTab {
  key: string;
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  allowedRoles?: string[];
}

export const REPORTING_TABS: ReportingTab[] = [
  {
    key: 'reports',
    path: '/reports',
    label: 'Báo cáo quản trị',
    description: 'Xuất dữ liệu & báo cáo tổng hợp',
    icon: <FileTextOutlined />,
  },
  {
    key: 'revenue',
    path: '/revenue',
    label: 'Doanh thu & Chi phí',
    description: 'Phân tích dòng tiền, doanh số & nhà cung cấp',
    icon: <BarChartOutlined />,
  },
  {
    key: 'kpi',
    path: '/kpi',
    label: 'Chỉ số KPI Sales',
    description: 'Hiệu suất nhân viên & mục tiêu kinh doanh',
    icon: <RiseOutlined />,
    allowedRoles: ['SUPER_ADMIN', 'CEO_ADMIN'],
  },
];

interface FinancialReportingHubNavProps {
  className?: string;
}

export function FinancialReportingHubNav({ className = '' }: FinancialReportingHubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const userRoles = user?.roles || [];

  const visibleTabs = React.useMemo(() => {
    return REPORTING_TABS.filter((tab) => {
      if (!tab.allowedRoles) return true;
      if (isExecutiveAdmin(user)) return true;
      return tab.allowedRoles.some((role) => userRoles.includes(role));
    });
  }, [user, userRoles]);

  const activeTabKey = React.useMemo(() => {
    if (!pathname) return 'reports';
    if (pathname === '/revenue' || pathname.startsWith('/revenue/')) return 'revenue';
    if (pathname === '/kpi' || pathname.startsWith('/kpi/')) return 'kpi';
    return 'reports';
  }, [pathname]);

  const handleTabClick = (path: string) => {
    if (pathname !== path) {
      router.push(path);
    }
  };

  return (
    <div
      data-testid="financial-reporting-hub-nav"
      className={`mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-2 py-1">
        {/* Navigation Tabs Pill Container */}
        <nav
          className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 overflow-x-auto"
          aria-label="Điều hướng Báo cáo & Tài chính"
        >
          {visibleTabs.map((tab) => {
            const isActive = tab.key === activeTabKey;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.path)}
                data-testid={`tab-${tab.key}`}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--color-primary-950)] text-white shadow-xs font-semibold'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Executive Meta Badge */}
        <div className="hidden md:flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-mono pr-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Trung tâm Báo cáo & Tài chính</span>
        </div>
      </div>
    </div>
  );
}

export default FinancialReportingHubNav;
