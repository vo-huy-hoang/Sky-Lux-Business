'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumb, Button, Space, Tag } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons';

export interface DossierHeaderProps {
  dossier: any;
  isDrawer?: boolean;
  isOperator?: boolean;
  isCeoAdmin?: boolean;
}

export function DossierHeader({
  dossier,
  isDrawer = false,
  isOperator = false,
  isCeoAdmin = false,
}: DossierHeaderProps) {
  if (isDrawer) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-lg font-bold text-slate-900">
            {dossier?.name || 'Chi tiết hồ sơ tour'}
          </h3>
          {dossier && <Tag color="blue">{dossier.code}</Tag>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Breadcrumb
          items={[
            {
              title: (
                <Link href="/main/dossiers" suppressHydrationWarning>
                  <span suppressHydrationWarning>
                    {isOperator
                      ? 'Hồ sơ chờ xử lý'
                      : isCeoAdmin
                      ? 'Hồ sơ toàn hệ thống'
                      : 'Hồ sơ của tôi'}
                  </span>
                </Link>
              ),
            },
            { title: dossier?.code || 'Đang tải' },
            { title: 'Chi tiết hồ sơ' },
          ]}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="m-0 text-[25px] font-bold">
            Chi tiết hồ sơ - {dossier?.code || '...'}
          </h2>
          {dossier && <Tag>{dossier.code}</Tag>}
        </div>
      </div>
      <Space>
        <Link href="/main/dossiers">
          <Button icon={<ArrowLeftOutlined />}>Quay lại danh sách</Button>
        </Link>
        <Button icon={<FilePdfOutlined />} disabled title="Chưa có API xuất PDF">
          Xuất PDF
        </Button>
      </Space>
    </div>
  );
}
