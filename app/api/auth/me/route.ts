import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  try {
    const role = await getUserRole();
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ role });
  } catch (error: any) {
    console.error('Error in GET /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
