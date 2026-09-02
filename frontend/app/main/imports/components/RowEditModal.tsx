'use client';

import React, { useEffect } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
} from 'antd';
import { useMutation } from '@tanstack/react-query';
import { importsService } from '@/services/imports.service';
import { ImportRow } from '@/types/import';

const { Text } = Typography;
const { Option } = Select;

interface RowEditModalProps {
  visible: boolean;
  sessionId: string;
  row: ImportRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RowEditModal: React.FC<RowEditModalProps> = ({
  visible,
  sessionId,
  row,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  useEffect(() => {
    if (!row || !visible) return;

    const raw = row.rawData || {};
    form.setFieldsValue({
      code: raw['Mã hồ sơ'] || raw.code || '',
      name: raw['Tên hồ sơ'] || raw.name || '',
      customerCode: raw['Mã khách hàng'] || raw.customerCode || '',
      customerName: raw['Tên khách hàng'] || raw.customerName || '',
      phone: raw['Số điện thoại'] || raw['Số ĐT'] || raw.phone || '',
      email: raw['Email'] || raw.email || '',
      dob: raw['Ngày sinh nhật'] || raw['Ngày sinh'] || raw.dateOfBirth || '',
      startDate: raw['Ngày bắt đầu'] || raw.startDate || '',
      endDate: raw['Ngày kết thúc'] || raw.endDate || '',
      route: raw['Tuyến đường'] || raw.route || '',
      priority: raw['Mức độ ưu tiên'] || raw.priority || 'MEDIUM',
    });
  }, [row, visible, form]);

  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      const rawData = {
        ...(row?.rawData || {}),
        'Mã hồ sơ': values.code,
        'Tên hồ sơ': values.name,
        'Mã khách hàng': values.customerCode,
        'Tên khách hàng': values.customerName,
        'Số điện thoại': values.phone,
        'Email': values.email,
        'Ngày sinh nhật': values.dob,
        'Ngày bắt đầu': values.startDate,
        'Ngày kết thúc': values.endDate,
        'Tuyến đường': values.route,
        'Mức độ ưu tiên': values.priority,
      };

      return importsService.updateRowStaging(sessionId, row!.id, { rawData });
    },
    onSuccess: () => {
      message.success('Đã cập nhật dòng dữ liệu tạm và kích hoạt kiểm duyệt lại');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      message.error(err?.message || 'Không thể cập nhật dòng dữ liệu');
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      updateMutation.mutate(values);
    } catch {
      // Form validation failed
    }
  };

  return (
    <Modal
      title={
        <Space>
          <span>Chỉnh sửa dữ liệu dòng #{row?.rowNumber}</span>
          <Text type="secondary">(Sheet: {row?.sheetName || 'Sheet1'})</Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={updateMutation.isPending}
          onClick={handleSubmit}
        >
          Lưu & Validate lại
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            name="code"
            label="Mã hồ sơ"
            rules={[{ required: true, message: 'Vui lòng nhập mã hồ sơ' }]}
          >
            <Input placeholder="Ví dụ: TOUR-2026-001" />
          </Form.Item>

          <Form.Item
            name="customerCode"
            label="Mã khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập mã khách hàng' }]}
          >
            <Input placeholder="Ví dụ: KH001" />
          </Form.Item>
        </div>

        <Form.Item
          name="name"
          label="Tên hồ sơ / Tour"
          rules={[{ required: true, message: 'Vui lòng nhập tên hồ sơ' }]}
        >
          <Input placeholder="Ví dụ: Tour Du Lịch Đà Nẵng 3N2Đ" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="customerName" label="Tên khách hàng">
            <Input placeholder="Ví dụ: Nguyễn Văn A" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Ví dụ: 0912345678" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="email" label="Email">
            <Input placeholder="Ví dụ: customer@example.com" />
          </Form.Item>

          <Form.Item name="dob" label="Ngày sinh nhật (YYYY-MM-DD)">
            <Input placeholder="Ví dụ: 1990-05-15" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="startDate" label="Ngày bắt đầu (YYYY-MM-DD)">
            <Input placeholder="Ví dụ: 2026-09-01" />
          </Form.Item>

          <Form.Item name="endDate" label="Ngày kết thúc (YYYY-MM-DD)">
            <Input placeholder="Ví dụ: 2026-09-05" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="route" label="Tuyến đường">
            <Input placeholder="Ví dụ: Hà Nội - Đà Nẵng - Hội An" />
          </Form.Item>

          <Form.Item name="priority" label="Mức độ ưu tiên">
            <Select>
              <Option value="LOW">Thấp (LOW)</Option>
              <Option value="MEDIUM">Trung bình (MEDIUM)</Option>
              <Option value="HIGH">Cao (HIGH)</Option>
            </Select>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};
