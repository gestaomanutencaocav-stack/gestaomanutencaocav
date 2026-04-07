import { NextResponse } from 'next/server';
import { getRequests, addRequest } from '@/lib/store';

export async function GET() {
  try {
    console.log('GET /api/solicitacoes: Fetching requests...');
    const requests = await getRequests();
    console.log(`GET /api/solicitacoes: Successfully fetched ${requests.length} requests`);
    return NextResponse.json(requests);
  } catch (error: any) {
    console.error('Error in GET /api/solicitacoes:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch requests', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRequest = await addRequest(body);
    return NextResponse.json(newRequest);
  } catch (error: any) {
    console.error('Error in POST /api/solicitacoes:', error);
    return NextResponse.json({ error: 'Failed to create request', details: error.message }, { status: 500 });
  }
}
