import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken } from './lib/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, api routes, and icons pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const user = token ? await verifyAuthToken(token) : null;

  const isAuthPage = pathname === '/login';
  const isProtectedPage =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/check-in') ||
    pathname.startsWith('/stays') ||
    pathname.startsWith('/hotels') ||
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings');

  // If already logged in and visiting login page, redirect to dashboard
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If visiting protected page without valid user, redirect to login
  if (isProtectedPage && !user) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Owner only page protection
  const isOwnerOnly =
    pathname.startsWith('/hotels') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings');

  if (isOwnerOnly && user && user.role !== 'owner') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
