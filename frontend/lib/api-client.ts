import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:3001/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Request Interceptor: Attach double-submit CSRF header for state-changing requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = (config.method || 'GET').toUpperCase();
    if (!SAFE_HTTP_METHODS.has(method)) {
      const csrfToken = Cookies.get('csrf_token');
      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    // For FormData, delete Content-Type so Axios & browser generate proper boundary
    if (typeof window !== 'undefined' && config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export interface RequestOptions {
  signal?: AbortSignal;
}

export const isCanceledError = (error: unknown): boolean => {
  return (
    axios.isCancel(error) ||
    (error instanceof Error &&
      (error.name === 'CanceledError' || error.name === 'AbortError'))
  );
};

// Response Interceptor: Handle 401 and Silent Cookie Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(true);
    }
  });
  failedQueue = [];
};

function clearClientAuthState(): void {
  Cookies.remove('csrf_token', { path: '/' });
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('skylux-auth-storage');
    } catch {
      // Ignore storage removal errors
    }
  }
}

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap standard envelope if present: { success, data, ... }
    if (
      response.data &&
      response.data.success !== undefined &&
      response.data.data !== undefined
    ) {
      if (response.data.meta !== undefined) {
        return { data: response.data.data, meta: response.data.meta };
      }
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    // 1. Kiểm tra nếu request bị hủy chủ động (AbortController / CanceledError)
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _permissionRetry?: boolean;
    };

    const errorData = error.response?.data as any;
    const shouldRefreshToken =
      error.response?.status === 401
        ? Boolean(originalRequest && !originalRequest._retry)
        : false;

    if (shouldRefreshToken && originalRequest) {
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const csrfToken = Cookies.get('csrf_token');
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
          },
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('skylux:token-refreshed'));
        }

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        if (error.response?.status === 401) {
          clearClientAuthState();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 403 &&
      errorData?.code === 'PASSWORD_CHANGE_REQUIRED' &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new CustomEvent('skylux:password-change-required'));
    }

    // Extract error message from API response envelope
    const errorMessage =
      errorData?.message ||
      errorData?.errors?.[0] ||
      error.message ||
      'Đã xảy ra lỗi khi kết nối máy chủ';

    const customError: any = new Error(errorMessage);
    customError.status = error.response?.status;
    customError.response = error.response;
    if (typeof errorData?.code === 'string') {
      customError.code = errorData.code;
    }
    if (error.response?.status === 429) {
      customError.isRateLimited = true;
      customError.lockoutSeconds = errorData?.lockoutSeconds || 60;
    }

    return Promise.reject(customError);
  },
);
