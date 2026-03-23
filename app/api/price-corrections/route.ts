import { NextResponse } from 'next/server';
import { getPriceCorrections, applyPriceCorrection } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'finalistico';
  
  try {
    const data = await getPriceCorrections(type);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, percentage, appliedBy } = body;
  
  if (!type || percentage === undefined) {
    return NextResponse.json({ error: 'Type and percentage are required' }, { status: 400 });
  }
  
  try {
    const result = await applyPriceCorrection(type, Number(percentage), appliedBy);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: error.message, 
      details: error.details || error.hint || error.code 
    }, { status: 500 });
  }
}
