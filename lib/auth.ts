import { cookies } from 'next/headers';

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_session');
  return !!authCookie?.value;
}

export async function getUserRole() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_session');
  if (!authCookie?.value) return null;
  
  try {
    const session = JSON.parse(authCookie.value);
    return session.role as 'encarregado' | 'gestao';
  } catch {
    return null;
  }
}

export async function login(role: 'encarregado' | 'gestao', email?: string) {
  const cookieStore = await cookies();
  const session = JSON.stringify({ role, email: email || '', authenticated: true });
  
  cookieStore.set('auth_session', session, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set('auth_session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 0,
  });
}
