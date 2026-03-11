import { NextResponse } from 'next/server';
import { getRequests, addRequest } from '@/lib/store';

export async function GET() {
  return NextResponse.json(await getRequests());
}

export async function POST(request: Request) {
  const body = await request.json();
  const newRequest = await addRequest(body);
  return NextResponse.json(newRequest);
}
