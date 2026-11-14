import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function parseCookieHeader(
  cookieHeader?: string | string[],
): Record<string, string> {
  const raw = Array.isArray(cookieHeader)
    ? cookieHeader.join('; ')
    : cookieHeader;
  if (!raw || typeof raw !== 'string') {
    return {};
  }

  const parsed: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) continue;
    try {
      parsed[name] = decodeURIComponent(value);
    } catch {
      parsed[name] = value;
    }
  }
  return parsed;
}

function isSecureCookieEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path: '/api',
    maxAge: ONE_DAY_MS,
  };
}

export function getAccessTokenClearOptions(path = '/api'): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path,
  };
}

export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function getRefreshTokenClearOptions(
  path = '/api/auth/refresh',
): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path,
  };
}

export function getCsrfTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function getCsrfTokenClearOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: isSecureCookieEnvironment(),
    sameSite: 'lax',
    path: '/',
  };
}

