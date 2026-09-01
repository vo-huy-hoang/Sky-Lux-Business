'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Avatar,
  Button,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CloseOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  useChatRealtime,
  useConversationMessages,
  useConversations,
  useCreateConversation,
  useDeleteMessage,
  useSendMessage,
  useStartTyping,
  useStopTyping,
} from '@/hooks/chat';
import { useDossierDetail } from '@/hooks/dossiers';
import { usersService } from '@/services/users.service';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { Conversation, Message } from '@/types/chat';
import { UserItem } from '@/types/user';

const { Text } = Typography;

function formatMessageTime(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name?: string) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Mới nhập', color: 'default' },
  SUBMITTED: { label: 'Đã gửi duyệt', color: 'purple' },
  IN_REVIEW: { label: 'Đang xử lý', color: 'warning' },
  APPROVED: { label: 'Đã duyệt', color: 'success' },
  COMPLETED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
  NEED_CHANGES: { label: 'Cần bổ sung', color: 'processing' },
};

export default function MessagesPage() {
  const user = useAuthStore((state) => state.user);
  const isOperator = user?.roles?.includes('OPERATOR');

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConvName, setNewConvName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Zustand Chat UI Store
  const searchQuery = useChatUIStore((state) => state.searchQuery);
  const setSearchQuery = useChatUIStore((state) => state.setSearchQuery);
  const isCreateModalOpen = useChatUIStore((state) => state.isCreateGroupModalOpen);
  const setIsCreateModalOpen = useChatUIStore((state) => state.setIsCreateGroupModalOpen);
  const draftMessages = useChatUIStore((state) => state.draftMessages);
  const setDraftMessage = useChatUIStore((state) => state.setDraftMessage);
  const clearDraftMessage = useChatUIStore((state) => state.clearDraftMessage);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Danh sách hội thoại
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useConversations();

  // Cuộc hội thoại hiệu lực (đang chọn hoặc mặc định là cái đầu tiên)
  const effectiveConversationId =
    selectedConversationId || (conversations.length > 0 ? conversations[0].id : null);

  // Nội dung tin nhắn nháp tương ứng với hội thoại hiện tại
  const inputText = effectiveConversationId ? draftMessages[effectiveConversationId] || '' : '';

  // Cuộc hội thoại đang chọn
  const activeConversation: Conversation | undefined = useMemo(() => {
    return conversations.find((c) => c.id === effectiveConversationId);
  }, [conversations, effectiveConversationId]);

  // 2. Fetch Tin nhắn của hội thoại được chọn
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useConversationMessages(effectiveConversationId || '');

  // 3. Realtime SSE Listener
  const { typingUsers } = useChatRealtime(effectiveConversationId || undefined);

  // 4. Fetch Thông tin hồ sơ liên quan (nếu có dossierId)
  const { data: relatedDossier } = useDossierDetail(activeConversation?.dossierId || '');

  // 5. Fetch Danh sách người dùng để tạo nhóm mới
  const { data: usersResponse } = useQuery({
    queryKey: queryKeys.users.list({ page: 1, pageSize: 50 }),
    queryFn: () => usersService.getUsers({ page: 1, pageSize: 50 }),
  });
  const allUsers: UserItem[] = (Array.isArray(usersResponse) ? usersResponse : usersResponse?.data) || [];

  // 6. Mutations
  const sendMessageMutation = useSendMessage(effectiveConversationId || '');
  const deleteMessageMutation = useDeleteMessage(effectiveConversationId || '');
  const createConversationMutation = useCreateConversation();
  const startTypingMutation = useStartTyping(effectiveConversationId || '');
  const stopTypingMutation = useStopTyping(effectiveConversationId || '');

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || !effectiveConversationId) return;

    sendMessageMutation.mutate(text, {
      onSuccess: () => {
        clearDraftMessage(effectiveConversationId);
        if (effectiveConversationId) {
          stopTypingMutation.mutate();
        }
      },
      onError: () => {
        message.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
      },
    });
  };

  // Xử lý gõ phím và lưu tin nhắn nháp tức thời vào Zustand Store
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!effectiveConversationId) return;

    setDraftMessage(effectiveConversationId, val);
    startTypingMutation.mutate();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTypingMutation.mutate();
    }, 2000);
  };



  // Xử lý tạo cuộc trò chuyện mới
  const handleCreateConversation = () => {
    if (selectedUserIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 người tham gia');
      return;
    }

    createConversationMutation.mutate(
      {
        name: newConvName.trim() || undefined,
        isGroup: selectedUserIds.length > 1,
        userIds: selectedUserIds,
      },
      {
        onSuccess: (newConv) => {
          message.success('Đã tạo cuộc trò chuyện mới');
          setIsCreateModalOpen(false);
          setNewConvName('');
          setSelectedUserIds([]);
          if (newConv?.id) {
            setSelectedConversationId(newConv.id);
          }
        },
        onError: () => {
          message.error('Không thể tạo cuộc trò chuyện');
        },
      },
    );
  };

  // Lọc danh sách hội thoại theo từ khóa tìm kiếm
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(query);
      const memberMatch = c.members?.some((m) =>
        m.user?.fullName?.toLowerCase().includes(query),
      );
      return nameMatch || memberMatch;
    });
  }, [conversations, searchQuery]);

  // Tên hiển thị của cuộc hội thoại
  const getConversationTitle = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherMembers = conv.members?.filter((m) => m.userId !== user?.id) || [];
    if (otherMembers.length === 1) {
      return otherMembers[0].user?.fullName || 'Người dùng';
    }
    if (otherMembers.length > 1) {
      return otherMembers.map((m) => m.user?.fullName).join(', ');
    }
    return 'Cuộc trò chuyện';
  };

  return (
    <div className={`skylux-message-workspace ${isOperator ? 'op-messages-page' : ''}`}>
      {/* ========================================================================= */}
      {/* 1. CỘT TRÁI: DANH SÁCH CUỘC TRÒ CHUYỆN                                    */}
      {/* ========================================================================= */}
      <section className="skylux-message-list" aria-label="Danh sách cuộc trò chuyện">
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <Text
              strong
              className={`text-[22px] leading-none text-slate-900 ${
                isOperator ? 'op-message-list-title' : ''
              }`}
            >
              Tin nhắn
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#007A55] hover:bg-[#006646]"
            >
              Tạo mới
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm kiếm cuộc trò chuyện"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              aria-label="Tìm kiếm cuộc trò chuyện"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoadingConversations ? (
            <div className="p-4 space-y-3">
              <Skeleton active avatar paragraph={{ rows: 1 }} />
              <Skeleton active avatar paragraph={{ rows: 1 }} />
              <Skeleton active avatar paragraph={{ rows: 1 }} />
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === effectiveConversationId;
              const title = getConversationTitle(conv);

              const otherMembers =
                conv.members?.filter((m) => m.userId !== user?.id) || [];
              const primaryMember = otherMembers[0]?.user;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                    isSelected
                      ? 'bg-[#EAF5EF] border-l-4 border-[#007A55]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <Avatar
                    size={40}
                    style={{
                      backgroundColor: conv.isGroup ? '#2F80ED' : '#007A55',
                      color: '#FFFFFF',
                      fontWeight: 600,
                    }}
                    icon={conv.isGroup ? <TeamOutlined /> : undefined}
                  >
                    {!conv.isGroup && getInitials(primaryMember?.fullName || title)}
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <Text
                        strong
                        className={`truncate text-sm ${
                          isSelected ? 'text-[#007A55]' : 'text-slate-800'
                        }`}
                      >
                        {title}
                      </Text>
                      <Text className="text-[11px] text-slate-400 shrink-0 ml-1">
                        {formatMessageTime(conv.updatedAt)}
                      </Text>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between">
                      <Text className="truncate text-xs text-slate-500">
                        {conv.dossierId ? (
                          <span className="text-[#007A55] font-medium mr-1">
                            [Hồ sơ tour]
                          </span>
                        ) : null}
                        {conv.members?.length ? `${conv.members.length} thành viên` : ''}
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-5 py-8 text-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-sm text-slate-500">
                    {searchQuery
                      ? 'Không tìm thấy cuộc trò chuyện phù hợp'
                      : 'Chưa có cuộc trò chuyện'}
                  </span>
                }
              >
                <Button
                  type="link"
                  size="small"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-[#007A55]"
                >
                  Tạo cuộc trò chuyện đầu tiên
                </Button>
              </Empty>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CỘT GIỮA: NỘI DUNG CUỘC TRÒ CHUYỆN                                      */}
      {/* ========================================================================= */}
      <main className="skylux-message-thread flex flex-col flex-1 bg-[#F9FBFA]" aria-label="Nội dung cuộc trò chuyện">
        {activeConversation ? (
          <>
            {/* Header cuộc hội thoại */}
            <header className="skylux-message-thread-header flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  size={40}
                  style={{
                    backgroundColor: activeConversation.isGroup ? '#2F80ED' : '#007A55',
                    color: '#FFFFFF',
                    fontWeight: 600,
                  }}
                  icon={activeConversation.isGroup ? <TeamOutlined /> : undefined}
                >
                  {!activeConversation.isGroup &&
                    getInitials(getConversationTitle(activeConversation))}
                </Avatar>
                <div className="min-w-0">
                  <Text strong className="block truncate text-base text-slate-900">
                    {getConversationTitle(activeConversation)}
                  </Text>
                  <Text className="block text-xs text-slate-500">
                    {activeConversation.members?.length || 0} người tham gia
                    {relatedDossier ? ` • Hồ sơ: ${relatedDossier.code}` : ''}
                  </Text>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {relatedDossier ? (
                  <Link href={`/main/dossiers/${relatedDossier.id}`}>
                    <Button size="small" icon={<FolderOpenOutlined />} className="text-[#007A55]">
                      Mở hồ sơ
                    </Button>
                  </Link>
                ) : null}
                <Tooltip title={showRightPanel ? 'Ẩn thông tin' : 'Hiện thông tin'}>
                  <Button
                    type="text"
                    shape="circle"
                    icon={<InfoCircleOutlined className="text-base" />}
                    onClick={() => setShowRightPanel((prev) => !prev)}
                  />
                </Tooltip>
              </div>
            </header>

            {/* Khung cuộn danh sách tin nhắn */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {isLoadingMessages ? (
                <div className="space-y-4 py-8">
                  <Skeleton active avatar paragraph={{ rows: 1 }} />
                  <Skeleton active avatar paragraph={{ rows: 1 }} />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg: Message) => {
                  const isMe = msg.senderId === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 items-end group ${
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {!isMe ? (
                        <Avatar
                          size={32}
                          style={{ backgroundColor: '#0A2540', color: '#fff', fontSize: 12 }}
                        >
                          {getInitials(msg.sender?.fullName)}
                        </Avatar>
                      ) : null}

                      <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe ? (
                          <span className="text-[11px] font-medium text-slate-500 ml-1">
                            {msg.sender?.fullName || 'Thành viên'}
                          </span>
                        ) : null}

                        <div className="flex items-center gap-1.5">
                          {isMe ? (
                            <Button
                              type="text"
                              size="small"
                              shape="circle"
                              icon={<DeleteOutlined className="text-slate-400 hover:text-red-500 text-xs" />}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteMessageMutation.mutate(msg.id)}
                            />
                          ) : null}

                          <div
                            className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed break-words ${
                              isMe
                                ? 'bg-[#007A55] text-white rounded-br-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                          </div>
                        </div>

                        <span
                          className={`block text-[10px] text-slate-400 px-1 ${
                            isMe ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <Avatar
                    size={56}
                    icon={<MessageOutlined />}
                    style={{ backgroundColor: '#EAF5EF', color: '#007A55' }}
                  />
                  <Text strong className="mt-3 block text-base text-slate-700">
                    Bắt đầu cuộc trò chuyện
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1 max-w-sm">
                    Chưa có tin nhắn nào trong cuộc hội thoại này. Hãy gửi lời chào đầu tiên!
                  </Text>
                </div>
              )}

              {/* Thông báo đang gõ phím */}
              {typingUsers.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
                  <div className="flex gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-[#007A55] rounded-full animate-bounce" />
                    <span className="inline-block w-1.5 h-1.5 bg-[#007A55] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="inline-block w-1.5 h-1.5 bg-[#007A55] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>
                    {typingUsers.map((u) => u.fullName).join(', ')} đang nhập tin nhắn...
                  </span>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Khung nhập tin nhắn */}
            <div className="border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-[#007A55] focus-within:bg-white transition-colors">
                <Input
                  variant="borderless"
                  placeholder="Nhập tin nhắn... (Nhấn Enter để gửi)"
                  value={inputText}
                  onChange={handleInputChange}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  aria-label="Nội dung tin nhắn"
                />

                <Tooltip title="Gửi tin nhắn">
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    disabled={!inputText.trim()}
                    loading={sendMessageMutation.isPending}
                    onClick={handleSendMessage}
                    className="bg-[#007A55] hover:bg-[#006646]"
                    aria-label="Gửi tin nhắn"
                  />
                </Tooltip>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
            <Empty
              image={<MessageOutlined className="text-4xl text-[#B7D3C7]" />}
              description={
                <div className="mt-3">
                  <Text strong className="block text-base text-slate-700">
                    Chưa chọn cuộc trò chuyện
                  </Text>
                  <Text className="mt-1 block text-sm text-slate-500">
                    Chọn một cuộc trò chuyện từ danh sách bên trái hoặc tạo mới để bắt đầu.
                  </Text>
                </div>
              }
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#007A55]"
              >
                Tạo cuộc trò chuyện mới
              </Button>
            </Empty>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. CỘT PHẢI: THÔNG TIN HỘI THOẠI & HỒ SƠ TOUR LIÊN QUAN                   */}
      {/* ========================================================================= */}
      {showRightPanel && activeConversation ? (
        <aside className="skylux-message-information w-80 border-l border-slate-200 bg-white" aria-label="Thông tin hội thoại">
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <Text strong className="text-base text-slate-900">
              Thông tin hội thoại
            </Text>
            <Tooltip title="Đóng thông tin">
              <Button
                type="text"
                shape="circle"
                icon={<CloseOutlined />}
                onClick={() => setShowRightPanel(false)}
                aria-label="Đóng thông tin hội thoại"
              />
            </Tooltip>
          </header>

          <div className="space-y-6 px-5 py-5 overflow-y-auto">
            {/* Hồ sơ tour liên quan */}
            <section>
              <Text strong className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hồ sơ tour liên quan
              </Text>
              {relatedDossier ? (
                <div className="mt-2.5 rounded-xl border border-slate-200 bg-[#F7FAF8] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Text strong className="text-sm text-[#007A55]">
                      {relatedDossier.code}
                    </Text>
                    <Tag color={statusConfig[relatedDossier.status]?.color || 'default'}>
                      {statusConfig[relatedDossier.status]?.label || relatedDossier.status}
                    </Tag>
                  </div>
                  <Text className="block text-xs font-medium text-slate-800">
                    {relatedDossier.name}
                  </Text>
                  {relatedDossier.customer?.displayName ? (
                    <Text className="block text-xs text-slate-500">
                      Khách hàng: {relatedDossier.customer.displayName}
                    </Text>
                  ) : null}
                  {relatedDossier.route ? (
                    <Text className="block text-xs text-slate-500">
                      Hành trình: {relatedDossier.route}
                    </Text>
                  ) : null}
                  <Link href={`/main/dossiers/${relatedDossier.id}`} className="block pt-1">
                    <Button block size="small" type="dashed" className="text-xs text-[#007A55]">
                      Xem chi tiết hồ sơ
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                  <FolderOpenOutlined className="text-lg text-slate-400" />
                  <Text className="mt-1 block text-xs text-slate-400">
                    Hội thoại chung (Không gắn với hồ sơ tour)
                  </Text>
                </div>
              )}
            </section>

            {/* Danh sách thành viên */}
            <section>
              <div className="flex items-center justify-between">
                <Text strong className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Thành viên ({activeConversation.members?.length || 0})
                </Text>
              </div>

              <div className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {activeConversation.members?.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2.5">
                    <Avatar size={32} style={{ backgroundColor: '#0A2540' }}>
                      {getInitials(member.user?.fullName)}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Text strong className="block truncate text-xs text-slate-800">
                        {member.user?.fullName || 'Thành viên'}
                        {member.userId === user?.id ? ' (Bạn)' : ''}
                      </Text>
                      <Text className="block truncate text-[11px] text-slate-400">
                        {member.user?.email || member.user?.employeeCode || '-'}
                      </Text>
                    </div>
                    {member.role === 'ADMIN' ? (
                      <Tag color="gold" className="text-[10px] m-0">
                        Quản trị
                      </Tag>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>
      ) : null}

      {/* ========================================================================= */}
      {/* 4. MODAL TẠO CUỘC TRÒ CHUYỆN MỚI                                          */}
      {/* ========================================================================= */}
      <Modal
        title="Tạo cuộc trò chuyện mới"
        open={isCreateModalOpen}
        onOk={handleCreateConversation}
        onCancel={() => {
          setIsCreateModalOpen(false);
          setNewConvName('');
          setSelectedUserIds([]);
        }}
        confirmLoading={createConversationMutation.isPending}
        okText="Tạo cuộc trò chuyện"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-[#007A55]' }}
      >
        <div className="space-y-4 pt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên cuộc trò chuyện (Tùy chọn)
            </label>
            <Input
              placeholder="VD: Nhóm xử lý Tour Nhật Bản hè 2026"
              value={newConvName}
              onChange={(e) => setNewConvName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn người tham gia <span className="text-red-500">*</span>
            </label>
            <Select
              mode="multiple"
              className="w-full"
              placeholder="Chọn các thành viên..."
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              options={allUsers
                .filter((u: UserItem) => u.id !== user?.id)
                .map((u: UserItem) => ({
                  label: `${u.fullName} (${u.email})`,
                  value: u.id,
                }))}

            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

