// src/app/api/google/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clinicaId = searchParams.get('clinicaId');
  const tipo = (searchParams.get('tipo') as 'calendar' | 'drive' | 'both') || 'both';

  if (!clinicaId) {
    return NextResponse.json({ error: 'clinicaId é obrigatório' }, { status: 400 });
  }

  const authUrl = getGoogleAuthUrl(clinicaId, tipo);
  
  return NextResponse.redirect(authUrl);
}