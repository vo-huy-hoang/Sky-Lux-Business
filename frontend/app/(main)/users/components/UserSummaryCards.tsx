'use client';

import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { TeamOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface UserSummaryCardsProps {
  totalUsers: number;
  activeUsers: number;
  salesUsers: number;
  operatorUsers: number;
  ceoAdminUsers: number;
  lockedUsers: number;
  isLoading?: boolean;
}

export default function UserSummaryCards({
  totalUsers,
  activeUsers,
  salesUsers,
  operatorUsers,
  ceoAdminUsers,
  lockedUsers,
  isLoading = false,
}: UserSummaryCardsProps) {
  const metrics = [
    {
      label: 'Tổng người dùng',
      value: totalUsers,
      tone: 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]',
    },
    {
      label: 'Đang hoạt động',
      value: activeUsers,
      tone: 'bg-[var(--ceo-primary-soft)] text-[var(--ceo-primary-600)]',
    },
    {
      label: 'Sales',
      value: salesUsers,
      tone: 'bg-[var(--ceo-info-soft)] text-[var(--ceo-info)]',
    },
    {
      label: 'Điều hành',
      value: operatorUsers,
      tone: 'bg-[var(--ceo-gold-soft)] text-[var(--ceo-gold-strong)]',
    },
    {
      label: 'CEO/Admin',
      value: ceoAdminUsers,
      tone: 'bg-[var(--ceo-purple-soft)] text-[var(--ceo-purple)]',
    },
    {
      label: 'Tài khoản tạm khóa',
      value: lockedUsers,
      tone: 'bg-[var(--ceo-danger-soft)] text-[var(--ceo-danger)]',
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {metrics.map((metric) => (
        <Col xs={24} sm={12} lg={8} xl={4} key={metric.label}>
          <Card className="ceo-card ceo-metric-card h-full">
            <div className="flex items-center gap-3">
              <span className={`ceo-metric-icon ${metric.tone}`}>
                <TeamOutlined />
              </span>
              <div>
                <Text className="text-xs text-[var(--ceo-text-muted)]">
                  {metric.label}
                </Text>
                <div className="text-[25px] font-bold">
                  {isLoading ? '-' : metric.value}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
