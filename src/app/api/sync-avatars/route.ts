import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const clinicaId = request.nextUrl.searchParams.get('clinica_id')

    if (!clinicaId) {
      return NextResponse.json({ error: 'clinica_id required' }, { status: 400 })
    }

    // Busca config do Chatwoot
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_inbox_id, chatwoot_api_token')
      .eq('id', clinicaId)
      .single()

    if (clinicaError || !clinica?.chatwoot_url || !clinica?.chatwoot_api_token) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    // Busca conversas abertas e resolvidas do Chatwoot
    const headers = { 'api_access_token': clinica.chatwoot_api_token }
    const baseUrl = `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations`
    const inboxParam = `inbox_id=${clinica.chatwoot_inbox_id || 1}`

    const [openRes, resolvedRes] = await Promise.all([
      fetch(`${baseUrl}?${inboxParam}&status=open`, { headers }),
      fetch(`${baseUrl}?${inboxParam}&status=resolved`, { headers }),
    ])

    const openData = await openRes.json()
    const resolvedData = await resolvedRes.json()

    const allConversations = [
      ...(openData.data?.payload || []),
      ...(resolvedData.data?.payload || []),
    ]

    // Busca todos os leads da clínica
    const { data: leads } = await supabase
      .from('leads_ia')
      .select('id, conversation_id, telefone, avatar')
      .eq('clinica_id', clinicaId)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Nenhum lead encontrado' })
    }

    // Indexa leads por conversation_id e telefone
    const leadByConvId: Record<number, typeof leads[0]> = {}
    const leadByTelefone: Record<string, typeof leads[0]> = {}

    for (const lead of leads) {
      if (lead.conversation_id) leadByConvId[lead.conversation_id] = lead
      if (lead.telefone) {
        const tel = lead.telefone.replace(/\D/g, '')
        leadByTelefone[tel] = lead
        if (tel.length >= 9) leadByTelefone[tel.slice(-9)] = lead
      }
    }

    // Match conversas com leads e coleta avatares para atualizar
    const updates: { id: string; avatar: string }[] = []
    const updatedIds = new Set<string>()

    for (const conv of allConversations) {
      const sender = conv.meta?.sender || {}
      const avatar = sender.thumbnail || sender.avatar_url
      if (!avatar) continue

      // Tenta match por conversation_id
      let lead = leadByConvId[conv.id]

      // Fallback: match por telefone
      if (!lead && sender.phone_number) {
        const tel = sender.phone_number.replace(/\D/g, '')
        lead = leadByTelefone[tel] || leadByTelefone[tel.slice(-9)]
      }

      if (lead && lead.avatar !== avatar && !updatedIds.has(lead.id)) {
        updates.push({ id: lead.id, avatar })
        updatedIds.add(lead.id)
      }
    }

    // Atualiza em batch
    let updated = 0
    for (const { id, avatar } of updates) {
      const { error } = await supabase
        .from('leads_ia')
        .update({ avatar })
        .eq('id', id)

      if (!error) updated++
    }

    return NextResponse.json({ updated, total_leads: leads.length, total_conversas: allConversations.length })
  } catch (error) {
    console.error('Erro sync-avatars:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
