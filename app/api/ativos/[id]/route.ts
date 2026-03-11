import { NextResponse } from 'next/server';
import { deleteAsset, getAssets, updateAsset } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
const { id } = await params
  try {
    const assets = await getAssets();
    const asset = assets.find(a => a.id === params.id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PUT
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json();
    const updated = await updateAsset(params.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function PUT
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = params.id;
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
