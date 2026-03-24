import { NextResponse } from 'next/server';
import { getRequestById, updateRequest } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getRequestById(id);
    if (!data) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' }, 
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET solicitacao error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log('PATCH solicitacao id:', id);
    console.log('PATCH body:', JSON.stringify(body));

    const updated = await updateRequest(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada ou erro ao atualizar' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH solicitacao error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno',
        details: error.details || error.hint || error.code
      }, 
      { status: 500 }
    );
  }
}
