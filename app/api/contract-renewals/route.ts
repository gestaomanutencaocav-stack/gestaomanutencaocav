import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contract_id');

    let query = supabase.from('contract_renewals').select('*').order('created_at', { ascending: false });

    if (contractId && contractId !== 'todos') {
      query = query.eq('contract_id', contractId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('contract_renewals')
      .insert([{
        contract_id: body.contract_id,
        numero_processo: body.numero_processo,
        ano: body.ano,
        termo_aditivo: body.termo_aditivo,
        status: body.status || 'Em Andamento',
        descricao: body.descricao
      }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) throw new Error('ID is required');

    const { data, error } = await supabase
      .from('contract_renewals')
      .update({
        numero_processo: body.numero_processo,
        ano: body.ano,
        termo_aditivo: body.termo_aditivo,
        status: body.status,
        descricao: body.descricao,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new Error('ID is required');

    const { error } = await supabase
      .from('contract_renewals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
