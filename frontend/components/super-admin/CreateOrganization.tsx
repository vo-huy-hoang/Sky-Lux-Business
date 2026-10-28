'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, Select, Steps, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled, CheckOutlined } from '@ant-design/icons';
import { organizationsService } from '@/services/organizations.service';
import type { CreateOrganizationInput } from '@/services/organizations.service';
import type { OrganizationItem } from '@/types/organization';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';
import styles from './organizations.module.css';

const { Title, Text } = Typography;

function toSlug(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toCode(value: string) {
  return value.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D').replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

export function CreateOrganization() {
  const router = useRouter();
  const isSuperAdmin = useAuthStore((state) => Boolean(state.user?.roles?.includes('SUPER_ADMIN')));
  const returnPath = isSuperAdmin ? '/organizations' : '/dashboard';
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CreateOrganizationInput>();
  const [codeEdited, setCodeEdited] = useState(false);
  const [step, setStep] = useState(0);
  const [createdOrganization, setCreatedOrganization] = useState<OrganizationItem | null>(null);
  const name = Form.useWatch('name', { form, preserve: true }) || '';
  const code = Form.useWatch('code', { form, preserve: true }) || '';
  const timezone = Form.useWatch('timezone', { form, preserve: true }) || 'Asia/Ho_Chi_Minh';
  const currency = Form.useWatch('currency', { form, preserve: true }) || 'VND';
  const slug = useMemo(() => toSlug(code || name), [code, name]);

  const createMutation = useMutation({
    mutationFn: (values: CreateOrganizationInput) => organizationsService.createOrganization(values),
    onSuccess: (organization) => {
      setCreatedOrganization(organization);
      setStep(2);
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      message.success('Đã tạo doanh nghiệp mới');
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Không thể tạo doanh nghiệp. Vui lòng thử lại.');
    },
  });

  const handleContinue = async () => {
    try {
      await form.validateFields();
      setStep(1);
    } catch {
      // Ant Design displays field validation feedback next to each input.
    }
  };

  const handleCreate = () => {
    const values = form.getFieldsValue(true) as CreateOrganizationInput;
    createMutation.mutate({ ...values, slug });
  };

  return (
    <div className={styles.createPage}>
      <div className={styles.breadcrumb}>{isSuperAdmin && <button onClick={() => router.push(returnPath)}>Doanh nghiệp</button>}<span>{isSuperAdmin ? '/' : 'Đăng ký'} </span><span>{step === 2 ? 'Hoàn tất' : 'Tạo mới'}</span></div>
      <div className={styles.createIntro}>
        <Title level={2}>{step === 2 ? 'Đã tạo doanh nghiệp' : 'Tạo doanh nghiệp mới'}</Title>
        <Text type="secondary">Tạo tenant mới để bắt đầu sử dụng Sky-Lux CRM cho doanh nghiệp của bạn.</Text>
      </div>

      <Steps
        current={step}
        className={styles.steps}
        items={[
          { title: 'Thông tin doanh nghiệp' },
          { title: 'Xác nhận & khởi tạo' },
          { title: 'Hoàn tất' },
        ]}
      />

      {step === 2 ? (
        <Card className={styles.successCard}>
          <CheckCircleFilled className={styles.successIcon} />
          <Title level={3}>Tenant đã sẵn sàng</Title>
          <Text type="secondary">{createdOrganization?.name} đã được thêm vào danh sách doanh nghiệp.</Text>
          <div className={styles.successDetails}><span>Mã doanh nghiệp</span><strong>{createdOrganization?.code}</strong><span>Tenant key</span><strong>{createdOrganization?.slug}</strong></div>
          <Button type="primary" onClick={() => router.push(returnPath)} className={styles.primaryButton}>{isSuperAdmin ? 'Về danh sách doanh nghiệp' : 'Về bảng điều khiển'}</Button>
        </Card>
      ) : (
        <>
          <div className={styles.createGrid}>
            <Card className={styles.formCard}>
              {step === 0 ? (
                <>
                  <Title level={4}>Thông tin doanh nghiệp</Title>
                  <Text type="secondary">Nhập thông tin cơ bản để đăng ký một tenant mới.</Text>
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ timezone: 'Asia/Ho_Chi_Minh', currency: 'VND' }}
                    requiredMark="optional"
                    className={styles.organizationForm}
                  >
                    <div className={styles.formGrid}>
                      <Form.Item name="name" label="Tên doanh nghiệp" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên doanh nghiệp' }, { max: 255, message: 'Tên tối đa 255 ký tự' }]}>
                        <Input size="large" placeholder="Ví dụ: Minh Phát Travel" onChange={(event) => {
                          if (!codeEdited) form.setFieldValue('code', toCode(event.target.value));
                        }} />
                      </Form.Item>
                      <Form.Item name="code" label="Mã doanh nghiệp" normalize={(value: string) => value.toUpperCase()} rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập mã doanh nghiệp' }, { max: 50, message: 'Mã tối đa 50 ký tự' }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới' }]}>
                        <Input size="large" placeholder="MINH-PHAT" onChange={(event) => {
                          setCodeEdited(true);
                        }} />
                      </Form.Item>
                    </div>
                    <div className={styles.formGrid}>
                      <Form.Item name="taxCode" label="Mã số thuế">
                        <Input size="large" placeholder="0101234567" />
                      </Form.Item>
                      <Form.Item name="contactEmail" label="Email liên hệ" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập email liên hệ' }, { type: 'email', message: 'Email chưa đúng định dạng' }]}>
                        <Input size="large" type="email" placeholder="lienhe@doanhnghiep.vn" />
                      </Form.Item>
                    </div>
                    <div className={styles.formGrid}>
                      <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập số điện thoại' }, { max: 30, message: 'Số điện thoại tối đa 30 ký tự' }]}>
                        <Input size="large" placeholder="0909 123 456" />
                      </Form.Item>
                    </div>
                    <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập địa chỉ' }]}>
                      <Input size="large" placeholder="123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh" />
                    </Form.Item>
                    <Form.Item name="industry" label="Ngành nghề" rules={[{ required: true, message: 'Vui lòng chọn ngành nghề' }]}>
                      <Select size="large" options={[
                        { value: 'Du lịch', label: 'Du lịch' },
                        { value: 'Khách sạn', label: 'Khách sạn' },
                        { value: 'Vận tải', label: 'Vận tải' },
                        { value: 'Khác', label: 'Khác' },
                      ]} />
                    </Form.Item>
                    <div className={styles.formGrid}>
                      <Form.Item name="timezone" label="Múi giờ mặc định" rules={[{ required: true, message: 'Vui lòng chọn múi giờ' }]}>
                        <Select size="large" options={[
                          { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (UTC+07:00)' },
                          { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+07:00)' },
                          { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+08:00)' },
                        ]} />
                      </Form.Item>
                      <Form.Item name="currency" label="Đơn vị tiền tệ mặc định" rules={[{ required: true, message: 'Vui lòng chọn tiền tệ' }]}>
                        <Select size="large" options={[
                          { value: 'VND', label: 'VND · Đồng Việt Nam' },
                          { value: 'USD', label: 'USD · Đô la Mỹ' },
                        ]} />
                      </Form.Item>
                    </div>
                    <Form.Item label="Tenant key">
                      <Input size="large" value={slug} readOnly placeholder="Được tạo tự động từ mã doanh nghiệp" />
                    </Form.Item>
                    <Text className={styles.fieldHint}>Tenant key dùng để định danh doanh nghiệp trong hệ thống và được tạo tự động từ mã doanh nghiệp.</Text>
                  </Form>
                </>
              ) : (
                <>
                  <Title level={4}>Xác nhận thông tin</Title>
                  <Text type="secondary">Kiểm tra thông tin trước khi tạo tenant.</Text>
                  <dl className={styles.reviewList}>
                    <div><dt>Tên doanh nghiệp</dt><dd>{name || '—'}</dd></div>
                    <div><dt>Mã doanh nghiệp</dt><dd>{code || '—'}</dd></div>
                    <div><dt>Mã số thuế</dt><dd>{form.getFieldValue('taxCode') || '—'}</dd></div>
                    <div><dt>Email liên hệ</dt><dd>{form.getFieldValue('contactEmail') || '—'}</dd></div>
                    <div><dt>Số điện thoại</dt><dd>{form.getFieldValue('phone') || '—'}</dd></div>
                    <div><dt>Địa chỉ</dt><dd>{form.getFieldValue('address') || '—'}</dd></div>
                    <div><dt>Ngành nghề</dt><dd>{form.getFieldValue('industry') || '—'}</dd></div>
                    <div><dt>Tenant key</dt><dd>{slug || '—'}</dd></div>
                    <div><dt>Múi giờ mặc định</dt><dd>{timezone}</dd></div>
                    <div><dt>Tiền tệ</dt><dd>{currency}</dd></div>
                  </dl>
                  <Alert type="info" showIcon message="Doanh nghiệp sẽ được tạo ở trạng thái hoạt động." description="Hệ thống tự khởi tạo các vai trò và quyền mặc định cho tenant mới." />
                </>
              )}
            </Card>

            <Card className={styles.setupCard}>
              <Title level={4}>Khởi tạo tenant</Title>
              <Text type="secondary">Thiết lập mặc định cho doanh nghiệp mới.</Text>
              <div className={styles.setupBlock}>
                <div className={styles.setupTitle}><strong>Kích hoạt tenant sau khi tạo</strong><Tag color="green">Hoạt động</Tag></div>
                <Text type="secondary">Tenant sẵn sàng sử dụng ngay sau khi hoàn tất.</Text>
              </div>
              <div className={styles.setupBlock}>
                <strong>Khóa định danh (tenant key)</strong>
                <Input size="large" value={slug} readOnly placeholder="tenant-key" className={styles.slugField} />
                <Text type="secondary">Được tạo tự động từ mã doanh nghiệp.</Text>
              </div>
              <div className={styles.setupBlock}>
                <strong>Múi giờ mặc định</strong>
                <div className={styles.timezonePreview}>{timezone}</div>
                <Text type="secondary">Có thể thay đổi trong cấu hình tenant sau khi tạo.</Text>
              </div>
            </Card>
          </div>
          <div className={styles.formFooter}>
            <Button onClick={() => step === 1 ? setStep(0) : router.push(returnPath)} icon={step === 1 ? <ArrowLeftOutlined /> : undefined}>
              {step === 1 ? 'Quay lại chỉnh sửa' : 'Hủy'}
            </Button>
            {step === 0 ? (
              <Button type="primary" onClick={handleContinue} icon={<ArrowRightOutlined />} iconPosition="end" className={styles.primaryButton}>Tiếp tục</Button>
            ) : (
              <Button type="primary" onClick={handleCreate} loading={createMutation.isPending} icon={<CheckOutlined />} iconPosition="end" className={styles.primaryButton}>Tạo doanh nghiệp</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

