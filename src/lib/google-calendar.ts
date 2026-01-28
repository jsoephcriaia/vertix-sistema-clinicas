// src/lib/google-calendar.ts

import { supabase } from './supabase';
import { googleConfig } from './google';

interface TokenData {
  google_access_token: string;
  google_refresh_token: string | null;
  google_token_expiry: string;
  google_calendar_connected: boolean;
}

interface EventData {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeName?: string;
  attendeePhone?: string;
}

// Renovar token se expirado
async function refreshTokenIfNeeded(clinicaId: string, tokenData: TokenData): Promise<string | null> {
  const expiry = new Date(tokenData.google_token_expiry);
  const now = new Date();
  
  // Se ainda tem mais de 5 minutos, usa o token atual
  if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.google_access_token;
  }

  // Precisa renovar
  if (!tokenData.google_refresh_token) {
    console.error('Sem refresh token disponível');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        refresh_token: tokenData.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();

    if (tokens.error) {
      console.error('Erro ao renovar token:', tokens);
      return null;
    }

    // Calcular nova data de expiração
    const newExpiry = new Date();
    newExpiry.setSeconds(newExpiry.getSeconds() + tokens.expires_in);

    // Atualizar no banco
    await supabase
      .from('clinicas')
      .update({
        google_access_token: tokens.access_token,
        google_token_expiry: newExpiry.toISOString(),
      })
      .eq('id', clinicaId);

    return tokens.access_token;
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return null;
  }
}

// Obter token válido da clínica
async function getValidToken(clinicaId: string): Promise<string | null> {
  const { data: clinica, error } = await supabase
    .from('clinicas')
    .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_connected')
    .eq('id', clinicaId)
    .single();

  if (error || !clinica) {
    console.error('Erro ao buscar dados da clínica:', error);
    return null;
  }

  if (!clinica.google_calendar_connected || !clinica.google_access_token) {
    console.error('Google Calendar não conectado');
    return null;
  }

  return refreshTokenIfNeeded(clinicaId, clinica as TokenData);
}

// Criar evento no Google Calendar
export async function criarEventoCalendar(
  clinicaId: string,
  eventData: EventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const accessToken = await getValidToken(clinicaId);
  
  if (!accessToken) {
    return { success: false, error: 'Google Calendar não conectado ou token inválido' };
  }

  try {
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Erro ao criar evento:', data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, eventId: data.id };
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    return { success: false, error: 'Erro ao criar evento no Calendar' };
  }
}

// Deletar evento do Google Calendar
export async function deletarEventoCalendar(
  clinicaId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidToken(clinicaId);
  
  if (!accessToken) {
    return { success: false, error: 'Google Calendar não conectado ou token inválido' };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 204 || response.status === 200) {
      return { success: true };
    }

    const data = await response.json();
    console.error('Erro ao deletar evento:', data.error);
    return { success: false, error: data.error?.message || 'Erro ao deletar evento' };
  } catch (error) {
    console.error('Erro ao deletar evento:', error);
    return { success: false, error: 'Erro ao deletar evento do Calendar' };
  }
}

// Atualizar evento no Google Calendar
export async function atualizarEventoCalendar(
  clinicaId: string,
  eventId: string,
  eventData: Partial<EventData>
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidToken(clinicaId);
  
  if (!accessToken) {
    return { success: false, error: 'Google Calendar não conectado ou token inválido' };
  }

  try {
    const updateData: any = {};

    if (eventData.summary) {
      updateData.summary = eventData.summary;
    }
    if (eventData.description) {
      updateData.description = eventData.description;
    }
    if (eventData.startDateTime) {
      updateData.start = {
        dateTime: eventData.startDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    }
    if (eventData.endDateTime) {
      updateData.end = {
        dateTime: eventData.endDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Erro ao atualizar evento:', data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return { success: false, error: 'Erro ao atualizar evento no Calendar' };
  }
}
