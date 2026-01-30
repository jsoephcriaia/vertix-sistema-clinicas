import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/jwt';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
      return NextResponse.json({ usuario: null, clinica: null });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ usuario: null, clinica: null });
    }

    const supabase = getSupabase();

    // Buscar usuário atualizado
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nome, email, cargo, clinica_id, avatar')
      .eq('id', payload.usuario_id)
      .single();

    if (!usuario) {
      return NextResponse.json({ usuario: null, clinica: null });
    }

    // Buscar clínica
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('id, nome')
      .eq('id', usuario.clinica_id)
      .single();

    return NextResponse.json({ usuario, clinica });
  } catch (error) {
    console.error('[SESSION] Erro:', error);
    return NextResponse.json({ usuario: null, clinica: null });
  }
}
