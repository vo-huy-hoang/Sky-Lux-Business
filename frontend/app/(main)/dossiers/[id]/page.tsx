'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Result, Button, Skeleton } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';

const DossierDetailView = dynamic(
  () => import('@/components/dossiers/DossierDetailView'),
  {
    loading: () => (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    ),
    ssr: false,
  },
);

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');
  const isSales = hasRole('SALES');
  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');
  const canAccess = isOperator || isSales || isCeoAdmin;

  useEffect(() => {
    if (user && !canAccess) {
      router.replace('/dossiers');
    }
  }, [user, canAccess, router]);

  if (!user) {
    return (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Bạn không có quyền truy cập trang chi tiết hồ sơ tour này."
          extra={
            <Button
              type="primary"
              onClick={() => router.replace('/dossiers')}
              className="skylux-primary-button"
            >
              Quay lại danh sách hồ sơ
            </Button>
          }
        />
      </div>
    );
  }

  return <DossierDetailView dossierId={params.id} isDrawer={false} />;
}
