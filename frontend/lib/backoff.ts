/**
 * Thuật toán Exponential Backoff with Full Jitter theo chuẩn AWS Architecture
 * - Attempt 0: Fast Immediate Retry (0ms) cho sự cố giật mạng nhẹ.
 * - Attempt >= 1: delay = random(0, min(maxDelay, baseDelay * 2^(attempt - 1)))
 *
 * @param attempt Số lần đã thử lại (bắt đầu từ 0 hoặc 1)
 * @param baseDelay Độ trễ cơ sở tính bằng mili-giây (mặc định 500ms)
 * @param maxDelay Độ trễ trần tối đa tính bằng mili-giây (mặc định 5000ms)
 * @returns Thời gian chờ ngẫu nhiên tính bằng mili-giây
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelay = 500,
  maxDelay = 5000,
): number {
  if (attempt <= 0) return 0;
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));
  return Math.floor(Math.random() * exponential);
}
