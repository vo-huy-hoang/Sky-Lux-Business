'use client';

import React from 'react';
import { Skeleton } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { WidgetErrorBoundary } from '@/components/common/widget-error-boundary';
import { SuperAdminDashboard } from '@/components/super-admin/SuperAdminDashboard';
import { OperationalDashboard } from '@/components/dashboard/OperationalDashboard';
import dynamic from 'next/dynamic';

const CeoDashboard = dynamic(() => import('@/components/ceo/CeoDashboard'), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});
const OperatorDashboard = dynamic(() => import('@/components/operator/OperatorDashboard'), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 8 }} />,
});

const subscribe = () => () => {};
const useIsClient = () => React.useSyncExternalStore(subscribe, () => true, () => false);

function RoleDashboard() {
  const isClient = useIsClient();
  const isSuperAdmin = useAuthStore((state) => state.isPlatformSuperAdmin());
  const isCeoAdmin = useAuthStore((state) => state.isCeoAdmin());
  const isOperator = useAuthStore((state) => state.isOperator());

  if (!isClient) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <WidgetErrorBoundary title="Bảng điều khiển Quản trị Hệ thống">
        <SuperAdminDashboard />
      </WidgetErrorBoundary>
    );
  }
  if (isCeoAdmin) {
    return (
      <WidgetErrorBoundary title="Bảng điều khiển Giám đốc">
        <CeoDashboard />
      </WidgetErrorBoundary>
    );
  }
  if (isOperator) {
    return (
      <WidgetErrorBoundary title="Bảng điều khiển Điều hành">
        <OperatorDashboard />
      </WidgetErrorBoundary>
    );
  }
  return (
    <WidgetErrorBoundary title="Bảng điều khiển Kinh doanh">
      <OperationalDashboard />
    </WidgetErrorBoundary>
  );
}

export default RoleDashboard;
