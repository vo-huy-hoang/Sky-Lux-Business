'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ShopOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface OperatorQuickRemindersProps {
  overdueTasks: number;
  priorityDossiers: number;
  totalSuppliers: number;
}

export default function OperatorQuickReminders({
  overdueTasks,
  priorityDossiers,
  totalSuppliers,
}: OperatorQuickRemindersProps) {
  return (
    <Card
      className="op-card"
      title={
        <h2 className="text-[15px] font-bold text-slate-900 m-0 leading-normal">
          Nhắc nhở vận hành
        </h2>
      }
    >
      <div className="space-y-4">
        <Link
          href="/tasks"
          className="op-reminder hover:bg-[var(--color-primary-soft)]/60 transition-all cursor-pointer group block"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircleOutlined className="mt-0.5 group-hover:scale-110 transition-transform text-[var(--color-primary-600)]" />
            <div className="min-w-0 flex-1">
              <Text
                strong
                className="group-hover:text-[var(--color-primary-600)] transition-colors"
              >
                Quá hạn công việc
              </Text>
              <Text className="block text-xs text-[var(--op-text-muted)]">
                {overdueTasks} công việc cần đôn đốc hạn xử lý
              </Text>
            </div>
          </div>
        </Link>
        <Link
          href="/dossiers?priority=HIGH"
          className="op-reminder hover:bg-[var(--color-warning-soft)]/70 transition-all cursor-pointer group block"
        >
          <div className="flex items-start gap-2.5">
            <ExclamationCircleOutlined className="mt-0.5 group-hover:scale-110 transition-transform text-[var(--color-warning)]" />
            <div className="min-w-0 flex-1">
              <Text
                strong
                className="group-hover:text-[var(--color-warning)] transition-colors"
              >
                Ưu tiên xử lý
              </Text>
              <Text className="block text-xs text-[var(--op-text-muted)]">
                {priorityDossiers} hồ sơ mức độ ưu tiên cao
              </Text>
            </div>
          </div>
        </Link>
        <Link
          href="/suppliers"
          className="op-reminder hover:bg-[var(--color-info-soft)]/60 transition-all cursor-pointer group block"
        >
          <div className="flex items-start gap-2.5">
            <ShopOutlined className="mt-0.5 group-hover:scale-110 transition-transform text-[var(--color-info)]" />
            <div className="min-w-0 flex-1">
              <Text
                strong
                className="group-hover:text-[var(--color-info)] transition-colors"
              >
                Mạng lưới đối tác
              </Text>
              <Text className="block text-xs text-[var(--op-text-muted)]">
                {totalSuppliers} nhà cung cấp đang sẵn sàng
              </Text>
            </div>
          </div>
        </Link>
      </div>
    </Card>
  );
}
