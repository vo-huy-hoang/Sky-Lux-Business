import Cookies from 'js-cookie';
import axios from 'axios';
import { apiClient, API_BASE_URL } from '../lib/api-client';
import { buildSecurityHeaders } from '../next.config';

describe('Ticket 04: HttpOnly Cookie Session, CSRF Header & Security Headers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Cookies.remove('csrf_token', { path: '/' });
    localStorage.clear();
  });

  it('enables withCredentials: true on apiClient without exposing Authorization Bearer tokens', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);

    const reqInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const config = reqInterceptor({
      method: 'get',
      headers: {},
    });

    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('injects X-CSRF-Token from csrf_token cookie on state-changing HTTP requests', () => {
    jest.spyOn(Cookies, 'get').mockImplementation((name?: string) => {
      if (name === 'csrf_token') return 'double-submit-csrf-123';
      return undefined as any;
    });

    const reqInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const postConfig = reqInterceptor({
      method: 'post',
      headers: {},
    });

    expect(postConfig.headers['X-CSRF-Token']).toBe('double-submit-csrf-123');
    expect(postConfig.headers.Authorization).toBeUndefined();
  });

  it('silently refreshes via HttpOnly cookie with empty body on 401 and forwards X-CSRF-Token', async () => {
    jest.spyOn(Cookies, 'get').mockImplementation((name?: string) => {
      if (name === 'csrf_token') return 'csrf-abc';
      return undefined as any;
    });

    const postSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { refreshed: true },
    });

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = jest.fn().mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    try {
      const rejectedInterceptor = (apiClient.interceptors.response as any).handlers[0].rejected;
      const result = await rejectedInterceptor({
        isAxiosError: true,
        config: { url: '/dossiers', method: 'get', headers: {} },
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      expect(postSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { 'X-CSRF-Token': 'csrf-abc' },
        },
      );
      expect(result).toEqual({ ok: true });
    } finally {
      apiClient.defaults.adapter = originalAdapter;
      postSpy.mockRestore();
    }
  });

  it('builds Next.js HTTP security headers including CSP, X-Frame-Options and X-Content-Type-Options', () => {
    const headers = buildSecurityHeaders();
    const byKey = new Map(headers.map((h) => [h.key, h.value]));

    expect(byKey.get('X-Frame-Options')).toBe('DENY');
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(byKey.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(byKey.get('Content-Security-Policy')).toContain("object-src 'none'");
  });
});

