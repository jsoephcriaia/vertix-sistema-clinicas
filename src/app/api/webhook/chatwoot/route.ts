import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const UAZAPI_URL = 'https://iaparanegocios.uazapi.com'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    console.log('=== WEBHOOK CHATWOOT RECEBIDO ===')
    console.log('Evento:', body.event)

    const eventType = body.event
    const accountId = body.account?.id?.toString()
    const conversationId = body.conversation?.id || body.id
    const phoneNumber = body.conversation?.meta?.sender?.phone_number?.replace(/\D/g, '')
    const senderName = body.conversation?.meta?.sender?.name || body.sender?.name || 'Novo contato'

    // Eventos que devem atualizar o Realtime (notificar frontend)
    const realtimeEvents = [
      'message_created',
      'message_updated',
      'conversation_created',
      'conversation_updated',
      'conversation_status_changed'
    ]

    // Se é um evento que deve notificar o frontend, atualiza o lead
    if (realtimeEvents.includes(eventType) && accountId && conversationId) {
      // Busca a clínica pelo account_id do Chatwoot
      const { data: clinica } = await supabase
        .from('clinicas')
        .select('id')
        .eq('chatwoot_account_id', accountId)
        .single()

      if (clinica && phoneNumber) {
        const telefoneFormatado = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`

        // Verificar se já existe lead com esse telefone
        const { data: leadExistente } = await supabase
          .from('leads_ia')
          .select('id')
          .eq('clinica_id', clinica.id)
          .or(`telefone.eq.${phoneNumber},telefone.eq.${telefoneFormatado}`)
          .single()

        if (leadExistente) {
          // Atualizar updated_at do lead para notificar via Realtime
          await supabase
            .from('leads_ia')
            .update({
              updated_at: new Date().toISOString(),
              conversation_id: conversationId
            })
            .eq('id', leadExistente.id)

          console.log('Lead atualizado via Realtime para evento:', eventType)
        } else if (eventType === 'message_created' || eventType === 'conversation_created') {
          // Criar novo lead apenas para mensagens/conversas novas
          await supabase
            .from('leads_ia')
            .insert({
              clinica_id: clinica.id,
              nome: senderName,
              telefone: telefoneFormatado,
              etapa: 'novo',
              conversation_id: conversationId,
            })

          console.log('Lead criado automaticamente:', telefoneFormatado)
        }
      }
    }

    // Ignora eventos que não são message_created para o resto do processamento
    if (eventType !== 'message_created') {
      return NextResponse.json({ success: true, event: eventType })
    }

    // Ignora mensagens privadas
    if (body.private === true) {
      console.log('Mensagem privada, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }

    const messageContent = body.content

    // Para mensagens incoming, já processamos o lead acima - só retorna
    if (body.message_type === 'incoming') {
      return NextResponse.json({ success: true, leadProcessed: true })
    }

    // Só processa mensagens outgoing (do atendente) para envio via UAZAPI
    if (body.message_type !== 'outgoing') {
      return NextResponse.json({ success: true, ignored: true })
    }
    
    console.log('Dados:', { accountId, messageContent, phoneNumber })
    
    if (!accountId || !messageContent || !phoneNumber) {
      console.log('Dados incompletos')
      return NextResponse.json({ success: false, error: 'Dados incompletos' }, { status: 400 })
    }
    
    // Busca a clínica pelo account_id do Chatwoot
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('id, nome, uazapi_instance_token')
      .eq('chatwoot_account_id', accountId)
      .single()
    
    if (clinicaError || !clinica) {
      console.log('Clínica não encontrada para account_id:', accountId)
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 404 })
    }
    
    console.log('Clínica encontrada:', clinica.nome)
    
    if (!clinica.uazapi_instance_token) {
      console.log('Token UAZAPI não configurado')
      return NextResponse.json({ success: false, error: 'UAZAPI não configurado' }, { status: 400 })
    }
    
    // Envia mensagem via UAZAPI
    const uazapiResponse = await fetch(`${UAZAPI_URL}/message/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': clinica.uazapi_instance_token
      },
      body: JSON.stringify({
        phone: phoneNumber,
        text: messageContent
      })
    })
    
    const uazapiResult = await uazapiResponse.json()
    console.log('Resposta UAZAPI:', JSON.stringify(uazapiResult, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      clinica: clinica.nome,
      uazapiResult 
    })
    
  } catch (error) {
    console.error('Erro no webhook Chatwoot:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}