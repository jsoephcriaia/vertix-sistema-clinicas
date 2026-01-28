import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chatwootAdmin } from '@/lib/chatwootAdmin';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET - Listar todas as clínicas
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('clinicas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ clinicas: data });
  } catch (error) {
    console.error('Erro ao listar clínicas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar clínicas' },
      { status: 500 }
    );
  }
}

// POST - Criar nova clínica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clinicaNome, usuarioNome, usuarioEmail, usuarioSenha, adminId } = body;

    // Validações
    if (!clinicaNome || !usuarioNome || !usuarioEmail || !usuarioSenha) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', usuarioEmail.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 400 }
      );
    }

    // 1. Criar clínica no Supabase
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .insert({
        nome: clinicaNome,
        chatwoot_setup_status: 'in_progress',
        created_by_admin_id: adminId,
        status: 'ativo',
      })
      .select()
      .single();

    if (clinicaError) throw clinicaError;

    // 2. Criar usuário no Supabase
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .insert({
        clinica_id: clinica.id,
        nome: usuarioNome,
        email: usuarioEmail.toLowerCase(),
        cargo: 'Administrador',
        ativo: true,
      })
      .select()
      .single();

    if (usuarioError) {
      // Rollback: deletar clínica
      await supabase.from('clinicas').delete().eq('id', clinica.id);
      throw usuarioError;
    }

    // 3. Tentar criar no Chatwoot (se configurado)
    if (chatwootAdmin.isConfigured()) {
      try {
        const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/chatwoot`;

        const chatwootResult = await chatwootAdmin.setupClinica(
          clinicaNome,
          usuarioEmail.toLowerCase(),
          usuarioNome,
          usuarioSenha,
          webhookUrl
        );

        // Atualizar clínica com dados do Chatwoot
        await supabase
          .from('clinicas')
          .update({
            chatwoot_url: process.env.CHATWOOT_PLATFORM_URL,
            chatwoot_account_id: String(chatwootResult.accountId),
            chatwoot_inbox_id: String(chatwootResult.inboxId),
            chatwoot_api_token: chatwootResult.apiToken,
            chatwoot_setup_status: 'completed',
          })
          .eq('id', clinica.id);

        // Registrar no audit log
        await supabase.from('admin_audit_log').insert({
          admin_id: adminId,
          action: 'clinic_created',
          clinica_id: clinica.id,
          details: {
            clinicaNome,
            usuarioEmail,
            chatwoot_account_id: chatwootResult.accountId,
            chatwoot_inbox_id: chatwootResult.inboxId,
          },
        });

        return NextResponse.json({
          success: true,
          clinica: {
            id: clinica.id,
            nome: clinicaNome,
            chatwoot_setup_status: 'completed',
          },
          usuario: {
            id: usuario.id,
            email: usuarioEmail,
          },
          message: 'Clínica criada com sucesso! Chatwoot configurado automaticamente.',
        });

      } catch (chatwootError) {
        console.error('Erro ao configurar Chatwoot:', chatwootError);

        // Atualizar status como falhou
        await supabase
          .from('clinicas')
          .update({
            chatwoot_setup_status: 'failed',
            chatwoot_setup_error: chatwootError instanceof Error ? chatwootError.message : 'Erro desconhecido',
          })
          .eq('id', clinica.id);

        return NextResponse.json({
          success: true,
          clinica: {
            id: clinica.id,
            nome: clinicaNome,
            chatwoot_setup_status: 'failed',
          },
          usuario: {
            id: usuario.id,
            email: usuarioEmail,
          },
          warning: 'Clínica criada, mas houve erro ao configurar Chatwoot. Configure manualmente.',
          chatwootError: chatwootError instanceof Error ? chatwootError.message : 'Erro desconhecido',
        });
      }
    } else {
      // Chatwoot não configurado - deixar status como pending
      await supabase
        .from('clinicas')
        .update({
          chatwoot_setup_status: 'pending',
        })
        .eq('id', clinica.id);

      // Registrar no audit log
      await supabase.from('admin_audit_log').insert({
        admin_id: adminId,
        action: 'clinic_created',
        clinica_id: clinica.id,
        details: {
          clinicaNome,
          usuarioEmail,
          chatwoot_configured: false,
        },
      });

      return NextResponse.json({
        success: true,
        clinica: {
          id: clinica.id,
          nome: clinicaNome,
          chatwoot_setup_status: 'pending',
        },
        usuario: {
          id: usuario.id,
          email: usuarioEmail,
        },
        warning: 'Clínica criada. Chatwoot não está configurado - configure manualmente.',
      });
    }

  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar clínica' },
      { status: 500 }
    );
  }
}
