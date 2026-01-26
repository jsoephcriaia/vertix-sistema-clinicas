import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== WEBHOOK UAZAPI RECEBIDO ===')
    console.log(JSON.stringify(body, null, 2))
    
    // Ignora mensagens enviadas pela API (evita loop)
    if (body.message?.wasSentByApi) {
      console.log('Mensagem enviada pela API, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Ignora mensagens de grupo
    if (body.message?.isGroup || body.chat?.wa_isGroup) {
      console.log('Mensagem de grupo, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Pega o token da instância
    const instanceToken = body.token
    
    if (!instanceToken) {
      console.log('Token da instância não encontrado')
      return NextResponse.json({ success: false, error: 'Token não encontrado' }, { status: 400 })
    }
    
    console.log('Instance Token:', instanceToken)
    
    // Busca a clínica pelo token da instância UAZAPI
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('id, nome, chatwoot_url, chatwoot_account_id, chatwoot_inbox_id, chatwoot_api_token')
      .eq('uazapi_instance_token', instanceToken)
      .single()
    
    if (clinicaError || !clinica) {
      console.log('Clínica não encontrada para o token:', instanceToken)
      return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 404 })
    }
    
    console.log('Clínica encontrada:', clinica.nome)
    
    // Verifica se tem configuração do Chatwoot
    if (!clinica.chatwoot_url || !clinica.chatwoot_api_token || !clinica.chatwoot_account_id) {
      console.log('Chatwoot não configurado para esta clínica')
      return NextResponse.json({ success: false, error: 'Chatwoot não configurado' }, { status: 400 })
    }
    
    const CHATWOOT_URL = clinica.chatwoot_url
    const CHATWOOT_API_TOKEN = clinica.chatwoot_api_token
    const ACCOUNT_ID = clinica.chatwoot_account_id
    const INBOX_ID = clinica.chatwoot_inbox_id || '1'
    
    // Extrai dados da mensagem do UAZAPI (estrutura correta)
    const phoneNumber = body.chat?.phone?.replace(/\D/g, '') || 
                        body.message?.chatid?.replace('@s.whatsapp.net', '').replace('@c.us', '') ||
                        body.chat?.wa_chatid?.replace('@s.whatsapp.net', '').replace('@c.us', '') || ''
    
    const senderName = body.message?.senderName || 
                       body.chat?.wa_name || 
                       body.chat?.name || 
                       'Cliente'
    
    const messageText = body.message?.text || 
                        body.message?.content || 
                        body.chat?.wa_lastMessageTextVote ||
                        '[Mídia recebida]'
    
    const messageId = body.message?.messageid || 
                      body.message?.id || 
                      Date.now().toString()
    
    console.log('Dados extraídos:', { phoneNumber, senderName, messageText, messageId })
    
    if (!phoneNumber) {
      console.log('Número de telefone não encontrado')
      return NextResponse.json({ success: false, error: 'Telefone não encontrado' }, { status: 400 })
    }
    
    // 1. Busca ou cria o contato no Chatwoot
    const searchResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/search?q=${phoneNumber}`,
      {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN
        }
      }
    )
    
    const searchResult = await searchResponse.json()
    console.log('Busca de contato:', JSON.stringify(searchResult, null, 2))
    
    let contactId: number
    
    if (searchResult.payload && searchResult.payload.length > 0) {
      contactId = searchResult.payload[0].id
      console.log('Contato encontrado:', contactId)
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
            name: senderName,
            phone_number: `+${phoneNumber}`,
            identifier: phoneNumber
          })
        }
      )
      
      const createContactResult = await createContactResponse.json()
      console.log('Contato criado:', JSON.stringify(createContactResult, null, 2))
      
      if (createContactResult.payload?.contact?.id) {
        contactId = createContactResult.payload.contact.id
      } else if (createContactResult.id) {
        contactId = createContactResult.id
      } else {
        console.log('Erro ao criar contato:', createContactResult)
        return NextResponse.json({ success: false, error: 'Erro ao criar contato', details: createContactResult }, { status: 400 })
      }
    }
    
    // 2. Busca conversa existente ou cria uma nova
    const conversationsResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/contacts/${contactId}/conversations`,
      {
        headers: {
          'api_access_token': CHATWOOT_API_TOKEN
        }
      }
    )
    
    const conversationsResult = await conversationsResponse.json()
    console.log('Conversas do contato:', JSON.stringify(conversationsResult, null, 2))
    
    let conversationId: number
    
    const existingConversation = conversationsResult.payload?.find(
      (conv: any) => conv.inbox_id === parseInt(INBOX_ID) && conv.status !== 'resolved'
    )
    
    if (existingConversation) {
      conversationId = existingConversation.id
      console.log('Conversa existente:', conversationId)
    } else {
      // Criar nova conversa
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
            source_id: phoneNumber
          })
        }
      )
      
      const createConvResult = await createConvResponse.json()
      console.log('Conversa criada:', JSON.stringify(createConvResult, null, 2))
      
      conversationId = createConvResult.id
    }
    
    // 3. Envia a mensagem na conversa
    const messageResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_TOKEN
        },
        body: JSON.stringify({
          content: messageText,
          message_type: 'incoming',
          private: false
        })
      }
    )
    
    const messageResult = await messageResponse.json()
    console.log('Mensagem enviada ao Chatwoot:', JSON.stringify(messageResult, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      clinica: clinica.nome,
      contactId,
      conversationId,
      messageResult 
    })
    
  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}