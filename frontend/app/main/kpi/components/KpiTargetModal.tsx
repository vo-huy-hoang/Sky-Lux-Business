'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, message, Row, Col } from 'antd';
import { useKpis } from '@/hooks/use-kpis';
import { KpiMetric, KpiPeriodType, KpiTarget } from '@/types/kpi';
import dayjs from 'dayjs';

interface KpiTargetModalProps {
  open: boolean;
  editingTarget?: KpiTarget | null;
  onCancel: () => void;
}

export default function KpiTargetModal({ open, editingTarget, onCancel }: KpiTargetModalProps) {
  const [form] = Form.useForm();
  const { useCreateKpiTarget, useUpdateKpiTarget, useAssignableUsers } = useKpis();
  const createMutation = useCreateKpiTarget();
  const updateMutation = useUpdateKpiTarget();
  const { data: assigneesResponse, isLoading: isLoadingAssignees } = useAssignableUsers(open);
  const assignees = assigneesResponse?.data || [];
  const isEditing = Boolean(editingTarget);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(editingTarget ? {
        userId: editingTarget.userId,
        metricCode: editingTarget.metricCode,
        targetValue: editingTarget.targetValue,
        periodType: editingTarget.periodType,
        periodDate: dayjs(editingTarget.periodStart),
      } : {
        periodType: KpiPeriodType.MONTHLY,
        periodDate: dayjs(),
      });
    }
  }, [open, form, editingTarget]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const periodStart = values.periodDate.startOf('month').format('YYYY-MM-DD');
      const periodEnd = values.periodDate.endOf('month').format('YYYY-MM-DD');

      const payload = {
        metricCode: values.metricCode,
        periodType: values.periodType,
        periodStart,
        periodEnd,
        userId: values.userId,
        targetValue: values.targetValue,
      };

      if (editingTarget) {
        await updateMutation.mutateAsync({ id: editingTarget.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      message.success(isEditing ? 'Cập nhật chỉ tiêu KPI thành công' : 'Tạo chỉ tiêu KPI thành công');
      onCancel();
    } catch (error: any) {
      if (error.errorFields) return; // validation error
      message.error(error.message || (isEditing ? 'Lỗi khi cập nhật KPI target' : 'Lỗi khi tạo KPI target'));
    }
  };

  return (
    <Modal
      title={isEditing ? 'Cập nhật chỉ tiêu KPI' : 'Giao chỉ tiêu KPI'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      okText="Lưu"
      cancelText="Hủy"
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="userId"
          label="Nhân viên Sales"
          rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
        >
          <Select
            placeholder="-- Chọn nhân viên --"
            loading={isLoadingAssignees}
            showSearch
            optionFilterProp="label"
            options={assignees.map((user) => ({
              value: user.id,
              label: `${user.fullName} (${user.employeeCode})`,
            }))}
          >
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="metricCode"
              label="Loại KPI"
              rules={[{ required: true, message: 'Vui lòng chọn loại KPI' }]}
            >
              <Select placeholder="-- Chọn loại --">
                <Select.Option value={KpiMetric.REVENUE}>Doanh thu</Select.Option>
                <Select.Option value={KpiMetric.PROFIT}>Lợi nhuận</Select.Option>
                <Select.Option value={KpiMetric.DOSSIER_COUNT}>Số lượng hồ sơ</Select.Option>
                <Select.Option value={KpiMetric.CLOSE_RATE}>Tỉ lệ chốt (%)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="targetValue"
              label="Chỉ tiêu (Target)"
              rules={[{ required: true, message: 'Vui lòng nhập chỉ tiêu' }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value!.replace(/\$\s?|(,*)/g, '') as any}
                placeholder="Nhập giá trị mục tiêu..."
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="periodType"
              label="Chu kỳ"
              rules={[{ required: true }]}
            >
              <Select>
                <Select.Option value={KpiPeriodType.MONTHLY}>Hàng tháng</Select.Option>
                <Select.Option value={KpiPeriodType.QUARTERLY}>Hàng quý</Select.Option>
                <Select.Option value={KpiPeriodType.YEARLY}>Hàng năm</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="periodDate"
              label="Kỳ áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            >
              <DatePicker picker="month" className="w-full" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
