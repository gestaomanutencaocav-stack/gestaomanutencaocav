import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle bulk insert
    if (body.records && Array.isArray(body.records)) {
      const { data, error } = await supabase
        .from('financial_records')
        .insert(body.records.map((record: any) => {
          const total_invoice = (Number(record.payment_value) || 0) + 
                              (Number(record.materials_value) || 0) + 
                              (Number(record.materials_citl_value) || 0);
          const total_after_discounts = total_invoice - (Number(record.discounts) || 0);
          
          return {
            ...record,
            total_invoice,
            total_after_discounts
          };
        }))
        .select();

      if (error) throw error;
      return NextResponse.json({ count: data.length, data });
    }

    // Handle single insert
    const total_invoice = (Number(body.payment_value) || 0) + 
                        (Number(body.materials_value) || 0) + 
                        (Number(body.materials_citl_value) || 0);
    const total_after_discounts = total_invoice - (Number(body.discounts) || 0);

    const { data, error } = await supabase
      .from('financial_records')
      .insert([{
        year: body.year,
        month: body.month,
        invoice_number: body.invoice_number,
        process_number: body.process_number || null,
        payment_value: body.payment_value,
        materials_value: body.materials_value,
        materials_citl_value: body.materials_citl_value,
        total_invoice,
        discounts: body.discounts,
        total_after_discounts,
        fiscal_note_number: body.fiscal_note_number
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const total_invoice = (Number(updateData.payment_value) || 0) + 
                        (Number(updateData.materials_value) || 0) + 
                        (Number(updateData.materials_citl_value) || 0);
    const total_after_discounts = total_invoice - (Number(updateData.discounts) || 0);

    const { data, error } = await supabase
      .from('financial_records')
      .update({
        ...updateData,
        process_number: updateData.process_number || null,
        total_invoice,
        total_after_discounts,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
