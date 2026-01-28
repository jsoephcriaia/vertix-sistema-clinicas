import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Obter admin_id do header (enviado pelo frontend)
    const adminId = request.headers.get('x-admin-id');

    if (!adminId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, nome')
      .eq('id', adminId)
      .eq('ativo', true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Admin não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ admin });

  } catch (error) {
    console.error('Erro ao buscar admin:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
