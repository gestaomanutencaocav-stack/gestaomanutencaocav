import { NextResponse } from 'next/server';
import { getInspectionRecords, addInspectionRecord } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inspectionId = searchParams.get('inspectionId');
    const records = await getInspectionRecords(inspectionId || undefined);
    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Error in GET /api/inspecoes/records:', error);
    return NextResponse.json({ error: 'Failed to fetch records', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRecord = await addInspectionRecord(body);
    return NextResponse.json(newRecord);
  } catch (error: any) {
    console.error('Error in POST /api/inspecoes/records:', error);
    return NextResponse.json({ error: 'Failed to create record', details: error.message }, { status: 500 });
  }
}
