import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `REQ-${randomChars}`;

    const newRequest = {
      id,
      created_at:         body.created_at || new Date().toISOString(),
      responsible_server: body.responsible_server || null,
      matricula_siape:    body.matricula_siape || null,
      unit:               body.unit || null,
      description:        body.description || null,
      details:            body.details || null,
      type:               body.type || null,
      email_solicitante:  body.email_solicitante || null,
      images:             Array.isArray(body.images) ? body.images : (body.images ? [body.images] : []),
      tombamento:         body.tombamento || null,
      modelo_equipamento: body.modelo_equipamento || null,
      tipo_equipamento:   body.tipo_equipamento || null,
      btus:               body.btus || null,
      urgency:            body.urgency || 'Média',
      hora_finalizacao:   body.hora_finalizacao || null,
      data_finalizacao:   body.data_finalizacao || null,
      professional:       body.professional || null,
      servidor_repassou:  body.servidor_repassou || null,
      observacao:         body.observacao || null,
      status:             'Novo',
      status_color:       'blue',
      date:               new Date().toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }),
    };

    const { error } = await supabase
      .from('requests')
      .insert([newRequest]);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error('Sync Forms API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
