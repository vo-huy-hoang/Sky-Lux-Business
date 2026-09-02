import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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

// Response Interceptor: Handle 401 and Token Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
    };


    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const data = res.data?.data || res.data;
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        Cookies.set('access_token', newAccessToken, { expires: 1 });
        if (newRefreshToken) {
          Cookies.set('refresh_token', newRefreshToken, { expires: 7 });
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Extract error message from API response envelope
    const errorData = error.response?.data as any;
    const errorMessage =
      errorData?.message ||
      errorData?.errors?.[0] ||
      error.message ||
      'Đã xảy ra lỗi khi kết nối máy chủ';

    const customError: any = new Error(errorMessage);
    customError.status = error.response?.status;
    customError.response = error.response;
    if (error.response?.status === 429) {
      customError.isRateLimited = true;
      customError.lockoutSeconds = errorData?.lockoutSeconds || 60;
    }

    return Promise.reject(customError);
  },
);

