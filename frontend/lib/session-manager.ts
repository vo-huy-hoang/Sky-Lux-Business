import Cookies from 'js-cookie';
import type { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth-store';
import { authService, AuthMeResponse } from '@/services/auth.service';
import type { UserProfile } from '@/types/auth';

/**
 * Danh sách tất cả các user-scoped storage keys trong localStorage
 * cần được dọn dẹp sạch sẽ khi người dùng đăng xuất hoặc hết hạn phiên đăng nhập (401).
 */
export const USER_STORAGE_KEYS = [
  'skylux-auth-storage',
  'skylux-import-wizard-storage',
  'skylux-filter-storage',
  'skylux-notifications-storage',
  'skylux-report-filters',
  'skylux-chat-ui-storage',
] as const;

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface CookieAdapter {
  remove: (name: string, options?: Cookies.CookieAttributes) => void;
  get?: (name: string) => string | undefined;
}

export interface NavigationAdapter {
  navigate?: (url: string) => void;
  replace?: (url: string) => void;
}

// Global QueryClient registry để các thành phần ngoài React (vd: Axios interceptor)
// có thể kích hoạt dọn dẹp TanStack Query cache khi session bị hủy.
let registeredQueryClient: QueryClient | null = null;

export function registerQueryClient(client: QueryClient | null): void {
  registeredQueryClient = client;
}

export function getRegisteredQueryClient(): QueryClient | null {
  return registeredQueryClient;
}

/**
 * Kiểm tra và chuẩn hóa đường dẫn chuyển hướng sau khi đăng nhập (chống Open Redirect).
 * Chỉ chấp nhận các đường dẫn tương đối an toàn trong ứng dụng bắt đầu bằng một dấu gạch chéo '/'.
 * Từ chối tuyệt đối:
 * - Protocol-relative URL ('//evil.com', '///evil.com', '/\evil.com')
 * - URL tuyệt đối ('https://...', 'http://...')
 * - Scheme nguy hiểm ('javascript:...', 'data:...', 'vbscript:...')
 * - Ký tự điều khiển xuống dòng (CRLF injection)
 */
export function safeRedirectPath(
  path: string | null | undefined,
  defaultPath = '/dashboard',
): string {
  if (!path || typeof path !== 'string') {
    return defaultPath;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return defaultPath;
  }

  // Phải bắt đầu bằng đúng một dấu '/' và không được đi liền sau bằng '/' hoặc '\'
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/%2f') ||
    trimmed.startsWith('/%2F') ||
    trimmed.startsWith('/%5c') ||
    trimmed.startsWith('/%5C')
  ) {
    return defaultPath;
  }

  // Chặn CRLF hoặc ký tự điều khiển
  if (/[\r\n\t\0]/.test(trimmed)) {
    return defaultPath;
  }

  // Chặn scheme bất kỳ có thể xuất hiện dạng javascript: hoặc data:
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return defaultPath;
  }

  try {
    const dummyOrigin = 'http://localhost';
    const parsed = new URL(trimmed, dummyOrigin);

    // Origin phải giữ nguyên localhost và protocol phải là http
    if (parsed.origin !== dummyOrigin || parsed.protocol !== 'http:') {
      return defaultPath;
    }

    // Đảm bảo pathname bắt đầu bằng / và không chứa hostname rỗng giả mạo
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return defaultPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultPath;
  }
}

/**
 * Chuẩn hóa AuthMeResponse trả về từ backend thành UserProfile thống nhất trong Zustand.
 */
export function normalizeProfile(profile: AuthMeResponse): UserProfile {
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    organizationName: profile.organization?.name,
    departmentId: profile.departmentId,
    departmentName: profile.department?.name,
    employeeCode: profile.employeeCode,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    roles: (profile.roles || []).map((role) =>
      typeof role === 'string' ? role : role.code,
    ),
    permissions: profile.permissions || [],
    mustChangePassword: Boolean(profile.mustChangePassword),
  };
}

export interface RestoreSessionOptions {
  authServiceInstance?: { getMe: () => Promise<AuthMeResponse> };
  authStoreInstance?: typeof useAuthStore;
}

/**
 * Khôi phục phiên đăng nhập từ cookie HttpOnly bằng cách gọi /auth/me và nạp vào store.
 */
export async function restoreSession(
  options?: RestoreSessionOptions,
): Promise<UserProfile> {
  const service = options?.authServiceInstance ?? authService;
  const store = options?.authStoreInstance ?? useAuthStore;

  const profileResponse = await service.getMe();
  const normalized = normalizeProfile(profileResponse);
  store.getState().restoreAuth(normalized);
  return normalized;
}

export interface TeardownSessionOptions {
  queryClient?: QueryClient | null;
  storage?: StorageAdapter | null;
  cookieAdapter?: CookieAdapter | null;
  navigation?: NavigationAdapter | null;
  redirectTo?: string;
  callApiLogout?: boolean;
}

const defaultStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};

const defaultCookieAdapter: CookieAdapter = {
  remove: (name: string, options?: Cookies.CookieAttributes) => {
    try {
      Cookies.remove(name, options || { path: '/' });
    } catch {
      // Ignore cookie removal errors
    }
  },
  get: (name: string) => {
    try {
      return Cookies.get(name);
    } catch {
      return undefined;
    }
  },
};

const defaultNavigationAdapter: NavigationAdapter = {
  navigate: (url: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.location.href = url;
    } catch {
      // Ignore jsdom navigation not implemented errors
    }
  },
  replace: (url: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.location.replace(url);
    } catch {
      // Ignore jsdom navigation not implemented errors
    }
  },
};

/**
 * Điểm thu hồi và dọn dẹp phiên đăng nhập duy nhất (Single Teardown Seam):
 * - Tùy chọn gọi API /auth/logout (nuốt lỗi nếu rớt mạng để logout cục bộ luôn thành công)
 * - Xóa TanStack Query cache
 * - Xóa cookie csrf_token
 * - Xóa toàn bộ user-scoped storage keys trong localStorage (auth, wizard, filters, notifications, reports, chat)
 * - Reset Zustand useAuthStore
 * - Phát sự kiện skylux:session-teardown để các kết nối SSE/realtime đóng ngay lập tức
 * - Điều hướng an toàn sang trang đích (vd: / hoặc /login)
 */
export async function teardownSession(
  options?: TeardownSessionOptions,
): Promise<void> {
  const {
    queryClient = registeredQueryClient,
    storage = defaultStorageAdapter,
    cookieAdapter = defaultCookieAdapter,
    navigation = defaultNavigationAdapter,
    redirectTo,
    callApiLogout = false,
  } = options || {};

  // 1. Gọi API logout nếu được yêu cầu (graceful failure nếu mất mạng)
  if (callApiLogout) {
    try {
      await authService.logout();
    } catch {
      // Bỏ qua lỗi mạng để đảm bảo session cục bộ luôn được giải phóng an toàn
    }
  }

  // 2. Xóa toàn bộ query cache của TanStack Query
  if (queryClient) {
    try {
      queryClient.clear();
    } catch {
      // Ignore cache clear error
    }
  }

  // 3. Xóa cookie csrf_token
  if (cookieAdapter) {
    cookieAdapter.remove('csrf_token', { path: '/' });
  }

  // 4. Xóa tất cả các user-scoped storage keys trong localStorage
  if (storage) {
    for (const key of USER_STORAGE_KEYS) {
      storage.removeItem(key);
    }
  }

  // 5. Reset trạng thái Zustand auth store
  try {
    useAuthStore.getState().logout();
  } catch {
    // Ignore store error if run in isolated test environment
  }

  // 6. Phát window event báo hiệu teardown cho các realtime hooks
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('skylux:session-teardown'));
    } catch {
      // Ignore event dispatch error
    }
  }

  // 7. Điều hướng nếu có redirectTo
  if (redirectTo && navigation) {
    const safeUrl = safeRedirectPath(redirectTo, '/login');
    if (navigation.replace) {
      navigation.replace(safeUrl);
    } else if (navigation.navigate) {
      navigation.navigate(safeUrl);
    }
  }
}

export const sessionManager = {
  safeRedirectPath,
  normalizeProfile,
  restoreSession,
  teardownSession,
  registerQueryClient,
  getRegisteredQueryClient,
  USER_STORAGE_KEYS,
};
