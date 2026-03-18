import { NextResponse } from 'next/server';
import { getInspections, addInspection, updateInspection } from '@/lib/store';

export async function GET() {
  try {
    const inspections = await getInspections();
    return NextResponse.json(inspections);
  } catch (error: any) {
    console.error('Error in GET /api/inspecoes:', error);
    return NextResponse.json({ error: 'Failed to fetch inspections', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newInspection = await addInspection(body);
    return NextResponse.json(newInspection);
  } catch (error: any) {
    console.error('Error in POST /api/inspecoes:', error);
    return NextResponse.json({ error: 'Failed to create inspection', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    const body = await request.json();
    const updatedInspection = await updateInspection(id, body);
    return NextResponse.json(updatedInspection);
  } catch (error: any) {
    console.error('Error in PUT /api/inspecoes:', error);
    return NextResponse.json({ error: 'Failed to update inspection', details: error.message }, { status: 500 });
  }
}
