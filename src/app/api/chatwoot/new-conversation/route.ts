import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { clinica_id, phone_number, name } = body

    if (!clinica_id || !phone_number) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_inbox_id, chatwoot_api_token')
      .eq('id', clinica_id)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    const CHATWOOT_URL = clinica.chatwoot_url
    const CHATWOOT_API_TOKEN = clinica.chatwoot_api_token
    const ACCOUNT_ID = clinica.chatwoot_account_id
    const INBOX_ID = clinica.chatwoot_inbox_id || '1'

    // 1. Busca ou cria contato
    const searchResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${phone_number}`,
      {
        headers: { 'api_access_token': CHATWOOT_API_TOKEN }
      }
    )
    
    const searchResult = await searchResponse.json()
    let contactId: number

    if (searchResult.payload && searchResult.payload.length > 0) {
      contactId = searchResult.payload[0].id
    } else {
      // Criar novo contato
      const createContactResponse = await fetch(
        `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': CHATWOOT_API_TOKEN
          },
          body: JSON.stringify({
            inbox_id: parseInt(INBOX_ID),
            name: name || 'Novo contato',
            phone_number: `+${phone_number}`,
            identifier: phone_number
          })
        }
      )
      
      const createContactResult = await createContactResponse.json()
      
      if (createContactResult.payload?.contact?.id) {
        contactId = createContactResult.payload.contact.id
      } else if (createContactResult.id) {
        contactId = createContactResult.id
      } else {
        return NextResponse.json({ error: 'Erro ao criar contato' }, { status: 400 })
      }
    }

    // 2. Busca conversa existente ou cria nova
    const conversationsResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/${contactId}/conversations`,
      {
        headers: { 'api_access_token': CHATWOOT_API_TOKEN }
      }
    )
    
    const conversationsResult = await conversationsResponse.json()
    
    const existingConversation = conversationsResult.payload?.find(
      (conv: any) => conv.inbox_id === parseInt(INBOX_ID) && conv.status !== 'resolved'
    )
    
    if (existingConversation) {
      // Verificar se já existe lead com esse telefone
      const telefoneFormatado = phone_number.startsWith('+') ? phone_number : `+${phone_number}`

      const { data: leadExistente } = await supabase
        .from('leads_ia')
        .select('id')
        .eq('clinica_id', clinica_id)
        .or(`telefone.eq.${phone_number},telefone.eq.${telefoneFormatado}`)
        .single()

      if (!leadExistente) {
        // Criar lead mesmo para conversa existente
        await supabase
          .from('leads_ia')
          .insert({
            clinica_id: clinica_id,
            nome: name || 'Novo contato',
            telefone: telefoneFormatado,
            etapa: 'novo',
            conversation_id: existingConversation.id,
          })

        console.log('Lead criado para conversa existente:', telefoneFormatado)
      }

      return NextResponse.json({
        conversation_id: existingConversation.id,
        contact_id: contactId,
        existing: true
      })
    }

    // 3. Criar nova conversa
    const createConvResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_TOKEN
        },
        body: JSON.stringify({
          inbox_id: parseInt(INBOX_ID),
          contact_id: contactId,
          source_id: phone_number
        })
      }
    )

    const createConvResult = await createConvResponse.json()
    const conversationId = createConvResult.id

    // 4. Criar lead automaticamente se não existir
    const telefoneFormatado = phone_number.startsWith('+') ? phone_number : `+${phone_number}`

    // Verificar se já existe lead com esse telefone
    const { data: leadExistente } = await supabase
      .from('leads_ia')
      .select('id')
      .eq('clinica_id', clinica_id)
      .or(`telefone.eq.${phone_number},telefone.eq.${telefoneFormatado}`)
      .single()

    if (!leadExistente) {
      // Criar novo lead
      await supabase
        .from('leads_ia')
        .insert({
          clinica_id: clinica_id,
          nome: name || 'Novo contato',
          telefone: telefoneFormatado,
          etapa: 'novo',
          conversation_id: conversationId,
        })

      console.log('Lead criado automaticamente:', telefoneFormatado)
    } else {
      // Atualizar conversation_id se o lead já existe
      await supabase
        .from('leads_ia')
        .update({ conversation_id: conversationId })
        .eq('id', leadExistente.id)
    }

    return NextResponse.json({
      conversation_id: conversationId,
      contact_id: contactId,
      existing: false
    })

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}