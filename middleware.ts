import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth_session');
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!authCookie?.value;

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (isAuthenticated && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.woff|.*\\.woff2|.*\\.ttf).*)',
  ],
};