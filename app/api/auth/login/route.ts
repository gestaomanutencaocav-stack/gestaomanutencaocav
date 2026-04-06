import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Rate limiting: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const { allowed } = getRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde 15 minutos.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Usuário e senha são obrigatórios.' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (data.user) {
      const role = data.user.email === 'darleson.oliveira@hotmail.com' ? 'encarregado' : 'gestao';
      await login(role);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('Supabase auth error:', err);
  }

  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
}