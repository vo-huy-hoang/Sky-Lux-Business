import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  ACCESS_TOKEN_COOKIE,
  CSRF_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  parseCookieHeader,
} from '../utils/cookie.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(raw?: string | string[]): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null') {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function timingSafeMatch(expected: string, actual: string): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(actual, 'utf8');
  if (expectedBuf.length !== actualBuf.length || expectedBuf.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = String(request?.method || 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const headers = request?.headers || {};
    const cookies = parseCookieHeader(headers.cookie);
    const hasSessionCookie = Boolean(
      cookies[ACCESS_TOKEN_COOKIE] || cookies[REFRESH_TOKEN_COOKIE],
    );

    const requestOrigin =
      normalizeOrigin(headers.origin) || normalizeOrigin(headers.referer);
    const allowedOrigins = this.getAllowedOrigins();

    // Even when no session cookie is attached (e.g. login POST), reject explicitly untrusted cross-site origins.
    if (!hasSessionCookie) {
      if (headers.origin || headers.referer) {
        if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
          throw new ForbiddenException('CSRF origin validation failed');
        }
      }
      return true;
    }

    // Cookie-authenticated state-changing requests must present a trusted Origin/Referer.
    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      throw new ForbiddenException('CSRF origin validation failed');
    }

    // Login uses email/password credentials rather than cookies; still check Origin above,
    // without locking out a user who holds an abandoned expired access_token cookie.
    const requestPath = String(request?.originalUrl || request?.url || '').split(
      '?',
    )[0];
    if (requestPath === '/api/auth/login' || requestPath === '/auth/login') {
      return true;
    }

    const cookieCsrf = cookies[CSRF_TOKEN_COOKIE];
    const headerCsrfRaw = headers['x-csrf-token'];
    const headerCsrf = Array.isArray(headerCsrfRaw)
      ? headerCsrfRaw[0]
      : headerCsrfRaw;

    if (
      typeof cookieCsrf !== 'string' ||
      typeof headerCsrf !== 'string' ||
      !timingSafeMatch(cookieCsrf, headerCsrf.trim())
    ) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }

  private getAllowedOrigins(): Set<string> {
    const rawOrigins =
      this.configService.get<string>('CORS_ORIGINS') ||
      process.env.CORS_ORIGINS ||
      'http://localhost:3000,http://127.0.0.1:3000';

    const origins = new Set<string>();
    for (const entry of rawOrigins.split(',')) {
      const normalized = normalizeOrigin(entry);
      if (normalized) {
        origins.add(normalized);
      }
    }
    return origins;
  }
}

