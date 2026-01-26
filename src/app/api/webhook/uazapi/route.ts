import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== WEBHOOK UAZAPI RECEBIDO ===')
    console.log(JSON.stringify(body, null, 2))
    
    // Ignora mensagens enviadas pela API (evita loop)
    if (body.wasSentByApi) {
      console.log('Mensagem enviada pela API, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Ignora mensagens de grupo
    if (body.isGroup) {
      console.log('Mensagem de grupo, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Configurações do Chatwoot
    const CHATWOOT_URL = 'https://vertix-chatwoot-clilnicas.bkbfzi.easypanel.host'
    const CHATWOOT_API_TOKEN = '6FteJEEmTswtPNMW66q7WWZS'
    const ACCOUNT_ID = '2'
    const INBOX_ID = '1'
    
    // Extrai dados da mensagem do UAZAPI
    const messageData = body.message || body
    const remoteJid = messageData.key?.remoteJid || body.from || ''
    const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '')
    const senderName = messageData.pushName || body.pushName || body.senderName || 'Cliente'
    const messageId = messageData.key?.id || body.id || Date.now().toString()
    
    // Extrai o texto da mensagem
    let messageText = ''
    if (messageData.message?.conversation) {
      messageText = messageData.message.conversation
    } else if (messageData.message?.extendedTextMessage?.text) {
      messageText = messageData.message.extendedTextMessage.text
    } else if (body.text) {
      messageText = body.text
    } else if (body.body) {
      messageText = body.body
    } else {
      messageText = '[Mídia recebida]'
    }
    
    console.log('Dados extraídos:', { phoneNumber, senderName, messageText, messageId })
    
    // 1. Primeiro, busca ou cria o contato no Chatwoot
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
      // Contato existe
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
      
      contactId = createContactResult.payload?.contact?.id || createContactResult.id
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
    
    // Procura conversa aberta na inbox correta
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
    console.log('Mensagem enviada:', JSON.stringify(messageResult, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      contactId,
      conversationId,
      messageResult 
    })
    
  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}