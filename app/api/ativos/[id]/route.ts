import { NextResponse } from 'next/server';
import { deleteAsset, getAssets, updateAsset } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assets = await getAssets();
    const asset = assets.find(a => a.id === id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updateAsset(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteAsset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
