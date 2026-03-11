import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body;

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
      // Only darleson.oliveira@hotmail.com is 'encarregado'
      // All others are 'gestao' (Gestor Predial)
      const role = data.user.email === 'darleson.oliveira@hotmail.com' ? 'encarregado' : 'gestao';
      await login(role);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('Supabase auth error:', err);
  }

  return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
}
