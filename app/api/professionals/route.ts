import { NextResponse } from 'next/server';
import { getProfessionals } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const data = await getProfessionals();
    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Unexpected error fetching professionals:', error);
    return NextResponse.json({ error: 'Failed to fetch professionals', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('professionals')
      .insert([
        {
          name: body.name,
          specialty: body.specialty,
          registration: body.registration,
          phone: body.phone,
          active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating professional:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unexpected error creating professional:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}