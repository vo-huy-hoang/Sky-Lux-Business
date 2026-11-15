import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Custom Hook xác định trạng thái đăng nhập phía client an toàn với SSR / Zustand hydration
 * @returns boolean: true nếu client đã mount, Zustand store đã hydrate và có user đăng nhập
 */
export function useIsLoggedIn(): boolean {
  const [hasMounted, setHasMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted && hasHydrated && Boolean(user);
}
