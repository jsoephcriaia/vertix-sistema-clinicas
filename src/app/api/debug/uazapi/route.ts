import { NextRequest, NextResponse } from 'next/server';

const UAZAPI_URL = 'https://iaparanegocios.uazapi.com';

/**
 * Endpoint de debug para testar configuração UAZAPI
 * GET /api/debug/uazapi?clinica_id=xxx
 */
export async function GET(request: NextRequest) {
  const clinicaId = request.nextUrl.searchParams.get('clinica_id');

  if (!clinicaId) {
    return NextResponse.json({ error: 'clinica_id é obrigatório' }, { status: 400 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Buscar dados da clínica
  const { data: clinica, error: clinicaError } = await supabase
    .from('clinicas')
    .select('uazapi_instance_token, uazapi_instance_name, chatwoot_url, chatwoot_account_id, chatwoot_inbox_id')
    .eq('id', clinicaId)
    .single();

  if (clinicaError || !clinica) {
    return NextResponse.json({ error: 'Clínica não encontrada', details: clinicaError }, { status: 404 });
  }

  if (!clinica.uazapi_instance_token) {
    return NextResponse.json({ error: 'UAZAPI não configurado para esta clínica' }, { status: 400 });
  }

  const results: Record<string, unknown> = {
    clinica_data: {
      uazapi_instance_name: clinica.uazapi_instance_name,
      has_token: !!clinica.uazapi_instance_token,
      chatwoot_url: clinica.chatwoot_url,
      chatwoot_account_id: clinica.chatwoot_account_id,
      chatwoot_inbox_id: clinica.chatwoot_inbox_id,
    },
    tests: {},
  };

  const token = clinica.uazapi_instance_token;

  // Teste 1: Status da instância
  try {
    const statusResponse = await fetch(`${UAZAPI_URL}/instance/status`, {
      headers: { 'token': token },
    });
    const statusData = await statusResponse.json();
    results.tests = {
      ...results.tests as object,
      instance_status: {
        status: statusResponse.status,
        ok: statusResponse.ok,
        data: statusData,
      },
    };
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      instance_status: { error: String(e) },
    };
  }

  // Teste 2: Configuração Chatwoot no UAZAPI
  try {
    const chatwootResponse = await fetch(`${UAZAPI_URL}/chatwoot/config`, {
      headers: { 'token': token },
    });
    const chatwootData = await chatwootResponse.json();
    results.tests = {
      ...results.tests as object,
      chatwoot_config: {
        status: chatwootResponse.status,
        ok: chatwootResponse.ok,
        data: chatwootData,
      },
    };
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      chatwoot_config: { error: String(e) },
    };
  }

  // Teste 3: Verificar webhooks configurados (se existir endpoint)
  try {
    const webhookResponse = await fetch(`${UAZAPI_URL}/webhook/config`, {
      headers: { 'token': token },
    });
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      results.tests = {
        ...results.tests as object,
        webhook_config: {
          status: webhookResponse.status,
          ok: webhookResponse.ok,
          data: webhookData,
        },
      };
    } else {
      results.tests = {
        ...results.tests as object,
        webhook_config: {
          status: webhookResponse.status,
          message: 'Endpoint não disponível ou sem dados',
        },
      };
    }
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      webhook_config: { error: String(e) },
    };
  }

  return NextResponse.json(results);
}
