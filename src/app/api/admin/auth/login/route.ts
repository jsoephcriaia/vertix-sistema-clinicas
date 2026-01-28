import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Usar service role key para queries administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar admin e verificar senha usando pgcrypto
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, nome, senha_hash')
      .eq('email', email.toLowerCase())
      .eq('ativo', true)
      .single();

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha usando pgcrypto no banco
    const { data: senhaValida } = await supabase
      .rpc('verify_admin_password', {
        admin_email: email.toLowerCase(),
        senha_input: senha
      });

    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Retornar dados do admin (sem a senha)
    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        nome: admin.nome,
      }
    });

  } catch (error) {
    console.error('Erro no login admin:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
