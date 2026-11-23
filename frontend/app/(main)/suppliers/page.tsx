'use client';

import React from 'react';
import { Segmented } from 'antd';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { SupplierManagementContent } from './components/SupplierManagementContent';

export default function SuppliersPage() {
  const router = useRouter();
  const isCeoAdmin = useAuthStore((state) => state.isExecutiveAdmin());

  return (
    <div className={isCeoAdmin ? 'space-y-5' : ''} style={isCeoAdmin ? undefined : { padding: '24px' }}>
      {isCeoAdmin && (
        <Segmented
          block
          value="suppliers"
          onChange={(value) => value === 'customers' && router.push('/customers')}
          options={[{ label: 'Khách hàng', value: 'customers' }, { label: 'Nhà cung cấp', value: 'suppliers' }]}
          className="max-w-[420px]"
        />
      )}
      <SupplierManagementContent />
    </div>
  );
}
