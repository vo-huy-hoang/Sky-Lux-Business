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

/**
 * Thuật toán Exponential Backoff có Jitter cho kết nối SSE Stream (Phase 4):
 * - Attempt <= 0: 0ms
 * - Lần 1: 1s + ngẫu nhiên 0–500ms (1000ms - 1500ms)
 * - Lần 2: 2s + ngẫu nhiên 0–1000ms (2000ms - 3000ms)
 * - Lần 3: 4s + ngẫu nhiên 0–2000ms (4000ms - 6000ms)
 * - Giới hạn tối đa (Max backoff): 15 giây (15000ms).
 *
 * @param attempt Số lần đã thử lại (bắt đầu từ 1)
 * @param baseDelay Độ trễ cơ sở tính bằng mili-giây (mặc định 1000ms)
 * @param maxDelay Độ trễ trần tối đa tính bằng mili-giây (mặc định 15000ms)
 * @returns Thời gian chờ ngẫu nhiên tính bằng mili-giây
 */
export function calculateSseBackoffWithJitter(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 15000,
): number {
  if (attempt <= 0) return 0;
  const base = Math.min(maxDelay, baseDelay * Math.pow(2, attempt - 1));
  const maxJitter = Math.min(base / 2, 2000);
  const jitter = Math.floor(Math.random() * (maxJitter + 1));
  return Math.min(maxDelay, base + jitter);
}
