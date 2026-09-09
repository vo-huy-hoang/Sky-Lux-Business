'use client';

import React from 'react';
import { Avatar, Button, Skeleton, Tooltip, Typography } from 'antd';
import {
  DeleteOutlined,
  LoadingOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Message } from '@/types/chat';
import { formatMessageTime, getInitials } from '../types';

const { Text } = Typography;

export interface MessageBubbleListProps {
  messages: Message[];
  isLoadingMessages: boolean;
  typingUsers: Array<{ userId: string; fullName: string; expiresAt?: number }>;
  currentUserId?: string;
  onDeleteMessage: (msgId: string) => void;
  onRetryMessage: (content: string, clientMessageId?: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function MessageBubbleList({
  messages,
  isLoadingMessages,
  typingUsers,
  currentUserId,
  onDeleteMessage,
  onRetryMessage,
  messagesEndRef,
}: MessageBubbleListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
      {isLoadingMessages ? (
        <div className="space-y-4 py-8">
          <Skeleton active avatar paragraph={{ rows: 1 }} />
          <Skeleton active avatar paragraph={{ rows: 1 }} />
        </div>
      ) : messages.length > 0 ? (
        messages.map((msg: Message) => {
          const isMe = msg.senderId === currentUserId;

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
                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm leading-relaxed break-words transition-all ${
                      msg.status === 'failed'
                        ? 'bg-rose-50 border border-rose-300 text-rose-800 rounded-br-none'
                        : isMe
                        ? msg.status === 'sending'
                          ? 'bg-[#007A55]/75 text-white/95 rounded-br-none'
                          : 'bg-[#007A55] text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap m-0">{msg.content}</p>
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
  );
}
