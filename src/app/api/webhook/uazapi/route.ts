import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Configurações do Chatwoot
    const CHATWOOT_URL = 'https://vertix-chatwoot-clilnicas.bkbfzi.easypanel.host'
    const CHATWOOT_API_TOKEN = '6FteJEEmTswtPNMW66q7WWZS'
    const ACCOUNT_ID = '2'
    const INBOX_ID = '1'
    
    // Extrai dados da mensagem do UAZAPI
    const message = body.message || body
    
    // Monta o payload para o Chatwoot
    const chatwootPayload = {
      source_id: message.key?.id || message.id,
      sender: {
        identifier: message.key?.remoteJid?.replace('@s.whatsapp.net', '') || message.from,
        name: message.pushName || message.senderName || 'Cliente',
        phone_number: message.key?.remoteJid?.replace('@s.whatsapp.net', '') || message.from
      },
      content: message.message?.conversation || 
               message.message?.extendedTextMessage?.text || 
               message.text ||
               '[Mídia recebida]'
    }
    
    // Envia para o Chatwoot
    const response = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/inboxes/${INBOX_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_TOKEN
        },
        body: JSON.stringify(chatwootPayload)
      }
    )
    
    const result = await response.json()
    
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}