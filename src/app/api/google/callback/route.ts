// src/app/api/google/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { googleConfig } from '@/lib/google';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = 'https://vertix-sistema-clinicas.bkbfzi.easypanel.host';

  if (error) {
    console.error('Erro OAuth:', error);
    return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=error&message=${error}`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=error&message=missing_params`);
  }

  try {
    // Decodificar state
    const state = JSON.parse(decodeURIComponent(stateParam));
    const { clinicaId, tipo } = state;

    // Trocar code por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: googleConfig.redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Erro ao obter tokens:', tokens);
      return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=error&message=${tokens.error}`);
    }

    // Calcular data de expiração
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token || null,
      google_token_expiry: expiryDate.toISOString(),
    };

    // Marcar quais serviços foram conectados
    if (tipo === 'calendar' || tipo === 'both') {
      updateData.google_calendar_connected = true;
    }
    if (tipo === 'drive' || tipo === 'both') {
      updateData.google_drive_connected = true;
    }

    // Salvar tokens no Supabase
    const { error: dbError } = await supabase
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);

    if (dbError) {
      console.error('Erro ao salvar tokens:', dbError);
      return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=error&message=db_error`);
    }

    // Sucesso!
    return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=success`);

  } catch (err) {
    console.error('Erro no callback:', err);
    return NextResponse.redirect(`${baseUrl}/?tab=configuracoes&subtab=integracoes&google=error&message=unknown_error`);
  }
}