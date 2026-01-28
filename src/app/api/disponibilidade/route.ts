import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

interface TimeRange {
  start: number; // minutes desde 00:00
  end: number;
}

interface Slot {
  inicio: string;
  fim: string;
}

// Converte HH:MM para minutos desde 00:00
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Converte minutos desde 00:00 para HH:MM
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Subtrai um range de uma lista de ranges
function subtractRange(ranges: TimeRange[], toSubtract: TimeRange): TimeRange[] {
  const result: TimeRange[] = [];

  for (const range of ranges) {
    // Sem sobreposição
    if (toSubtract.end <= range.start || toSubtract.start >= range.end) {
      result.push(range);
      continue;
    }

    // Parte antes da subtração
    if (toSubtract.start > range.start) {
      result.push({ start: range.start, end: toSubtract.start });
    }

    // Parte depois da subtração
    if (toSubtract.end < range.end) {
      result.push({ start: toSubtract.end, end: range.end });
    }
  }

  return result;
}

// Gera slots a partir de ranges disponíveis
function generateSlots(ranges: TimeRange[], duration: number, interval: number = 30): Slot[] {
  const slots: Slot[] = [];

  for (const range of ranges) {
    let slotStart = range.start;

    while (slotStart + duration <= range.end) {
      slots.push({
        inicio: minutesToTime(slotStart),
        fim: minutesToTime(slotStart + duration),
      });
      slotStart += interval;
    }
  }

  return slots;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const profissionalId = searchParams.get('profissionalId');
    const clinicaId = searchParams.get('clinicaId');
    const data = searchParams.get('data'); // YYYY-MM-DD
    const duracaoMinutos = parseInt(searchParams.get('duracaoMinutos') || '60');

    if (!profissionalId || !clinicaId || !data) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: profissionalId, clinicaId, data' }, { status: 400 });
    }

    const dataObj = new Date(data + 'T12:00:00');
    const diaSemana = dataObj.getDay(); // 0-6

    // 1. Buscar horários do profissional para este dia da semana
    let { data: horarioProfissional } = await supabase
      .from('horarios_profissional')
      .select('*')
      .eq('profissional_id', profissionalId)
      .eq('dia_semana', diaSemana)
      .single();

    // 2. Se não tem horário próprio, buscar horário da clínica
    if (!horarioProfissional) {
      const { data: horarioClinica } = await supabase
        .from('horarios')
        .select('*')
        .eq('clinica_id', clinicaId)
        .eq('dia_semana', diaSemana)
        .single();

      horarioProfissional = horarioClinica;
    }

    // 3. Se não atende neste dia, retornar vazio
    if (!horarioProfissional || !horarioProfissional.ativo) {
      return NextResponse.json({ slots: [], mensagem: 'Profissional não atende neste dia' });
    }

    // 4. Montar ranges disponíveis (expediente - intervalo)
    const abertura = timeToMinutes(horarioProfissional.abertura || '08:00');
    const fechamento = timeToMinutes(horarioProfissional.fechamento || '18:00');
    const intervaloInicio = horarioProfissional.intervalo_inicio ? timeToMinutes(horarioProfissional.intervalo_inicio) : null;
    const intervaloFim = horarioProfissional.intervalo_fim ? timeToMinutes(horarioProfissional.intervalo_fim) : null;

    let availableRanges: TimeRange[] = [{ start: abertura, end: fechamento }];

    // Subtrair intervalo de almoço
    if (intervaloInicio !== null && intervaloFim !== null) {
      availableRanges = subtractRange(availableRanges, { start: intervaloInicio, end: intervaloFim });
    }

    // 5. Buscar bloqueios do profissional para esta data
    const { data: bloqueiosProfissional } = await supabase
      .from('bloqueios_profissional')
      .select('*')
      .eq('profissional_id', profissionalId)
      .eq('data', data);

    // 6. Buscar bloqueios da clínica para esta data
    const { data: bloqueiosClinica } = await supabase
      .from('bloqueios')
      .select('*')
      .eq('clinica_id', clinicaId)
      .eq('data', data);

    // 7. Subtrair bloqueios
    const todosBloqueios = [...(bloqueiosProfissional || []), ...(bloqueiosClinica || [])];

    for (const bloqueio of todosBloqueios) {
      const bloqueioStart = timeToMinutes(bloqueio.hora_inicio);
      const bloqueioEnd = timeToMinutes(bloqueio.hora_fim);
      availableRanges = subtractRange(availableRanges, { start: bloqueioStart, end: bloqueioEnd });
    }

    // 8. Buscar agendamentos existentes do profissional nesta data
    const dataInicio = `${data}T00:00:00`;
    const dataFim = `${data}T23:59:59`;

    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('data_hora, procedimento:procedimentos(duracao_minutos)')
      .eq('profissional_id', profissionalId)
      .gte('data_hora', dataInicio)
      .lte('data_hora', dataFim)
      .in('status', ['agendado', 'confirmado']);

    // 9. Subtrair agendamentos existentes
    if (agendamentos) {
      for (const ag of agendamentos) {
        const agDataHora = new Date(ag.data_hora);
        const agStart = agDataHora.getHours() * 60 + agDataHora.getMinutes();
        const agDuracao = (ag.procedimento as any)?.duracao_minutos || 60;
        const agEnd = agStart + agDuracao;

        availableRanges = subtractRange(availableRanges, { start: agStart, end: agEnd });
      }
    }

    // 10. Gerar slots
    const slots = generateSlots(availableRanges, duracaoMinutos, 30);

    return NextResponse.json({ slots });

  } catch (error) {
    console.error('Erro ao calcular disponibilidade:', error);
    return NextResponse.json({ error: 'Erro ao calcular disponibilidade' }, { status: 500 });
  }
}
