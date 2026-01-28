import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const clinicaId = request.nextUrl.searchParams.get('clinica_id')
    
    if (!clinicaId) {
      return NextResponse.json({ error: 'clinica_id required' }, { status: 400 })
    }

    // Busca config do Chatwoot
    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_inbox_id, chatwoot_api_token')
      .eq('id', clinicaId)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    // Busca conversas abertas
    const responseOpen = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations?inbox_id=${clinica.chatwoot_inbox_id || 1}&status=open`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token
        }
      }
    )
    const dataOpen = await responseOpen.json()

    // Busca conversas resolvidas
    const responseResolved = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations?inbox_id=${clinica.chatwoot_inbox_id || 1}&status=resolved`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token
        }
      }
    )
    const dataResolved = await responseResolved.json()

    // Combina as conversas
    const allConversations = [
      ...(dataOpen.data?.payload || []),
      ...(dataResolved.data?.payload || [])
    ]

    // Ordena por última atividade (mais recente primeiro)
    allConversations.sort((a: any, b: any) => {
      const timeA = a.last_activity_at || a.timestamp || 0
      const timeB = b.last_activity_at || b.timestamp || 0
      return timeB - timeA
    })

    return NextResponse.json({ 
      data: { 
        payload: allConversations 
      } 
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const { clinica_id, conversation_id } = await request.json();

    if (!clinica_id || !conversation_id) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Buscar configurações do Chatwoot
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinica_id)
      .single();

    if (!clinica?.chatwoot_url || !clinica?.chatwoot_api_token) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 });
    }

    // Deletar conversa no Chatwoot
    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversation_id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': clinica.chatwoot_api_token
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.error('Erro Chatwoot:', error);
      return NextResponse.json({ error: 'Erro ao deletar conversa' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}