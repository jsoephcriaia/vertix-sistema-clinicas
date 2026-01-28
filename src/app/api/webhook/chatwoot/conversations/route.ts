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

    // Busca conversas no Chatwoot
    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations?inbox_id=${clinica.chatwoot_inbox_id || 1}&status=open`,
      {
        headers: {
          'api_access_token': clinica.chatwoot_api_token
        }
      }
    )

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}