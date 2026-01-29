import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST - Marca uma conversa como lida no Chatwoot
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { clinica_id, conversation_id } = body

    if (!clinica_id || !conversation_id) {
      return NextResponse.json({ error: 'clinica_id e conversation_id são obrigatórios' }, { status: 400 })
    }

    // Busca config do Chatwoot
    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinica_id)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    // Marca a conversa como lida no Chatwoot
    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversation_id}/update_last_seen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': clinica.chatwoot_api_token
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro ao marcar conversa como lida:', errorText)
      return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: response.status })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
