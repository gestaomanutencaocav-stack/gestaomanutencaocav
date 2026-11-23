import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { parse, parseISO, isValid } from 'date-fns';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

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

interface MaterialRow {
  id: string;
  saldo_inicial: number | string | null;
  saldo_atual: number | string | null;
  valor_unitario: number | string | null;
  consumption_records: ConsumptionRecord[] | null;
  ciclo_inicio: string | null;
  ciclos_anteriores: CicloAnterior[] | null;
}

const CHUNK_SIZE = 25;

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

    // 1) Busca todos os materiais de uma vez
    const ids = body.items.map((i) => i.id);
    const { data, error } = await supabase
      .from('materials')
      .select('id, saldo_inicial, saldo_atual, valor_unitario, consumption_records, ciclo_inicio, ciclos_anteriores')
      .in('id', ids)
      .eq('type', 'finalistico');
    if (error) throw error;

    const rows = (data ?? []) as MaterialRow[];
    const rowById = new Map<string, MaterialRow>(rows.map((r) => [r.id, r]));

    // 2) Monta as atualizações (ignora itens que já estão neste ciclo)
    let ignorados = 0;
    const updates: { id: string; payload: Record<string, unknown> }[] = [];

    for (const item of body.items) {
      const m = rowById.get(item.id);
      if (!m) continue;

      if (m.ciclo_inicio === body.cicloInicio) {
        ignorados += 1;
        continue;
      }

      const records = Array.isArray(m.consumption_records) ? m.consumption_records : [];
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

      updates.push({
        id: item.id,
        payload: {
          saldo_inicial: item.novoSaldoInicial,
          quantidade_geral: item.novoSaldoInicial,
          saldo_atual: novoSaldoAtual,
          valor_total: novoSaldoAtual * valorUnit,
          ciclo_inicio: body.cicloInicio,
          ciclos_anteriores: anteriores,
          updated_at: new Date().toISOString(),
        },
      });
    }

    // 3) Executa em lotes paralelos
    let atualizados = 0;
    let falhas = 0;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map((u) => supabase.from('materials').update(u.payload).eq('id', u.id))
      );
      for (const res of results) {
        if (res.error) falhas += 1;
        else atualizados += 1;
      }
    }

    return NextResponse.json({ atualizados, ignorados, falhas, total: body.items.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
