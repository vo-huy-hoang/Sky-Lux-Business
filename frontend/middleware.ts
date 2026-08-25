import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // 1. Root path redirect
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/main/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 2. Already authenticated users trying to access login
  if (pathname.startsWith('/auth/login')) {
    if (token) {
      return NextResponse.redirect(new URL('/main/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. Protected /main routes
  if (pathname.startsWith('/main')) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

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
