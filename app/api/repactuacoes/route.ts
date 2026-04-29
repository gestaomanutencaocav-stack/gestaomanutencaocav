import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contract_id');

    let query = supabase.from('repactuacoes').select('*').order('created_at', { ascending: false });

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
      .from('repactuacoes')
      .insert([{
        contract_id: body.contract_id,
        process_number: body.process_number,
        year: body.year,
        periodo_data_base: body.periodo_data_base,
        valor_repactuacao: body.valor_repactuacao,
        termo_apostila: body.termo_apostila,
        triggering_factor: body.triggering_factor,
        status: body.status || 'Em Análise'
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
      .from('repactuacoes')
      .update({
        process_number: body.process_number,
        year: body.year,
        periodo_data_base: body.periodo_data_base,
        valor_repactuacao: body.valor_repactuacao,
        termo_apostila: body.termo_apostila,
        triggering_factor: body.triggering_factor,
        status: body.status,
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
      .from('repactuacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
