import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard (Ticket 04)', () => {
  let guard: CsrfGuard;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'CORS_ORIGINS') {
          return 'http://localhost:3000,https://app.skylux.vn';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    guard = new CsrfGuard(configService);
  });

  function createContext(options: {
    method: string;
    headers?: Record<string, string>;
    url?: string;
  }): ExecutionContext {
    const req = {
      method: options.method,
      headers: options.headers || {},
      originalUrl: options.url || '/api/dossiers',
      url: options.url || '/api/dossiers',
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows safe GET requests without CSRF checks', () => {
    const ctx = createContext({
      method: 'GET',
      headers: { cookie: 'access_token=abc' },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects state-changing cookie request when X-CSRF-Token header is missing', () => {
    const ctx = createContext({
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'access_token=abc; csrf_token=expected-csrf',
      },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects state-changing cookie request when Origin is untrusted', () => {
    const ctx = createContext({
      method: 'PATCH',
      headers: {
        origin: 'https://evil.attacker.com',
        cookie: 'access_token=abc; csrf_token=token-123',
        'x-csrf-token': 'token-123',
      },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rejects state-changing cookie request when X-CSRF-Token does not match cookie', () => {
    const ctx = createContext({
      method: 'DELETE',
      headers: {
        origin: 'http://localhost:3000',
        cookie: 'access_token=abc; csrf_token=token-123',
        'x-csrf-token': 'wrong-token',
      },
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows state-changing cookie request with allowed Origin and matching double-submit CSRF token', () => {
    const ctx = createContext({
      method: 'POST',
      headers: {
        origin: 'https://app.skylux.vn',
        cookie: 'access_token=abc; csrf_token=valid-csrf-xyz',
        'x-csrf-token': 'valid-csrf-xyz',
      },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows programmatic bearer-only POST without session cookies', () => {
    const ctx = createContext({
      method: 'POST',
      headers: {
        authorization: 'Bearer programmatic-token',
      },
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

