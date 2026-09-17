'use client';

import React from 'react';
import { Button, Input, Tooltip } from 'antd';
import { SendOutlined } from '@ant-design/icons';

export interface MessageInputBarProps {
  inputText: string;
  isSending: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
}

export function MessageInputBar({
  inputText,
  isSending,
  onInputChange,
  onSendMessage,
}: MessageInputBarProps) {
  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-[#007A55] focus-within:bg-white transition-colors">
        <Input
          variant="borderless"
          placeholder="Nhập tin nhắn... (Nhấn Enter để gửi)"
          value={inputText}
          onChange={onInputChange}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              if (!isSending && inputText.trim()) {
                onSendMessage();
              }
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
            loading={isSending}
            onClick={onSendMessage}
            className="bg-[#007A55] hover:bg-[#006646]"
            aria-label="Gửi tin nhắn"
          />
        </Tooltip>
      </div>
    </div>
  );
}
