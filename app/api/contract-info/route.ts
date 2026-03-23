import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('contract_info')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        contract_number: '31/2021',
        company_name: 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA',
        cnpj: '11.533.627/0001-24',
        start_date: '2021-11-04',
        end_date: '2026-11-04',
        renewals_count: 5,
        contracting_party: 'Centro Acadêmico da Vitória - CAV/UFPE'
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data: existing } = await supabase
      .from('contract_info')
      .select('id')
      .limit(1)
      .single();

    let result;

    if (existing?.id) {
      const { data, error } = await supabase
        .from('contract_info')
        .update({
          contract_number: body.contract_number,
          company_name: body.company_name,
          cnpj: body.cnpj,
          start_date: body.start_date,
          end_date: body.end_date,
          renewals_count: body.renewals_count,
          contracting_party: body.contracting_party,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('contract_info')
        .insert([{
          contract_number: body.contract_number,
          company_name: body.company_name,
          cnpj: body.cnpj,
          start_date: body.start_date,
          end_date: body.end_date,
          renewals_count: body.renewals_count,
          contracting_party: body.contracting_party
        }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error saving contract:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details || error.hint || error.code
    }, { status: 500 });
  }
}
