// middleware.ts — colocar na RAIZ do projeto (ao lado de next.config.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GESTAO_ONLY_ROUTES = [
  '/gestao-contratual',
  '/relatorios',
  '/materiais-finalisticos',
];

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth_session');

  // Sem sessão → redireciona para login
  if (!authCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const session = JSON.parse(authCookie.value);
    const path = request.nextUrl.pathname;

    const isRestricted = GESTAO_ONLY_ROUTES.some(route => path.startsWith(route));

    // Rota restrita acessada por encarregado → redireciona para home
    if (isRestricted && session.role !== 'gestao') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/gestao-contratual/:path*',
    '/relatorios/:path*',
    '/materiais-finalisticos/:path*',
  ],
};
