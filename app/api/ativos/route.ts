import { NextResponse } from 'next/server';
import { getAssets, addAsset } from '@/lib/store';

export async function GET() {
  try {
    const assets = await getAssets();
    return NextResponse.json(assets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newAsset = await addAsset(body);
    return NextResponse.json(newAsset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add asset' }, { status: 500 });
  }
}
