import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const UAZAPI_URL = 'https://iaparanegocios.uazapi.com';

/**
 * GET - Obter detalhes de uma clínica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('*')
      .eq('id', clinicaId)
      .single();

    if (error || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ clinica });
  } catch (error) {
    console.error('Erro ao buscar clínica:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clínica' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Atualizar status da clínica (ativar/desativar)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;
    const body = await request.json();
    const { action, adminId } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar clínica atual
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('*')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    if (action === 'desativar') {
      // 1. Desconectar WhatsApp via UAZAPI (se tiver token)
      if (clinica.uazapi_instance_token) {
        try {
          // Tentar múltiplos endpoints de logout
          const logoutEndpoints = [
            { method: 'POST', url: '/instance/logout' },
            { method: 'DELETE', url: '/instance/logout' },
            { method: 'POST', url: '/instance/disconnect' },
          ];

          for (const endpoint of logoutEndpoints) {
            try {
              const response = await fetch(`${UAZAPI_URL}${endpoint.url}`, {
                method: endpoint.method,
                headers: { 'token': clinica.uazapi_instance_token },
              });
              if (response.ok) {
                break;
              }
            } catch {
              // Tenta próximo endpoint
            }
          }
        } catch (uazapiError) {
          console.error('Erro ao desconectar WhatsApp:', uazapiError);
          // Continua mesmo se falhar
        }
      }

      // 2. Atualizar status para inativo e limpar token UAZAPI
      const { error: updateError } = await supabase
        .from('clinicas')
        .update({
          status: 'inativo',
          uazapi_instance_token: null,
          uazapi_instance_name: null,
        })
        .eq('id', clinicaId);

      if (updateError) {
        return NextResponse.json(
          { error: `Erro ao desativar clínica: ${updateError.message}` },
          { status: 500 }
        );
      }

      // 3. Desativar usuários da clínica
      await supabase
        .from('usuarios')
        .update({ ativo: false })
        .eq('clinica_id', clinicaId);

      // 4. Registrar no audit log
      if (adminId) {
        await supabase.from('admin_audit_log').insert({
          admin_id: adminId,
          action: 'clinic_deactivated',
          clinica_id: clinicaId,
          details: { clinicaNome: clinica.nome },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Clínica desativada com sucesso',
      });

    } else if (action === 'ativar') {
      // Reativar clínica
      const { error: updateError } = await supabase
        .from('clinicas')
        .update({ status: 'ativo' })
        .eq('id', clinicaId);

      if (updateError) {
        return NextResponse.json(
          { error: `Erro ao ativar clínica: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Reativar usuários da clínica
      await supabase
        .from('usuarios')
        .update({ ativo: true })
        .eq('clinica_id', clinicaId);

      // Registrar no audit log
      if (adminId) {
        await supabase.from('admin_audit_log').insert({
          admin_id: adminId,
          action: 'clinic_activated',
          clinica_id: clinicaId,
          details: { clinicaNome: clinica.nome },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Clínica ativada com sucesso',
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida. Use "ativar" ou "desativar"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro ao atualizar clínica:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar clínica' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Excluir clínica completamente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;
    const url = new URL(request.url);
    const adminId = url.searchParams.get('adminId');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('*')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    // 1. Desconectar WhatsApp via UAZAPI (se tiver token)
    if (clinica.uazapi_instance_token) {
      try {
        const logoutEndpoints = [
          { method: 'POST', url: '/instance/logout' },
          { method: 'DELETE', url: '/instance/logout' },
          { method: 'POST', url: '/instance/disconnect' },
        ];

        for (const endpoint of logoutEndpoints) {
          try {
            const response = await fetch(`${UAZAPI_URL}${endpoint.url}`, {
              method: endpoint.method,
              headers: { 'token': clinica.uazapi_instance_token },
            });
            if (response.ok) {
              break;
            }
          } catch {
            // Tenta próximo endpoint
          }
        }
      } catch (uazapiError) {
        console.error('Erro ao desconectar WhatsApp:', uazapiError);
      }
    }

    // 2. Excluir dados relacionados (ordem importa por causa das foreign keys)
    // Agendamentos
    await supabase
      .from('agendamentos')
      .delete()
      .eq('clinica_id', clinicaId);

    // Lead procedimentos (relacionados aos leads)
    const { data: leads } = await supabase
      .from('leads_ia')
      .select('id')
      .eq('clinica_id', clinicaId);

    if (leads && leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      await supabase
        .from('lead_procedimentos')
        .delete()
        .in('lead_id', leadIds);
    }

    // Leads
    await supabase
      .from('leads_ia')
      .delete()
      .eq('clinica_id', clinicaId);

    // Clientes
    await supabase
      .from('clientes')
      .delete()
      .eq('clinica_id', clinicaId);

    // Procedimentos
    await supabase
      .from('procedimentos')
      .delete()
      .eq('clinica_id', clinicaId);

    // Horários de funcionamento
    await supabase
      .from('horarios_funcionamento')
      .delete()
      .eq('clinica_id', clinicaId);

    // FAQ
    await supabase
      .from('faq')
      .delete()
      .eq('clinica_id', clinicaId);

    // Políticas
    await supabase
      .from('politicas')
      .delete()
      .eq('clinica_id', clinicaId);

    // Usuários
    await supabase
      .from('usuarios')
      .delete()
      .eq('clinica_id', clinicaId);

    // 3. Registrar no audit log antes de excluir a clínica
    if (adminId) {
      await supabase.from('admin_audit_log').insert({
        admin_id: adminId,
        action: 'clinic_deleted',
        clinica_id: null, // Será excluída
        details: {
          clinicaId: clinicaId,
          clinicaNome: clinica.nome,
          chatwoot_account_id: clinica.chatwoot_account_id,
        },
      });
    }

    // 4. Finalmente, excluir a clínica
    const { error: deleteError } = await supabase
      .from('clinicas')
      .delete()
      .eq('id', clinicaId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Erro ao excluir clínica: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Clínica excluída com sucesso',
    });

  } catch (error) {
    console.error('Erro ao excluir clínica:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir clínica' },
      { status: 500 }
    );
  }
}
