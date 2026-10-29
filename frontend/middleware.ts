import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. The public client landing page is the default entry point, even when
  // an internal user still has a valid session cookie.
  if (pathname === '/') {
    return NextResponse.next();
  }
  if (pathname === '/client') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Legacy /auth/login redirect to canonical /login
  if (pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Legacy /main redirect to canonical routes (e.g. /main -> /dashboard, /main/dossiers -> /dossiers)
  if (pathname === '/main') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (pathname.startsWith('/main/')) {
    const canonicalPath = pathname.replace(/^\/main/, '');
    return NextResponse.redirect(new URL(canonicalPath, request.url));
  }

  // 4. Keep login reachable even when a stale/expired token cookie exists.
  // Redirecting based on cookie presence alone can bounce an expired session
  // between /login and /dashboard indefinitely.
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // 5. Protected internal routes are validated by the client auth boundary.
  // The session is also persisted in localStorage, which middleware cannot
  // read. Redirecting here when the access cookie is temporarily absent can
  // discard a valid browser session before the app can restore it.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, logos
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
