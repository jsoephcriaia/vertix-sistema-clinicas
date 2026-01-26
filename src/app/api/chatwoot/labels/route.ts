import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clinica_id, conversation_id, labels } = body
    
    if (!clinica_id || !conversation_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinica_id)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversation_id}/labels`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': clinica.chatwoot_api_token
        },
        body: JSON.stringify({ labels })
      }
    )

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}