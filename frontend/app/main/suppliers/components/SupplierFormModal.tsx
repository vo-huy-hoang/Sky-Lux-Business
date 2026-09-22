'use client';

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  App,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService } from '@/services/suppliers.service';
import { queryKeys } from '@/lib/query-keys';
import { SupplierItem, CreateSupplierInput } from '@/types/supplier';

const { Option } = Select;
const { TextArea } = Input;

interface SupplierFormModalProps {
  visible: boolean;
  onCancel: () => void;
  initialData?: SupplierItem | null;
  onSuccess?: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  visible,
  onCancel,
  initialData,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        form.setFieldsValue({
          code: initialData.code,
          name: initialData.name,
          supplierTypeName: initialData.supplierType?.name || '',
          taxCode: initialData.taxCode,
          contactName: initialData.contactName,
          phone: initialData.phone,
          email: initialData.email,
          address: initialData.address,
          paymentTerms: initialData.paymentTerms,
          status: initialData.status || 'ACTIVE',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'ACTIVE',
        });
      }
    }
  }, [visible, initialData, form]);

  const createMutation = useMutation({
    mutationFn: (values: CreateSupplierInput) =>
      suppliersService.createSupplier(values),
    onSuccess: () => {
      message.success('Tạo nhà cung cấp thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      form.resetFields();
      onCancel();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tạo nhà cung cấp';
      message.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CreateSupplierInput) =>
      suppliersService.updateSupplier(initialData!.id, values),
    onSuccess: () => {
      message.success('Cập nhật nhà cung cấp thành công');
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      if (initialData?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.suppliers.detail(initialData.id),
        });
      }
      form.resetFields();
      onCancel();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể cập nhật nhà cung cấp';
      message.error(msg);
    },
  });

  const handleFinish = (values: any) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa nhà cung cấp' : 'Thêm mới nhà cung cấp'}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isSubmitting}
      forceRender
      destroyOnHidden
      width={720}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo mới'}
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="code"
              label="Mã nhà cung cấp"
              rules={[
                { required: true, message: 'Vui lòng nhập mã nhà cung cấp' },
                { max: 50, message: 'Mã không được vượt quá 50 ký tự' },
              ]}
            >
              <Input
                placeholder="VD: NCC-HOTEL-01"
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Tên nhà cung cấp"
              rules={[
                { required: true, message: 'Vui lòng nhập tên nhà cung cấp' },
                { max: 255, message: 'Tên không được vượt quá 255 ký tự' },
              ]}
            >
              <Input placeholder="VD: Khách sạn Mường Thanh Luxury" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="taxCode"
              label="Mã số thuế"
              rules={[{ max: 50, message: 'Mã số thuế tối đa 50 ký tự' }]}
            >
              <Input placeholder="VD: 0101234567" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="supplierTypeName"
              label="Loại nhà cung cấp"
              rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
            >
              <Input placeholder="Nhập loại nhà cung cấp" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select placeholder="Chọn trạng thái">
                <Option value="ACTIVE">Hoạt động (ACTIVE)</Option>
                <Option value="INACTIVE">Ngừng hoạt động (INACTIVE)</Option>
                <Option value="LOCKED">Đang khóa (LOCKED)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="contactName"
              label="Người liên hệ đại diện"
              rules={[{ max: 255, message: 'Tối đa 255 ký tự' }]}
            >
              <Input placeholder="VD: Nguyễn Văn A" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[{ max: 20, message: 'Tối đa 20 ký tự' }]}
            >
              <Input placeholder="VD: 0987654321" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="email"
              label="Email liên hệ"
              rules={[
                { type: 'email', message: 'Email không đúng định dạng' },
              ]}
            >
              <Input placeholder="VD: contact@hotel.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="Địa chỉ"
        >
          <Input placeholder="VD: Số 123 Đường Trần Hưng Đạo, Quận 1, TP. HCM" />
        </Form.Item>

        <Form.Item
          name="paymentTerms"
          label="Điều khoản thanh toán"
        >
          <TextArea
            rows={3}
            placeholder="VD: Thanh toán 50% trước khi đặt cọc, 50% sau khi kết thúc tour 7 ngày làm việc."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
