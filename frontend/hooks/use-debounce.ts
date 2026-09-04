import { useState, useEffect } from 'react';

/**
 * Custom Hook debounce giá trị bất kỳ theo khoảng thời gian chỉ định
 * @param value Giá trị cần debounce (string, number, object...)
 * @param delay Thời gian chờ (mặc định 350ms)
 * @returns Giá trị đã được debounce
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
