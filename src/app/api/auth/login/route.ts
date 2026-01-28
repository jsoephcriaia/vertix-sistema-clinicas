import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    console.log('[LOGIN] Tentativa de login:', email);

    if (!email || !senha) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Primeiro, verificar se o usuário existe e tem senha_hash
    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('id, nome, email, cargo, clinica_id, ativo, senha_hash')
      .eq('email', email.toLowerCase())
      .single();

    console.log('[LOGIN] Usuário encontrado:', usuario ? 'Sim' : 'Não', userError?.message || '');

    if (userError || !usuario) {
      return NextResponse.json(
        { error: 'Email não encontrado' },
        { status: 401 }
      );
    }

    if (!usuario.ativo) {
      return NextResponse.json(
        { error: 'Usuário inativo' },
        { status: 401 }
      );
    }

    console.log('[LOGIN] Usuário tem senha_hash:', usuario.senha_hash ? 'Sim' : 'Não');

    // Se não tem senha_hash, permitir login com senha padrão 123456
    if (!usuario.senha_hash) {
      console.log('[LOGIN] Usuário sem senha_hash, verificando senha padrão');
      if (senha === '123456') {
        const { data: clinicaData } = await supabase
          .from('clinicas')
          .select('id, nome')
          .eq('id', usuario.clinica_id)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { senha_hash: _, ...usuarioSemSenha } = usuario;

        return NextResponse.json({
          success: true,
          usuario: usuarioSemSenha,
          clinica: clinicaData
        });
      }
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Verificar senha usando função RPC
    console.log('[LOGIN] Verificando senha via RPC...');
    const { data: result, error: rpcError } = await supabase
      .rpc('verify_usuario_password', {
        p_email: email.toLowerCase(),
        p_senha: senha
      });

    console.log('[LOGIN] Resultado RPC:', result, rpcError?.message || '');

    if (rpcError) {
      console.error('[LOGIN] Erro ao verificar senha:', rpcError);
      return NextResponse.json(
        { error: 'Erro ao verificar credenciais' },
        { status: 500 }
      );
    }

    // Se não retornou nenhum resultado, senha incorreta
    if (!result || result.length === 0) {
      console.log('[LOGIN] RPC não retornou resultados - senha incorreta');
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    // Buscar dados da clínica
    const { data: clinicaData } = await supabase
      .from('clinicas')
      .select('id, nome')
      .eq('id', usuario.clinica_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { senha_hash: _, ...usuarioSemSenha } = usuario;

    console.log('[LOGIN] Login bem sucedido para:', email);

    return NextResponse.json({
      success: true,
      usuario: usuarioSemSenha,
      clinica: clinicaData
    });

  } catch (error) {
    console.error('[LOGIN] Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    );
  }
}
