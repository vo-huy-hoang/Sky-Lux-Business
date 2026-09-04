'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Result, Button, Skeleton } from 'antd';
import DossierDetailView from '@/components/dossiers/DossierDetailView';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);
  const isOperator = hasRole('OPERATOR');
  const isCeoAdmin = hasRole('CEO_ADMIN') || hasRole('SUPER_ADMIN');

  useEffect(() => {
    if (user && !isOperator && !isCeoAdmin) {
      router.replace('/main/dossiers');
    }
  }, [user, isOperator, isCeoAdmin, router]);

  if (!user) {
    return (
      <div className="p-6">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  if (!isOperator && !isCeoAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Result
          status="403"
          title="Không có quyền truy cập"
          subTitle="Trang thẩm định chi tiết hồ sơ tour này chỉ dành cho Bộ phận Điều hành (Operator) và Ban Giám Đốc (CEO). Nhân viên kinh doanh vui lòng theo dõi hồ sơ tại danh sách 'Hồ sơ của tôi'."
          extra={
            <Button
              type="primary"
              onClick={() => router.replace('/main/dossiers')}
              className="skylux-primary-button"
            >
              Quay lại Hồ sơ của tôi
            </Button>
          }
        />
      </div>
    );
  }

  return <DossierDetailView dossierId={params.id} isDrawer={false} />;
}
