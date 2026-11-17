'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Col,
  Result,
  Row,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  FileAddOutlined,
  UnorderedListOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  ConfirmImportResponse,
  CreatedDossierMetadata,
  ImportSession,
} from '@/types/import';

const { Text, Title } = Typography;

export interface ImportConfirmedResultProps {
  session?: ImportSession;
  confirmedResult?: ConfirmImportResponse | null;
  onResetSession: () => void;
}

export function ImportConfirmedResult({
  session,
  confirmedResult,
  onResetSession,
}: ImportConfirmedResultProps) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      // Safe fallback if clipboard permission is denied
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const createdDossiers: CreatedDossierMetadata[] =
    confirmedResult?.createdDossiers || [];
  const importedCount =
    confirmedResult?.importedRowsCount ?? session?.validRows ?? 0;

  const formatCurrency = (amount?: number) => {
    return `${(amount || 0).toLocaleString('vi-VN')} ₫`;
  };

  const columns = [
    {
      title: 'Mã hồ sơ',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: CreatedDossierMetadata) => (
        <Space orientation="horizontal" size="small">
          <Text strong className="font-mono text-slate-800">
            {code}
          </Text>
          <Tooltip
            title={copiedCode === code ? 'Đã sao chép!' : 'Sao chép mã'}
          >
            <Button
              size="small"
              type="text"
              icon={
                copiedCode === code ? (
                  <CheckCircleOutlined className="text-emerald-500" />
                ) : (
                  <CopyOutlined />
                )
              }
              onClick={() => handleCopyCode(code)}
              aria-label={`Sao chép mã ${code}`}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name?: string) =>
        name ? (
          <Tag color="blue" icon={<UserOutlined />}>
            {name}
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Doanh thu dự kiến',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (rev?: number) => (
        <Text strong className="text-emerald-600 font-mono tabular-nums">
          {formatCurrency(rev)}
        </Text>
      ),
    },
    {
      title: 'Chi phí ước tính',
      dataIndex: 'totalCost',
      key: 'totalCost',
      render: (cost?: number) => (
        <Text type="secondary" className="font-mono tabular-nums">{formatCurrency(cost)}</Text>
      ),
    },
    {
      title: 'Trạng thái / Cảnh báo',
      key: 'warnings',
      render: (_: unknown, record: CreatedDossierMetadata) =>
        record.hasDuplicateWarning ? (
          <Tag color="warning" icon={<WarningOutlined />}>
            Trùng lặp hồ sơ
          </Tag>
        ) : (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Hợp lệ
          </Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: CreatedDossierMetadata) => (
        <Button
          type="primary"
          size="small"
          className="skylux-primary-button"
          icon={<ArrowRightOutlined />}
          onClick={() => router.push(`/dossiers/${record.dossierId}`)}
        >
          Vào xem Tour
        </Button>
      ),
    },
  ];

  // Case 1: Single Tour Created - Actionable Tour Hub
  if (createdDossiers.length === 1) {
    const singleDossier = createdDossiers[0];

    return (
      <Card className="skylux-card border border-emerald-200 shadow-sm">
        <div className="text-center pb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 text-3xl mb-3">
            <CheckCircleOutlined />
          </div>
          <Title level={3} className="text-slate-900 !mb-1">
            Nhập dữ liệu dự toán thành công!
          </Title>
          <Text type="secondary" className="text-sm">
            Hồ sơ tour du lịch đã được tạo thành công từ file Excel với đầy đủ dự toán và khách hàng.
          </Text>
        </div>

        {/* Duplicate warning reminder if flagged during staging */}
        {singleDossier.hasDuplicateWarning && (
          <div className="mt-4 mb-4">
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              title="Lưu ý cảnh báo trùng lặp"
              description="Hồ sơ này có thông tin trùng lặp với tour đã tồn tại trong hệ thống (cùng khách hàng, tuyến hoặc thời gian). Vui lòng kiểm tra kỹ chi tiết trước khi gửi duyệt."
            />
          </div>
        )}

        {/* Actionable Tour Summary Hub */}
        <div className="mt-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mã Tour vừa tạo
              </div>
              <div className="flexorientation-horizontal flex orientation-horizontal items-center gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {singleDossier.code}
                </span>
                <Tooltip
                  title={
                    copiedCode === singleDossier.code
                      ? 'Đã sao chép!'
                      : 'Sao chép mã tour'
                  }
                >
                  <Button
                    size="middle"
                    icon={
                      copiedCode === singleDossier.code ? (
                        <CheckCircleOutlined className="text-emerald-500" />
                      ) : (
                        <CopyOutlined />
                      )
                    }
                    onClick={() => handleCopyCode(singleDossier.code)}
                    aria-label="Sao chép mã tour"
                  />
                </Tooltip>
              </div>

              {singleDossier.customerName && (
                <div className="pt-1">
                  <Tag color="blue" icon={<UserOutlined />} className="text-sm py-0.5 px-2">
                    Khách hàng: {singleDossier.customerName}
                  </Tag>
                </div>
              )}
            </div>

            {/* Financial indicators */}
            <div className="flex flex-wrap gap-4 items-center bg-[var(--color-surface)] p-3.5 rounded-lg border border-[var(--color-border)] shadow-xs">
              <div className="text-right">
                <div className="text-xs text-[var(--color-text-muted)]">Doanh thu dự kiến</div>
                <div className="text-base font-bold text-emerald-600 font-mono tabular-nums">
                  {formatCurrency(singleDossier.totalRevenue)}
                </div>
              </div>
              <div className="h-8 w-px bg-[var(--color-border)]" />
              <div className="text-right">
                <div className="text-xs text-[var(--color-text-muted)]">Chi phí ước tính</div>
                <div className="text-base font-bold text-[var(--color-text)] font-mono tabular-nums">
                  {formatCurrency(singleDossier.totalCost)}
                </div>
              </div>
            </div>
          </div>

          {/* Primary High-Visibility Deep Link Action Button */}
          <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              className="skylux-primary-button w-full sm:w-auto text-base font-semibold px-6 py-2 h-auto"
              onClick={() => router.push(`/dossiers/${singleDossier.dossierId}`)}
            >
              Vào xem & gửi duyệt Tour ngay: {singleDossier.code}
            </Button>

            <Space wrap>
              <Button
                icon={<UnorderedListOutlined />}
                onClick={() => router.push('/dossiers')}
              >
                Xem danh sách tất cả hồ sơ
              </Button>
              <Button icon={<FileAddOutlined />} onClick={onResetSession}>
                + Nhập file khác
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    );
  }

  // Case 2: Multi-Tour Import Result
  if (createdDossiers.length > 1) {
    return (
      <Card className="skylux-card border border-emerald-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div>
            <Title level={4} className="text-slate-900 !mb-0.5">
              Nhập dữ liệu thành công ({createdDossiers.length} tour đã tạo)
            </Title>
            <Text type="secondary" className="text-xs">
              Tất cả {importedCount} dòng dữ liệu đã được tổng hợp thành các tour tương ứng. Nhấp vào tour bên dưới để xem chi tiết.
            </Text>
          </div>
          <Space wrap>
            <Button
              icon={<UnorderedListOutlined />}
              onClick={() => router.push('/dossiers')}
            >
              Danh sách hồ sơ
            </Button>
            <Button icon={<FileAddOutlined />} onClick={onResetSession}>
              + Nhập file khác
            </Button>
          </Space>
        </div>

        <Table
          dataSource={createdDossiers}
          columns={columns}
          rowKey="dossierId"
          pagination={false}
          size="middle"
          scroll={{ x: 720 }}
        />
      </Card>
    );
  }

  // Case 3: Fallback when createdDossiers is empty / legacy payload
  return (
    <Card className="skylux-card">
      <Result
        status="success"
        title="Nhập dữ liệu thành công"
        subTitle={`Toàn bộ ${importedCount} hồ sơ và thông tin khách hàng đã được lưu trữ thành công.`}
        extra={[
          <Button
            type="primary"
            className="skylux-primary-button"
            key="dossiers"
            icon={<ArrowRightOutlined />}
            onClick={() => router.push('/dossiers')}
          >
            Xem danh sách hồ sơ
          </Button>,
          <Button key="new" icon={<FileAddOutlined />} onClick={onResetSession}>
            Import file khác
          </Button>,
        ]}
      />
    </Card>
  );
}
