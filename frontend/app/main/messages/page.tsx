'use client';

import React from 'react';
import {
  Avatar,
  Button,
  Empty,
  Input,
  Tooltip,
  Typography,
} from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  FilterOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  PaperClipOutlined,
  PhoneOutlined,
  SearchOutlined,
  SendOutlined,
  SmileOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/lib/stores/auth-store';

const { Text } = Typography;

function DisabledIconButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip title={label}>
      <Button type="text" shape="circle" icon={icon} disabled aria-label={label} />
    </Tooltip>
  );
}

export default function MessagesPage() {
  const user = useAuthStore((state) => state.user);
  const isOperator = user?.roles?.includes('OPERATOR');

  return (
    <div className={`skylux-message-workspace ${isOperator ? 'op-messages-page' : ''}`}>
      <section className="skylux-message-list" aria-label="Danh sách cuộc trò chuyện">
        <div className="px-5 pb-4 pt-5">
          <Text strong className={`text-[26px] leading-none text-slate-900 ${isOperator ? 'op-message-list-title' : ''}`}>Tin nhắn</Text>
          <div className="mt-4 flex gap-2">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm kiếm cuộc trò chuyện"
              disabled
              aria-label="Tìm kiếm cuộc trò chuyện"
            />
            <Tooltip title="Lọc hội thoại">
              <Button icon={<FilterOutlined />} disabled aria-label="Lọc hội thoại" />
            </Tooltip>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-8">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span className="text-sm text-slate-500">
                Chưa có cuộc trò chuyện để hiển thị
              </span>
            }
          >
            <Text className="block max-w-[230px] text-xs leading-5 text-slate-400">
              Danh sách hội thoại sẽ hiển thị tại đây khi API nhắn tin sẵn sàng.
            </Text>
          </Empty>
        </div>
      </section>

      <main className="skylux-message-thread" aria-label="Nội dung cuộc trò chuyện">
        <header className="skylux-message-thread-header">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size={44} icon={<MessageOutlined />} style={{ backgroundColor: '#EAF5EF', color: '#007A55' }} />
            <div className="min-w-0">
              <Text strong className="block truncate text-base text-slate-900">Chưa chọn hội thoại</Text>
              <Text className="block text-xs text-slate-500">Chọn một cuộc trò chuyện ở danh sách bên trái</Text>
            </div>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <DisabledIconButton label="Gọi thoại" icon={<PhoneOutlined className="text-lg" />} />
            <DisabledIconButton label="Gọi video" icon={<VideoCameraOutlined className="text-lg" />} />
            <DisabledIconButton label="Thông tin hội thoại" icon={<InfoCircleOutlined className="text-lg" />} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
          <Empty
            image={<MessageOutlined className="text-4xl text-[#B7D3C7]" />}
            description={
              <div className="mt-3">
                <Text strong className="block text-base text-slate-700">Chưa có nội dung hội thoại</Text>
                <Text className="mt-1 block text-sm text-slate-500">Kết nối API chat để xem và gửi tin nhắn theo dữ liệu thực.</Text>
              </div>
            }
          />
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <Input
              variant="borderless"
              disabled
              placeholder="Chọn hội thoại để nhập tin nhắn"
              aria-label="Nội dung tin nhắn"
            />
            <Tooltip title="Đính kèm tệp">
              <Button type="text" shape="circle" icon={<PaperClipOutlined className="text-lg" />} disabled aria-label="Đính kèm tệp" />
            </Tooltip>
            <Tooltip title="Biểu cảm">
              <Button type="text" shape="circle" icon={<SmileOutlined className="text-lg" />} disabled aria-label="Biểu cảm" />
            </Tooltip>
            <Tooltip title="Gửi tin nhắn">
              <Button type="primary" shape="circle" icon={<SendOutlined />} disabled aria-label="Gửi tin nhắn" />
            </Tooltip>
          </div>
        </div>
      </main>

      <aside className="skylux-message-information" aria-label="Thông tin hội thoại">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <Text strong className="text-base text-slate-900">Thông tin hội thoại</Text>
          <Tooltip title="Đóng thông tin hội thoại">
            <Button type="text" shape="circle" icon={<CloseOutlined />} disabled aria-label="Đóng thông tin hội thoại" />
          </Tooltip>
        </header>

        <div className="space-y-7 px-5 py-6">
          <section>
            <Text strong className="text-[15px] text-slate-800">Hồ sơ liên quan</Text>
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
              <FolderOpenOutlined className="text-xl text-[#8AB7A2]" />
              <Text className="mt-2 block text-sm text-slate-500">Chưa chọn hội thoại</Text>
              <Text className="mt-1 block text-xs leading-5 text-slate-400">Thông tin hồ sơ liên quan sẽ được hiển thị tại đây.</Text>
            </div>
          </section>

          <section>
            <Text strong className="text-[15px] text-slate-800">Trạng thái hồ sơ</Text>
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
              <TeamOutlined className="text-xl text-[#8AB7A2]" />
              <Text className="mt-2 block text-sm text-slate-500">Chưa có dữ liệu trạng thái</Text>
            </div>
          </section>

          <section>
            <Text strong className="text-[15px] text-slate-800">Tệp đính kèm</Text>
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
              <FileTextOutlined className="text-xl text-[#8AB7A2]" />
              <Text className="mt-2 block text-sm text-slate-500">Chưa có tệp đính kèm</Text>
            </div>
          </section>

          <div className="rounded-lg border border-[#DCECE3] bg-[#F3F8F5] px-4 py-3 text-xs leading-5 text-[#397158]">
            Màn hình đã sẵn sàng cho dữ liệu hội thoại. Tài khoản hiện tại: {user?.fullName || 'Người dùng'}.
          </div>
        </div>
      </aside>
    </div>
  );
}
