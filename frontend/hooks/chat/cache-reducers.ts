import { Message } from '@/types/chat';

/**
 * Thêm hoặc cập nhật tin nhắn vào danh sách cache của TanStack Query:
 * 1. Nếu đã có tin nhắn tạm mang clientMessageId này, thay thế tại chỗ để giữ nguyên thứ tự.
 * 2. Chống ghi trùng nếu tin nhắn với ID thật đã tồn tại.
 * 3. Nối vào cuối danh sách nếu là tin nhắn mới từ người khác.
 */
export const appendMessageToCache = (newMessage: Message) => (old: Message[] = []): Message[] => {
  // 1. Nếu đã có tin nhắn tạm mang clientMessageId này, thay thế tại chỗ
  if (
    newMessage.clientMessageId &&
    old.some((msg) => msg.clientMessageId === newMessage.clientMessageId)
  ) {
    return old.map((msg) =>
      msg.clientMessageId === newMessage.clientMessageId
        ? ({ ...newMessage, status: 'sent' as const })
        : msg,
    );
  }

  // 2. Chống lặp nếu đã tồn tại ID thật
  if (old.some((msg) => msg.id === newMessage.id)) {
    return old;
  }

  // 3. Tin nhắn mới từ người khác: Nối vào cuối danh sách
  return [...old, newMessage];
};

/**
 * Xóa tin nhắn khỏi danh sách cache theo messageId (thật) hoặc clientMessageId (tạm)
 */
export const removeMessageFromCache = (messageIdOrClientId: string) => (old: Message[] = []): Message[] => {
  return old.filter(
    (msg) => msg.id !== messageIdOrClientId && msg.clientMessageId !== messageIdOrClientId,
  );
};
