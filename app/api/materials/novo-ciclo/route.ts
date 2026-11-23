import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parse, parseISO, isValid } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface ConsumptionRecord {
  date: string;
  quantity: number;
}

interface CicloAnterior {
  inicio: string | null;
  fim: string;
  saldoInicial: number;
  saldoFinal: number;
}

interface ItemPayload {
  id: string;
  novoSaldoInicial: number;
}

interface NovoCicloBody {
  cicloInicio: string; // yyyy-MM-dd
  cicloFimAnterior: string; // yyyy-MM-dd
  items: ItemPayload[];
}

function parseRecordDate(value: string): Date | null {
  if (!value) return null;
  const iso = parseISO(value);
  if (isValid(iso)) return iso;
  const br = parse(value, 'dd/MM/yyyy', new Date());
  return isValid(br) ? br : null;
}

export async function POST(request: Request) {
  try {
    // Apenas perfil "gestao" pode iniciar novo ciclo
    const cookieStore = await cookies();
    const raw = cookieStore.get('auth_session')?.value;
    let role: string | undefined;
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as { role?: string };
        role = parsed.role;
      } catch {
        role = undefined;
      }
    }
    if (role !== 'gestao') {
      return NextResponse.json({ error: 'Acesso negado: apenas o perfil gestão pode iniciar novo ciclo.' }, { status: 403 });
    }

    const body = (await request.json()) as NovoCicloBody;
    const inicio = parseISO(body.cicloInicio);
    if (!isValid(inicio) || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    let atualizados = 0;

    for (const item of body.items) {
      const { data: m, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', item.id)
        .eq('type', 'finalistico')
        .single();
      if (error || !m) continue;

      const records: ConsumptionRecord[] = Array.isArray(m.consumption_records) ? m.consumption_records : [];
      const consumidoNoCiclo = records.reduce((acc, r) => {
        const d = parseRecordDate(r.date);
        return d && d >= inicio ? acc + Number(r.quantity || 0) : acc;
      }, 0);

      const anteriores: CicloAnterior[] = Array.isArray(m.ciclos_anteriores) ? [...m.ciclos_anteriores] : [];
      anteriores.push({
        inicio: m.ciclo_inicio ?? null,
        fim: body.cicloFimAnterior,
        saldoInicial: Number(m.saldo_inicial || 0),
        saldoFinal: Number(m.saldo_atual || 0),
      });

      const novoSaldoAtual = item.novoSaldoInicial - consumidoNoCiclo;
      const valorUnit = Number(m.valor_unitario || 0);

      const { error: upErr } = await supabase
        .from('materials')
        .update({
          saldo_inicial: item.novoSaldoInicial,
          quantidade_geral: item.novoSaldoInicial,
          saldo_atual: novoSaldoAtual,
          valor_total: novoSaldoAtual * valorUnit,
          ciclo_inicio: body.cicloInicio,
          ciclos_anteriores: anteriores,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (!upErr) atualizados += 1;
    }

    return NextResponse.json({ atualizados, total: body.items.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
