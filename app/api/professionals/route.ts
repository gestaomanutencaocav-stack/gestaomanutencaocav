import { NextResponse } from 'next/server';
import { getProfessionals } from '@/lib/store';

export async function GET() {
  try {
    const professionals = await getProfessionals();
    return NextResponse.json(professionals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
