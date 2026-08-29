'use client';

import React from 'react';
import Image from 'next/image';
import { Button, Card, Empty, Skeleton, Switch, Tag, Typography } from 'antd';
import { AppstoreOutlined, BankOutlined, CustomerServiceOutlined, GlobalOutlined, HolderOutlined, PlusOutlined, SettingOutlined, TagsOutlined } from '@ant-design/icons';
import {
  useBusinessLines,
  useMarketTypes,
  usePassengerTypes,
  useServiceCategories,
  useSupplierTypes,
  useUnits,
} from '@/hooks/use-master-data';
import { useOrganizationProfile, useOrganizationSettings } from '@/hooks/organizations';
import { MasterDataItem } from '@/types/master-data';

const { Text } = Typography;

function CatalogCard({ title, icon, items, loading }: { title: string; icon: React.ReactNode; items?: MasterDataItem[]; loading?: boolean }) {
  return <Card className="ceo-card h-full" title={<span className="flex items-center gap-2">{icon}{title}</span>} extra={<Button size="small" icon={<PlusOutlined />} disabled title="Backend hiện chỉ hỗ trợ đọc danh mục">Thêm mới</Button>}>
    {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : items?.length ? <div className="space-y-0">
      {items.slice(0, 6).map((item, index) => <div key={item.id} className="grid grid-cols-[22px_26px_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--ceo-divider)] py-2.5 last:border-0">
        <HolderOutlined className="text-[var(--ceo-text-soft)]" /><Text className="text-xs text-[var(--ceo-text-muted)]">{index + 1}</Text><Text className="truncate text-sm">{item.name}</Text><Switch size="small" checked={item.status === 'ACTIVE'} disabled aria-label={`Trạng thái ${item.name}`} />
      </div>)}
    </div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu danh mục" />}
    <div className="mt-2 border-t border-[var(--ceo-divider)] pt-3 text-center text-xs font-semibold text-[var(--ceo-primary-700)]">{items?.length ? `Đang hiển thị ${Math.min(items.length, 6)} mục` : 'Nguồn dữ liệu API'}</div>
  </Card>;
}

export default function SettingsPage() {
  const params = { page: 1, pageSize: 20 };
  const businessLines = useBusinessLines(params);
  const marketTypes = useMarketTypes(params);
  const serviceCategories = useServiceCategories(params);
  const passengerTypes = usePassengerTypes(params);
  const supplierTypes = useSupplierTypes(params);
  const units = useUnits(params);
  const organization = useOrganizationProfile();
  const settings = useOrganizationSettings();

  const catalogs = [
    { title: 'Danh mục mảng kinh doanh', icon: <AppstoreOutlined />, query: businessLines },
    { title: 'Loại hình thị trường', icon: <GlobalOutlined />, query: marketTypes },
    { title: 'Nhóm dịch vụ', icon: <CustomerServiceOutlined />, query: serviceCategories },
    { title: 'Loại khách hàng', icon: <TagsOutlined />, query: passengerTypes },
    { title: 'Loại nhà cung cấp', icon: <BankOutlined />, query: supplierTypes },
    { title: 'Đơn vị tính', icon: <SettingOutlined />, query: units },
  ];
  const settingMap = new Map((settings.data || []).map((item) => [item.key, item.value]));

  return <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {catalogs.map(({ title, icon, query }) => <CatalogCard key={title} title={title} icon={icon} items={query.data?.data} loading={query.isLoading} />)}
      <Card className="ceo-card lg:col-span-2" title="Cấu hình Import Excel">
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          {[
            ['Định dạng file cho phép', settingMap.get('import.allowedFormats') || '.xlsx, .xls'],
            ['Ký tự mã hóa', settingMap.get('import.encoding') || 'UTF-8'],
            ['Dòng tiêu đề', settingMap.get('import.headerRow') || 'Theo cấu hình mẫu'],
            ['Bỏ qua dòng trống', settingMap.has('import.skipBlankRows') ? String(settingMap.get('import.skipBlankRows')) : 'Chưa cấu hình'],
            ['Kiểm tra trùng dữ liệu', settingMap.has('import.detectDuplicates') ? String(settingMap.get('import.detectDuplicates')) : 'Chưa cấu hình'],
            ['Mẫu import', settingMap.get('import.template') || 'Theo API phiên import'],
          ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-[var(--ceo-divider)] py-3"><Text className="text-sm text-[var(--ceo-text-muted)]">{label}</Text><Text strong>{value}</Text></div>)}
        </div>
        <Button block className="mt-4 skylux-outline-button" href="/main/imports">Mở màn hình Import Excel</Button>
      </Card>
      <Card className="ceo-card" title="Thông báo hệ thống"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API cấu hình thông báo" /></Card>
    </div>

    <aside className="space-y-4">
      <Card className="ceo-card" title="Thiết lập nhanh">
        <div className="text-sm font-bold">Logo & nhận diện</div>
        <div className="mt-3 flex justify-center rounded-md border border-[var(--ceo-divider)] bg-[var(--ceo-surface-muted)] p-4"><Image src="/logo/logo.png" alt="Logo SkyLux Travel" width={136} height={136} className="h-[136px] w-[136px] object-contain" /></div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between"><Text type="secondary">Tổ chức</Text><Text strong>{organization.data?.name || (organization.isLoading ? 'Đang tải...' : 'Chưa có dữ liệu')}</Text></div>
          <div className="flex items-center justify-between"><Text type="secondary">Múi giờ</Text><Text strong>{organization.data?.timezone || '-'}</Text></div>
          <div className="flex items-center justify-between"><Text type="secondary">Tiền tệ</Text><Text strong>{organization.data?.currency || 'VND'}</Text></div>
          <div className="flex items-center justify-between"><Text type="secondary">Trạng thái</Text><Tag className={organization.data?.status === 'ACTIVE' ? 'skylux-status-valid' : 'skylux-status-info'}>{organization.data?.status || '-'}</Tag></div>
        </div>
        <div className="mt-5 border-t border-[var(--ceo-divider)] pt-4"><div className="mb-3 text-sm font-bold">Màu sắc thương hiệu</div>{[
          ['Xanh chủ đạo', '#0F3D2E'], ['Vàng nhấn', '#D4AF37'], ['Nền chính', '#FFFFFF'], ['Nền phụ', '#F6F8F7'],
        ].map(([label, color]) => <div key={label} className="mb-2 grid grid-cols-[1fr_auto_20px] items-center gap-2 text-xs"><span>{label}</span><code>{color}</code><i className="h-5 w-5 rounded-sm border border-black/10" style={{ background: color }} /></div>)}</div>
        <Button block className="mt-4 skylux-primary-button" disabled title="Không thay đổi chức năng cấu hình">Lưu thiết lập</Button>
      </Card>
      <Card className="ceo-card" title="Trạng thái tích hợp"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có API trạng thái tích hợp" /></Card>
    </aside>
  </div>;
}
