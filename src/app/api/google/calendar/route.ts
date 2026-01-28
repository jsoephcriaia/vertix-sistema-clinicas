// src/app/api/google/calendar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { criarEventoCalendar, deletarEventoCalendar } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, clinicaId, eventId, eventData } = body;

    if (!clinicaId) {
      return NextResponse.json({ error: 'clinicaId é obrigatório' }, { status: 400 });
    }

    if (action === 'create') {
      if (!eventData) {
        return NextResponse.json({ error: 'eventData é obrigatório' }, { status: 400 });
      }

      const result = await criarEventoCalendar(clinicaId, eventData);
      
      if (result.success) {
        return NextResponse.json({ success: true, eventId: result.eventId });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    }

    if (action === 'delete') {
      if (!eventId) {
        return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
      }

      const result = await deletarEventoCalendar(clinicaId, eventId);
      
      if (result.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'action inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API do Calendar:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
