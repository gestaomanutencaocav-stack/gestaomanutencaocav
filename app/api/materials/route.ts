import { NextResponse } from 'next/server';
import { getMaterials, upsertMaterials } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'estoque' | 'finalistico';
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined;
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
  
  if (!type) return NextResponse.json({ error: 'Type is required' }, { status: 400 });
  
  const data = await getMaterials(type, month, year);
  // Explicitly ensure id is present in the response
  return NextResponse.json(data.map(m => ({
    ...m,
    id: m.id
  })));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { materials } = body;
  if (!materials || !Array.isArray(materials)) {
    return NextResponse.json({ error: 'Materials array is required' }, { status: 400 });
  }
  
  try {
    const data = await upsertMaterials(materials);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message, 
      details: error.details || error.hint || error.code 
    }, { status: 500 });
  }
}
