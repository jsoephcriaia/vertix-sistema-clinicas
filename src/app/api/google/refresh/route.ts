// src/app/api/google/refresh/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { googleConfig } from '@/lib/google';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TokenData {
  google_access_token: string;
  google_refresh_token: string | null;
  google_token_expiry: string;
  google_calendar_connected: boolean;
}

async function refreshToken(clinicaId: string, tokenData: TokenData): Promise<string | null> {
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clinicaId = searchParams.get('clinica_id');

  if (!clinicaId) {
    return NextResponse.json({ error: 'clinica_id é obrigatório' }, { status: 400 });
  }

  // Buscar dados da clínica
  const { data: clinica, error } = await supabase
    .from('clinicas')
    .select('google_access_token, google_refresh_token, google_token_expiry, google_calendar_connected')
    .eq('id', clinicaId)
    .single();

  if (error || !clinica) {
    return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
  }

  if (!clinica.google_calendar_connected || !clinica.google_access_token) {
    return NextResponse.json({ error: 'Google Calendar não conectado' }, { status: 400 });
  }

  const tokenData = clinica as TokenData;
  const expiry = new Date(tokenData.google_token_expiry);
  const now = new Date();

  // Se ainda tem mais de 5 minutos, retorna o token atual
  if (expiry.getTime() - now.getTime() > 5 * 60 * 1000) {
    return NextResponse.json({
      access_token: tokenData.google_access_token,
      expiry: tokenData.google_token_expiry,
      refreshed: false
    });
  }

  // Precisa renovar
  const newToken = await refreshToken(clinicaId, tokenData);

  if (!newToken) {
    return NextResponse.json({ error: 'Falha ao renovar token' }, { status: 500 });
  }

  return NextResponse.json({
    access_token: newToken,
    expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
    refreshed: true
  });
}
