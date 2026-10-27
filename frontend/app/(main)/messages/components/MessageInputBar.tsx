'use client';

import React, { useRef, useState } from 'react';
import { Button, Input, Tooltip, message as antdMessage } from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  PictureOutlined,
  CloseOutlined,
  LoadingOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons';
import { ChatAttachment } from '@/types/chat';
import { chatService } from '@/services/chat.service';
import { formatFileSize } from '../types';

const SafeSendOutlined = SendOutlined || (() => <span data-testid="send-icon" />);
const SafePaperClipOutlined = PaperClipOutlined || (() => <span data-testid="paperclip-icon" />);
const SafePictureOutlined = PictureOutlined || (() => <span data-testid="picture-icon" />);
const SafeCloseOutlined = CloseOutlined || (() => <span data-testid="close-icon" />);
const SafeLoadingOutlined = LoadingOutlined || (() => <span data-testid="loading-icon" />);
const SafeFilePdfOutlined = FilePdfOutlined || (() => <span data-testid="pdf-icon" />);
const SafeFileWordOutlined = FileWordOutlined || (() => <span data-testid="word-icon" />);
const SafeFileExcelOutlined = FileExcelOutlined || (() => <span data-testid="excel-icon" />);
const SafeFileZipOutlined = FileZipOutlined || (() => <span data-testid="zip-icon" />);
const SafeFileTextOutlined = FileTextOutlined || (() => <span data-testid="text-icon" />);
const SafeFileOutlined = FileOutlined || (() => <span data-testid="file-icon" />);

export interface PendingAttachment extends ChatAttachment {
  localId: string;
  isUploading?: boolean;
  error?: string;
  previewBlobUrl?: string;
}

export interface MessageInputBarProps {
  inputText: string;
  isSending: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (
    overrideText?: string,
    clientMessageId?: string,
    attachments?: ChatAttachment[],
  ) => void;
}

function getFileIcon(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (mimeType.includes('pdf') || lower.endsWith('.pdf')) {
    return <SafeFilePdfOutlined className="text-rose-500 text-lg" />;
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('officedocument.word') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  ) {
    return <SafeFileWordOutlined className="text-blue-500 text-lg" />;
  }
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx')
  ) {
    return <SafeFileExcelOutlined className="text-emerald-500 text-lg" />;
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    lower.endsWith('.zip') ||
    lower.endsWith('.rar')
  ) {
    return <SafeFileZipOutlined className="text-amber-500 text-lg" />;
  }
  if (mimeType.includes('text') || lower.endsWith('.txt')) {
    return <SafeFileTextOutlined className="text-slate-500 text-lg" />;
  }
  return <SafeFileOutlined className="text-slate-400 text-lg" />;
}

export function MessageInputBar({
  inputText,
  isSending,
  onInputChange,
  onSendMessage,
}: MessageInputBarProps) {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = ''; // Reset input to allow selecting same file again

    for (const file of fileList) {
      if (file.size > 15 * 1024 * 1024) {
        antdMessage.error(`Tệp "${file.name}" vượt quá giới hạn 15MB`);
        continue;
      }

      const isImg = file.type.startsWith('image/');
      const localId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const previewBlobUrl =
        isImg && typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function'
          ? window.URL.createObjectURL(file)
          : undefined;

      const newPending: PendingAttachment = {
        localId,
        url: '',
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        thumbnailUrl: previewBlobUrl,
        previewBlobUrl,
        isUploading: true,
      };

      setPendingAttachments((prev) => [...prev, newPending]);

      try {
        const uploaded = await chatService.uploadAttachment(file);
        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  ...uploaded,
                  isUploading: false,
                }
              : item,
          ),
        );
      } catch {
        antdMessage.error(`Tải lên tệp "${file.name}" thất bại`);
        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  isUploading: false,
                  error: 'Tải lên thất bại',
                }
              : item,
          ),
        );
      }
    }
  };

  const removePendingAttachment = (localId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (
        target?.previewBlobUrl &&
        typeof window !== 'undefined' &&
        typeof window.URL?.revokeObjectURL === 'function'
      ) {
        window.URL.revokeObjectURL(target.previewBlobUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  };

  const handleSend = () => {
    const hasUploading = pendingAttachments.some((item) => item.isUploading);
    if (hasUploading) {
      antdMessage.warning('Vui lòng đợi tệp hoàn tất tải lên');
      return;
    }

    const readyAttachments = pendingAttachments
      .filter((item) => !item.isUploading && !item.error && item.url)
      .map(({ localId, isUploading, error, previewBlobUrl, ...rest }) => rest);

    const hasText = Boolean(inputText.trim());
    const hasFiles = readyAttachments.length > 0;

    if (!hasText && !hasFiles) return;

    onSendMessage(
      inputText,
      undefined,
      hasFiles ? readyAttachments : undefined,
    );

    // Dọn dẹp preview blob URLs
    pendingAttachments.forEach((item) => {
      if (item.previewBlobUrl) {
        URL.revokeObjectURL(item.previewBlobUrl);
      }
    });

    setPendingAttachments([]);
  };

  const hasContent = Boolean(inputText.trim());
  const hasReadyAttachments = pendingAttachments.some(
    (item) => !item.isUploading && !item.error && item.url,
  );
  const isUploadingAny = pendingAttachments.some((item) => item.isUploading);
  const canSend = (hasContent || hasReadyAttachments) && !isSending && !isUploadingAny;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      {/* File input ẩn cho mọi tệp */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
        data-testid="chat-file-input"
      />

      {/* File input ẩn chuyên cho hình ảnh */}
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        data-testid="chat-image-input"
      />

      {/* Danh sách tệp đính kèm đang chờ gửi */}
      {pendingAttachments.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
          {pendingAttachments.map((item) => {
            const isImg = item.mimeType.startsWith('image/') && item.previewBlobUrl;

            return (
              <div
                key={item.localId}
                className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-2.5 shadow-sm text-xs group"
              >
                {isImg ? (
                  <div className="relative h-9 w-9 overflow-hidden rounded border border-slate-200 flex-shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewBlobUrl}
                      alt={item.originalName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-100 flex-shrink-0">
                    {getFileIcon(item.mimeType, item.originalName)}
                  </div>
                )}

                <div className="max-w-[140px] truncate leading-tight">
                  <p className="m-0 font-medium text-slate-700 truncate" title={item.originalName}>
                    {item.originalName}
                  </p>
                  <p className="m-0 text-[10px] text-slate-400">
                    {item.isUploading ? (
                      <span className="flex items-center text-[var(--color-primary-700)]">
                        <SafeLoadingOutlined className="mr-1 animate-spin text-[10px]" />
                        Đang tải...
                      </span>
                    ) : item.error ? (
                      <span className="text-rose-500 font-semibold">{item.error}</span>
                    ) : (
                      formatFileSize(item.fileSize)
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removePendingAttachment(item.localId)}
                  className="ml-1 text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded-full hover:bg-slate-100"
                  aria-label={`Xóa đính kèm ${item.originalName}`}
                >
                  <SafeCloseOutlined className="text-[11px]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-[var(--color-primary-700)] focus-within:bg-white transition-colors">
        {/* Nút đính kèm tệp */}
        <Tooltip title="Đính kèm tài liệu (PDF, Word, Excel, ZIP... tối đa 15MB)">
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<SafePaperClipOutlined className="text-slate-500 hover:text-[var(--color-primary-700)] text-base" />}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Đính kèm tệp"
          />
        </Tooltip>

        {/* Nút gửi hình ảnh */}
        <Tooltip title="Gửi ảnh vé / voucher / hộ chiếu (JPG, PNG, WebP...)">
          <Button
            type="text"
            shape="circle"
            size="small"
            icon={<SafePictureOutlined className="text-slate-500 hover:text-[var(--color-primary-700)] text-base" />}
            onClick={() => imageInputRef.current?.click()}
            aria-label="Gửi ảnh"
          />
        </Tooltip>

        <Input
          variant="borderless"
          placeholder="Nhập tin nhắn... (Nhấn Enter để gửi)"
          value={inputText}
          onChange={onInputChange}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              if (canSend) {
                handleSend();
              }
            }
          }}
          aria-label="Nội dung tin nhắn"
        />

        <Tooltip title="Gửi tin nhắn">
          <Button
            type="primary"
            shape="circle"
            icon={<SafeSendOutlined />}
            disabled={!canSend}
            loading={isSending}
            onClick={handleSend}
            className="bg-[var(--color-primary-700)] hover:bg-[var(--color-primary-800)]"
            aria-label="Gửi tin nhắn"
          />
        </Tooltip>
      </div>
    </div>
  );
}
