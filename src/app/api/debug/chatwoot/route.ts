import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint de debug para testar conexão com Chatwoot
 * GET /api/debug/chatwoot?clinica_id=xxx
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
    .select('chatwoot_url, chatwoot_api_token, chatwoot_account_id, chatwoot_inbox_id')
    .eq('id', clinicaId)
    .single();

  if (clinicaError || !clinica) {
    return NextResponse.json({ error: 'Clínica não encontrada', details: clinicaError }, { status: 404 });
  }

  const results: Record<string, unknown> = {
    clinica_data: {
      chatwoot_url: clinica.chatwoot_url,
      chatwoot_account_id: clinica.chatwoot_account_id,
      chatwoot_inbox_id: clinica.chatwoot_inbox_id,
      has_token: !!clinica.chatwoot_api_token,
    },
    tests: {},
  };

  // Teste 1: Listar inboxes
  try {
    const inboxesResponse = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/inboxes`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token,
        },
      }
    );
    const inboxesData = await inboxesResponse.json();
    results.tests = {
      ...results.tests as object,
      list_inboxes: {
        status: inboxesResponse.status,
        ok: inboxesResponse.ok,
        data: inboxesResponse.ok ? inboxesData : inboxesData,
      },
    };
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      list_inboxes: { error: String(e) },
    };
  }

  // Teste 2: Verificar inbox específico
  try {
    const inboxResponse = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/inboxes/${clinica.chatwoot_inbox_id}`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token,
        },
      }
    );
    const inboxData = await inboxResponse.json();
    results.tests = {
      ...results.tests as object,
      get_inbox: {
        status: inboxResponse.status,
        ok: inboxResponse.ok,
        data: inboxData,
      },
    };
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      get_inbox: { error: String(e) },
    };
  }

  // Teste 3: Listar conversas
  try {
    const convsResponse = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations?inbox_id=${clinica.chatwoot_inbox_id}&status=open`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token,
        },
      }
    );
    const convsData = await convsResponse.json();
    results.tests = {
      ...results.tests as object,
      list_conversations: {
        status: convsResponse.status,
        ok: convsResponse.ok,
        count: convsData?.data?.meta?.all_count || convsData?.meta?.all_count || 'unknown',
      },
    };
  } catch (e) {
    results.tests = {
      ...results.tests as object,
      list_conversations: { error: String(e) },
    };
  }

  return NextResponse.json(results);
}
