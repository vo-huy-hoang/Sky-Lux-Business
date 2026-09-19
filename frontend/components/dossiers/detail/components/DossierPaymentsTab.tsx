'use client';

import React, { useState } from 'react';
import { Button, Table, Modal, Form, Input, InputNumber, DatePicker, Select, App, Tag } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useDossierFinanceSummary, useDossierPayments } from '@/hooks/use-payments';
import { paymentsService } from '@/services/payments.service';
import { queryKeys } from '@/lib/query-keys';
import { PaymentItem } from '@/types/payment';

export interface DossierPaymentsTabProps {
  dossierId: string;
  isLocked?: boolean;
}

export default function DossierPaymentsTab({ dossierId, isLocked = false }: DossierPaymentsTabProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const { data, isLoading } = useDossierPayments(dossierId);
  const financeSummaryQuery = useDossierFinanceSummary(dossierId);
  const payments = data?.data || [];
  const remainingDebt = Math.max(
    Number(financeSummaryQuery.data?.data?.remainingDebt || 0),
    0,
  );
  const financeSummaryLoading = financeSummaryQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: (values: any) => paymentsService.createPayment(dossierId, values),
    onSuccess: () => {
      message.success('Đã lưu khoản thanh toán thành công');
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.dossierPayments(dossierId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.financeSummary(dossierId) });
    },
    onError: (error: any) => {
      message.error(error?.message || 'Không thể lưu khoản thanh toán');
    },
  });

  const columns = [
    {
      title: 'Ngày thanh toán',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => 
        <strong className="text-emerald-600">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)}
        </strong>,
    },
    {
      title: 'Hình thức',
      dataIndex: 'method',
      key: 'method',
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: 'Mã giao dịch',
      dataIndex: 'referenceCode',
      key: 'referenceCode',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
    },
  ];

  const handleFinish = (values: any) => {
    const amount = Number(values.amount || 0);
    if (amount <= 0) {
      message.error('Số tiền thanh toán phải lớn hơn 0');
      return;
    }
    if (amount > remainingDebt) {
      message.error('Số tiền thanh toán không được vượt quá công nợ còn lại');
      return;
    }
    createMutation.mutate({
      ...values,
      paidAt: values.paidAt ? values.paidAt.toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-slate-800">Lịch sử thanh toán</h3>
        {!isLocked && (
          <Button
            type="primary"
            disabled={financeSummaryLoading || remainingDebt <= 0}
            onClick={() => setIsModalOpen(true)}
          >
            {remainingDebt > 0 ? 'Thêm thanh toán' : 'Đã đủ công nợ'}
          </Button>
        )}
      </div>

      <Table
        dataSource={payments}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        bordered
      />

      <Modal
        title="Thêm khoản thanh toán mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            name="amount"
            label="Số tiền thanh toán (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(\.*)/g, '').replace(/,/g, '') as any}
              min={1}
              max={remainingDebt}
              size="large"
              disabled={remainingDebt <= 0}
            />
          </Form.Item>
          <div className="-mt-3 mb-3 text-xs text-slate-500">
            Còn có thể thu tối đa:{' '}
            {new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
              maximumFractionDigits: 0,
            }).format(remainingDebt)}
          </div>

          <Form.Item
            name="paidAt"
            label="Ngày thanh toán"
            rules={[{ required: true, message: 'Vui lòng chọn ngày thanh toán' }]}
            initialValue={dayjs()}
          >
            <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
          </Form.Item>

          <Form.Item
            name="method"
            label="Hình thức thanh toán"
            initialValue="BANK_TRANSFER"
          >
            <Select>
              <Select.Option value="BANK_TRANSFER">Chuyển khoản</Select.Option>
              <Select.Option value="CASH">Tiền mặt</Select.Option>
              <Select.Option value="CREDIT_CARD">Thẻ tín dụng</Select.Option>
              <Select.Option value="OTHER">Khác</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="referenceCode" label="Mã giao dịch">
            <Input placeholder="Nhập mã giao dịch ngân hàng (nếu có)" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={3} placeholder="Nhập ghi chú thêm..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
