import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  // Level 1: Encarregado de Manutenção (Hardcoded for legacy support)
  if (username === 'encarregado' && password === 'senha123') {
    await login('encarregado');
    return NextResponse.json({ success: true });
  }

  // Level 2: Gestão (Hardcoded for legacy support)
  if (username === 'gestao' && password === 'senha123') {
    await login('gestao');
    return NextResponse.json({ success: true });
  }

  // Legacy admin for convenience
  if (username === 'admin' && password === 'admin123') {
    await login('gestao');
    return NextResponse.json({ success: true });
  }

  // Supabase Auth Integration
  // We treat 'username' as 'email' for Supabase
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (data.user) {
      // Get role from user metadata, default to 'gestao' if not set
      const role = (data.user.user_metadata?.role as 'encarregado' | 'gestao') || 'gestao';
      await login(role);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('Supabase auth error:', err);
  }

  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
}
