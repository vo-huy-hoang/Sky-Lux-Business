'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Space, Typography, Spin } from 'antd';
import { SendOutlined, MessageOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  useConversationMessages,
  useSendMessage,
  useChatRealtime,
  useMarkMessageRead,
  useStartTyping,
  useStopTyping,
  useConversationParticipants,
} from '@/hooks/chat';

const { Text } = Typography;

interface ChatBoxProps {
  conversationId: string;
  onClose?: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ conversationId, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const isTypingRef = useRef(isTyping);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);
  // 1. Fetch data & hooks
  const { data: messages = [], isLoading } = useConversationMessages(conversationId);
  const { data: participants = [] } = useConversationParticipants(conversationId);
  const sendMessageMutation = useSendMessage(conversationId);
  const markReadMutation = useMarkMessageRead(conversationId);
  const startTypingMutation = useStartTyping(conversationId);
  const stopTypingMutation = useStopTyping(conversationId);

  // 2. Real-time stream (SSE) triggers cache updates and returns typingUsers list
  const { typingUsers } = useChatRealtime(conversationId);

  // 3. Auto-scroll to bottom of chat history on new messages or typing changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // 4. Mark all messages as read when opening conversation or receiving new ones
  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      markReadMutation.mutate({ messageId: latestMsg.id });
    }
  }, [messages, conversationId, markReadMutation]);

  // 5. Handle Typing Status Broadcasts
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Broadcast starting typing if not already in state
    if (!isTyping) {
      setIsTyping(true);
      startTypingMutation.mutate();
    }

    // Debounce to stop typing status after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTypingMutation.mutate();
    }, 2000);
  };

  // 6. Handle sending message
  const handleSend = () => {
    if (!inputText.trim()) return;

    sendMessageMutation.mutate(inputText.trim(), {
      onSuccess: () => {
        setInputText('');
        setIsTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        stopTypingMutation.mutate();
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Cleanup timers and broadcast stop typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        stopTypingMutation.mutate();
      }
    };
  }, [conversationId, stopTypingMutation]);

  return (
    <Card
      size="small"
      title={
        <div className="flex justify-between items-center w-full">
          <Space>
            <MessageOutlined className="text-blue-500 text-lg" />
            <div>
              <Text strong className="text-sm text-slate-800">Hội thoại nhóm</Text>
              <div className="text-[10px] text-slate-400 font-medium">
                {participants.length} thành viên trực tuyến
              </div>
            </div>
          </Space>
          {onClose && (
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined className="text-slate-500" />}
              onClick={onClose}
            />
          )}
        </div>
      }
      className="w-96 rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white"
      styles={{ body: { padding: 0 } }}
    >
      {/* Dynamic Keyframe Style injection for Typing Dots animation */}
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        .typing-dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #94a3b8;
          animation: typingBounce 1.4s infinite ease-in-out both;
          margin-right: 2px;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
      `}</style>

      <div className="flex flex-col h-[480px]">
        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Spin tip="Đang nạp tin nhắn..." />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400">
              <MessageOutlined className="text-3xl mb-2 text-slate-300" />
              <Text type="secondary" className="text-xs">Chưa có tin nhắn nào. Bắt đầu trò chuyện!</Text>
            </div>
          ) : (
            <List
              split={false}
              dataSource={messages}
              renderItem={(item) => {
                const isMe = item.senderId === currentUser?.id;
                return (
                  <div className={`flex mb-3 items-start gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <Avatar
                        size="small"
                        className="bg-blue-500 mt-1 shrink-0"
                        icon={<UserOutlined />}
                      >
                        {item.sender?.fullName?.charAt(0)}
                      </Avatar>
                    )}
                    <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Text strong className="text-[11px] text-slate-600">
                          {isMe ? 'Bạn' : (item.sender?.fullName || 'Người dùng')}
                        </Text>
                        <Text className="text-[9px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </div>
                      <div className={`px-3 py-2 rounded-2xl text-[13px] shadow-xs break-words ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}>
                        {item.content}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator Overlay */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
            <div className="flex items-center">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <Text type="secondary" className="text-[10px] text-slate-400">
              {typingUsers.map((u) => u.fullName).join(', ')} đang nhập...
            </Text>
          </div>
        )}

        {/* Chat Box Input Footer */}
        <div className="p-3 border-t border-slate-200/60 flex gap-2 bg-white">
          <Input
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending}
            className="rounded-lg text-sm border-slate-200"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sendMessageMutation.isPending}
            disabled={!inputText.trim()}
            className="rounded-lg shadow-sm flex items-center justify-center shrink-0"
          />
        </div>
      </div>
    </Card>
  );
};
