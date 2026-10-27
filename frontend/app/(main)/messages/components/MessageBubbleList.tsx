'use client';

import React from 'react';
import { Avatar, Button, Image, Skeleton, Tooltip, Typography } from 'antd';
import {
  DeleteOutlined,
  LoadingOutlined,
  MessageOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { Message, ChatAttachment } from '@/types/chat';
import { themeTokens } from '@/lib/theme/tokens.config';
import { useTypingUsers } from '@/hooks/chat';
import {
  formatMessageTime,
  getInitials,
  formatFileSize,
  getAttachmentUrl,
  isImageMime,
} from '../types';

const SafeDownloadOutlined = DownloadOutlined || (() => <span data-testid="download-icon" />);
const SafeFilePdfOutlined = FilePdfOutlined || (() => <span data-testid="pdf-icon" />);
const SafeFileWordOutlined = FileWordOutlined || (() => <span data-testid="word-icon" />);
const SafeFileExcelOutlined = FileExcelOutlined || (() => <span data-testid="excel-icon" />);
const SafeFileZipOutlined = FileZipOutlined || (() => <span data-testid="zip-icon" />);
const SafeFileTextOutlined = FileTextOutlined || (() => <span data-testid="text-icon" />);
const SafeFileOutlined = FileOutlined || (() => <span data-testid="file-icon" />);

const { Text } = Typography;

function getDocumentIcon(mimeType: string, fileName: string, isMe: boolean) {
  const lower = (fileName || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('pdf') || lower.endsWith('.pdf')) {
    return <SafeFilePdfOutlined className={isMe ? 'text-rose-200 text-xl' : 'text-rose-500 text-xl'} />;
  }
  if (
    mime.includes('word') ||
    mime.includes('officedocument.word') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  ) {
    return <SafeFileWordOutlined className={isMe ? 'text-blue-200 text-xl' : 'text-blue-500 text-xl'} />;
  }
  if (
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx')
  ) {
    return <SafeFileExcelOutlined className={isMe ? 'text-emerald-200 text-xl' : 'text-emerald-500 text-xl'} />;
  }
  if (
    mime.includes('zip') ||
    mime.includes('compressed') ||
    lower.endsWith('.zip') ||
    lower.endsWith('.rar')
  ) {
    return <SafeFileZipOutlined className={isMe ? 'text-amber-200 text-xl' : 'text-amber-500 text-xl'} />;
  }
  if (mime.includes('text') || lower.endsWith('.txt')) {
    return <SafeFileTextOutlined className={isMe ? 'text-white/80 text-xl' : 'text-slate-500 text-xl'} />;
  }
  return <SafeFileOutlined className={isMe ? 'text-white/80 text-xl' : 'text-slate-400 text-xl'} />;
}

export interface MessageBubbleListProps {
  messages: Message[];
  isLoadingMessages: boolean;
  conversationId?: string | null;
  typingUsers?: Array<{ userId: string; fullName: string; expiresAt?: number }>;
  currentUserId?: string;
  onDeleteMessage: (msgId: string) => void;
  onRetryMessage: (content: string, clientMessageId?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  hasMore?: boolean;
  isLoadingOlder?: boolean;
  onLoadOlder?: () => void;
}

export function MessageBubbleList({
  messages,
  isLoadingMessages,
  conversationId,
  typingUsers: propTypingUsers,
  currentUserId,
  onDeleteMessage,
  onRetryMessage,
  messagesEndRef,
  scrollContainerRef,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
}: MessageBubbleListProps) {
  const realtimeTypingUsers = useTypingUsers(conversationId);
  const rawTypingUsers = propTypingUsers !== undefined ? propTypingUsers : realtimeTypingUsers;
  // TICKET-41.2: Bảo vệ tầng hiển thị không hiện tên của chính mình
  const effectiveTypingUsers = rawTypingUsers.filter((u) => u.userId !== currentUserId);

  // TICKET-42.1: Co-locate tự động cuộn trang khi có người gõ phím ngay trong MessageBubbleList
  React.useEffect(() => {
    if (effectiveTypingUsers.length > 0 && typeof messagesEndRef?.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [effectiveTypingUsers.length, messagesEndRef]);

  // Tự động tải tin nhắn cũ khi người dùng cuộn lên đỉnh (Infinite scrolling)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (
      hasMore &&
      !isLoadingOlder &&
      e.currentTarget.scrollTop < 40 &&
      typeof onLoadOlder === 'function'
    ) {
      onLoadOlder();
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
      data-testid="message-bubble-list-container"
    >
      {/* Tải thêm tin nhắn cũ (TICKET-CHAT-04) */}
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button
            size="small"
            type="text"
            loading={isLoadingOlder}
            onClick={onLoadOlder}
            className="text-xs text-slate-500 hover:text-[var(--color-primary-700)] bg-slate-100 hover:bg-slate-200 rounded-full px-4"
            aria-label="Tải thêm tin nhắn cũ"
          >
            {isLoadingOlder ? 'Đang tải tin nhắn cũ...' : 'Tải thêm tin nhắn cũ'}
          </Button>
        </div>
      )}

      {isLoadingMessages ? (
        <div className="space-y-4 py-8">
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
        </div>
      ) : messages.length > 0 ? (
        messages.map((msg: Message) => {
          const isMe = msg.senderId === currentUserId;
          const attachments: ChatAttachment[] = msg.attachments || [];
          const imageAttachments = attachments.filter((att) => isImageMime(att.mimeType));
          const docAttachments = attachments.filter((att) => !isImageMime(att.mimeType));
          const hasText = Boolean(msg.content && msg.content.trim());

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
                  style={{
                    backgroundColor: themeTokens.avatar.defaultBg,
                    color: themeTokens.avatar.defaultText,
                    fontSize: 12,
                  }}
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
                  {isMe && msg.status !== 'sending' ? (
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      icon={<DeleteOutlined className="text-slate-400 hover:text-red-500 text-xs" />}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteMessage(msg.id)}
                    />
                  ) : null}

                  <div
                    className={`rounded-2xl shadow-sm text-sm leading-relaxed break-words transition-all overflow-hidden ${
                      msg.status === 'failed'
                        ? 'bg-rose-50 border border-rose-300 text-rose-800 rounded-br-none p-3'
                        : isMe
                        ? msg.status === 'sending'
                          ? 'bg-[var(--color-primary-700)]/75 text-white/95 rounded-br-none p-3'
                          : 'bg-[var(--color-primary-700)] text-white rounded-br-none p-3'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none p-3'
                    }`}
                  >
                    {/* Danh sách hình ảnh */}
                    {imageAttachments.length > 0 && (
                      <div className="mb-2">
                        <Image.PreviewGroup>
                          <div
                            className={`grid gap-1.5 ${
                              imageAttachments.length === 1
                                ? 'grid-cols-1 max-w-[260px]'
                                : 'grid-cols-2 max-w-[320px]'
                            }`}
                          >
                            {imageAttachments.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative overflow-hidden rounded-xl bg-black/5 aspect-[4/3] flex items-center justify-center border border-black/10"
                              >
                                <Image
                                  src={getAttachmentUrl(img.url)}
                                  alt={img.originalName}
                                  className="h-full w-full object-cover rounded-xl"
                                  preview={{
                                    src: getAttachmentUrl(img.url),
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      </div>
                    )}

                    {/* Danh sách tài liệu đính kèm (PDF, Word, Excel, ZIP) */}
                    {docAttachments.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {docAttachments.map((doc, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                              isMe
                                ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {getDocumentIcon(doc.mimeType, doc.originalName, isMe)}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`m-0 font-medium truncate ${
                                    isMe ? 'text-white' : 'text-slate-700'
                                  }`}
                                  title={doc.originalName}
                                >
                                  {doc.originalName}
                                </p>
                                <p
                                  className={`m-0 text-[10px] ${
                                    isMe ? 'text-white/70' : 'text-slate-400'
                                  }`}
                                >
                                  {formatFileSize(doc.fileSize)}
                                </p>
                              </div>
                            </div>

                            <a
                              href={getAttachmentUrl(doc.url)}
                              download={doc.originalName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                                isMe
                                  ? 'text-white hover:bg-white/20'
                                  : 'text-slate-600 hover:text-[var(--color-primary-700)] hover:bg-slate-200'
                              }`}
                              title={`Tải xuống ${doc.originalName}`}
                            >
                              <SafeDownloadOutlined className="text-sm" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Nội dung văn bản */}
                    {hasText && (
                      <p
                        className={`whitespace-pre-wrap m-0 ${
                          (imageAttachments.length > 0 || docAttachments.length > 0) &&
                          'pt-2 border-t ' +
                            (isMe ? 'border-white/20' : 'border-slate-100')
                        }`}
                      >
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={`flex items-center gap-2 px-1 text-[10px] text-slate-400 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {isMe && msg.status === 'sending' && (
                    <Tooltip title="Đang gửi...">
                      <span className="flex items-center text-amber-600 font-medium">
                        <LoadingOutlined className="mr-0.5 text-[10px] animate-spin" />
                        Đang gửi
                      </span>
                    </Tooltip>
                  )}
                  {isMe && msg.status === 'failed' && (
                    <span className="flex items-center gap-1">
                      <span className="text-rose-500 font-semibold">Chưa gửi</span>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<ReloadOutlined className="text-[10px]" />}
                        onClick={() => onRetryMessage(msg.content, msg.clientMessageId)}
                        className="p-0 h-auto text-[10px] font-bold underline"
                      >
                        Thử lại
                      </Button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-16">
          <Avatar
            size={56}
            icon={<MessageOutlined />}
            style={{
              backgroundColor: themeTokens.avatar.defaultBg,
              color: themeTokens.avatar.defaultText,
            }}
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
      {effectiveTypingUsers.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
          <div className="flex gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-[var(--color-primary-700)] rounded-full animate-bounce" />
            <span className="inline-block w-1.5 h-1.5 bg-[var(--color-primary-700)] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="inline-block w-1.5 h-1.5 bg-[var(--color-primary-700)] rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>
            {effectiveTypingUsers.map((u) => u.fullName).join(', ')} đang nhập tin nhắn...
          </span>
        </div>
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}
