import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_session');
    
    if (!authCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(authCookie.value);
    
    // Fallback emails since we can't modify the login logic to store them in the cookie yet
    const email = session.email || (session.role === 'encarregado' ? 'darleson.oliveira@hotmail.com' : 'gestao@ufpe.br');

    return NextResponse.json({ 
      role: session.role,
      email: email
    });
  } catch (error: any) {
    console.error('Error in GET /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
