'use client';

import React, { useMemo } from 'react';
import { Empty, Table, Typography } from 'antd';
import { EstimateCostLine, EstimateRevenueLine } from '@/types/estimate';

const { Text } = Typography;

function money(value?: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function number(value?: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value || 0);
}

export default function EstimateExcelTables({
  revenueLines,
  costLines,
  currency = 'VND',
}: {
  revenueLines?: EstimateRevenueLine[];
  costLines?: EstimateCostLine[];
  currency?: string;
}) {
  const revenues = useMemo(() => revenueLines || [], [revenueLines]);
  const costs = useMemo(() => costLines || [], [costLines]);
  const totalRevenue = revenues.reduce((sum, line) => sum + Number(line.netAmount || 0), 0);
  const totalCost = costs.reduce((sum, line) => sum + Number(line.netAmount || 0), 0);

  const passengerSummary = useMemo(() => {
    const groups = new Map<string, { key: string; type: string; quantity: number; amount: number }>();
    revenues.forEach((line) => {
      const type = line.passengerType?.name || line.passengerType?.code || 'Chưa phân loại';
      const current = groups.get(type) || { key: type, type, quantity: 0, amount: 0 };
      current.quantity += Number(line.quantity || 0);
      current.amount += Number(line.netAmount || 0);
      groups.set(type, current);
    });
    return Array.from(groups.values());
  }, [revenues]);

  const revenueColumns = [
    { title: 'STT', width: 54, render: (_: unknown, __: EstimateRevenueLine, index: number) => index + 1 },
    { title: 'Hạng mục', dataIndex: 'description', ellipsis: true },
    { title: 'Đơn vị tính', width: 120, render: (_: unknown, line: EstimateRevenueLine) => line.unit?.name || line.unit?.code || '-' },
    { title: 'Số lượng', dataIndex: 'quantity', width: 100, align: 'right' as const, render: number },
    { title: 'Hệ số', dataIndex: 'multiplier', width: 82, align: 'right' as const, render: number },
    { title: 'Đơn giá', dataIndex: 'unitPrice', width: 148, align: 'right' as const, render: (value: number) => money(value, currency) },
    { title: 'Thành tiền', dataIndex: 'netAmount', width: 156, align: 'right' as const, render: (value: number) => <Text strong>{money(value, currency)}</Text> },
    { title: 'Ghi chú', dataIndex: 'note', width: 170, render: (value?: string) => value || '-' },
  ];

  const costColumns = [
    { title: 'STT', width: 54, render: (_: unknown, __: EstimateCostLine, index: number) => index + 1 },
    { title: 'Hạng mục', dataIndex: 'description', ellipsis: true },
    { title: 'Nhà cung cấp', width: 160, render: (_: unknown, line: EstimateCostLine) => line.supplier?.displayName || line.supplier?.name || line.supplier?.code || '-' },
    { title: 'Đơn vị tính', width: 112, render: (_: unknown, line: EstimateCostLine) => line.unit?.name || line.unit?.code || '-' },
    { title: 'Số lượng', dataIndex: 'quantity', width: 94, align: 'right' as const, render: number },
    { title: 'Đơn giá', dataIndex: 'unitPrice', width: 148, align: 'right' as const, render: (value: number) => money(value, currency) },
    { title: 'VAT', dataIndex: 'vatRate', width: 76, align: 'right' as const, render: (value: number) => `${number(value)}%` },
    { title: 'Thành tiền', dataIndex: 'netAmount', width: 156, align: 'right' as const, render: (value: number) => <Text strong>{money(value, currency)}</Text> },
    { title: 'Ghi chú', dataIndex: 'note', width: 150, render: (value?: string) => value || '-' },
  ];

  const summaryColumns = [
    { title: 'STT', width: 54, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: 'Loại khách', dataIndex: 'type' },
    { title: 'Số lượng', dataIndex: 'quantity', width: 130, align: 'right' as const, render: number },
    { title: 'Thành tiền', dataIndex: 'amount', width: 180, align: 'right' as const, render: (value: number) => <Text strong>{money(value, currency)}</Text> },
  ];

  return (
    <div className="space-y-4">
      <section aria-labelledby="passenger-revenue-heading">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 id="passenger-revenue-heading" className="m-0 text-sm font-bold text-[var(--ceo-text)]">Doanh thu theo khách đoàn / loại khách</h3>
          <Text className="text-xs text-[var(--ceo-text-muted)]">Nguồn: Dữ liệu dự toán hệ thống</Text>
        </div>
        <Table
          rowKey="key"
          dataSource={passengerSummary}
          columns={summaryColumns}
          pagination={false}
          size="small"
          className="ceo-table ceo-excel-table"
          scroll={{ x: 680 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu doanh thu" /> }}
          summary={() => passengerSummary.length ? (
            <Table.Summary.Row className="ceo-total-row">
              <Table.Summary.Cell index={0} colSpan={2}><Text strong>TỔNG CỘNG</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><Text strong>{number(passengerSummary.reduce((sum, item) => sum + item.quantity, 0))}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><Text strong>{money(totalRevenue, currency)}</Text></Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null}
        />
      </section>

      <section aria-labelledby="revenue-detail-heading">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 id="revenue-detail-heading" className="m-0 text-sm font-bold text-[var(--ceo-text)]">Chi tiết doanh thu</h3>
          <Text className="text-xs font-semibold text-[var(--ceo-primary-600)]">Tổng: {money(totalRevenue, currency)}</Text>
        </div>
        <Table
          rowKey="id"
          dataSource={revenues}
          columns={revenueColumns}
          pagination={false}
          size="small"
          className="ceo-table ceo-excel-table"
          scroll={{ x: 1020 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dòng doanh thu" /> }}
          summary={() => revenues.length ? (
            <Table.Summary.Row className="ceo-total-row">
              <Table.Summary.Cell index={0} colSpan={6}><Text strong>TỔNG CỘNG</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><Text strong>{money(totalRevenue, currency)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={7} />
            </Table.Summary.Row>
          ) : null}
        />
      </section>

      <section aria-labelledby="cost-detail-heading">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h3 id="cost-detail-heading" className="m-0 text-sm font-bold text-[var(--ceo-text)]">Chi phí theo hạng mục</h3>
          <Text className="text-xs font-semibold text-[var(--ceo-primary-600)]">Tổng: {money(totalCost, currency)}</Text>
        </div>
        <Table
          rowKey="id"
          dataSource={costs}
          columns={costColumns}
          pagination={false}
          size="small"
          className="ceo-table ceo-excel-table"
          scroll={{ x: 1120 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dòng chi phí" /> }}
          summary={() => costs.length ? (
            <Table.Summary.Row className="ceo-total-row">
              <Table.Summary.Cell index={0} colSpan={7}><Text strong>TỔNG CỘNG</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><Text strong>{money(totalCost, currency)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={8} />
            </Table.Summary.Row>
          ) : null}
        />
      </section>
    </div>
  );
}
