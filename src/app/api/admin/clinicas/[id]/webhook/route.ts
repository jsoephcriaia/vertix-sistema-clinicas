import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST - Criar webhook para uma clínica existente no Chatwoot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados da clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_api_token, chatwoot_account_id')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    if (!clinica.chatwoot_url || !clinica.chatwoot_api_token || !clinica.chatwoot_account_id) {
      return NextResponse.json(
        { error: 'Chatwoot não configurado para esta clínica' },
        { status: 400 }
      );
    }

    // URL do webhook (para o sistema Vertix)
    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vertix-sistema-clinicas.bkbfzi.easypanel.host'}/api/webhook/chatwoot`;

    // Verificar se já existe webhook
    const listResponse = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/webhooks`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token,
        },
      }
    );

    if (listResponse.ok) {
      const webhooks = await listResponse.json();
      const existingWebhook = webhooks.payload?.find((w: { url: string }) => w.url === webhookUrl);

      if (existingWebhook) {
        return NextResponse.json({
          success: true,
          message: 'Webhook já existe',
          webhook: existingWebhook,
        });
      }
    }

    // Criar webhook
    const createResponse = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/webhooks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': clinica.chatwoot_api_token,
        },
        body: JSON.stringify({
          url: webhookUrl,
          subscriptions: ['message_created'],
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return NextResponse.json(
        { error: `Erro ao criar webhook: ${createResponse.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const webhook = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Webhook criado com sucesso',
      webhook,
    });

  } catch (error) {
    console.error('Erro ao criar webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET - Listar webhooks de uma clínica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados da clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_api_token, chatwoot_account_id')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    if (!clinica.chatwoot_url || !clinica.chatwoot_api_token || !clinica.chatwoot_account_id) {
      return NextResponse.json(
        { error: 'Chatwoot não configurado para esta clínica' },
        { status: 400 }
      );
    }

    // Listar webhooks
    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/webhooks`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Erro ao listar webhooks: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const webhooks = await response.json();

    return NextResponse.json({
      success: true,
      webhooks: webhooks.payload || webhooks,
    });

  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar webhooks' },
      { status: 500 }
    );
  }
}
