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

    // Ignora eventos de conexão/status (não são mensagens reais)
    if (body.event === 'connection' || body.event === 'status' || body.event === 'qrcode') {
      console.log('Evento de sistema, ignorando:', body.event)
      return NextResponse.json({ success: true, ignored: true })
    }

    // Ignora se não tiver mensagem ou chat
    if (!body.message && !body.chat?.wa_lastMessageTextVote) {
      console.log('Evento sem mensagem, ignorando...')
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
    
    // Extrai dados da mensagem do UAZAPI
    const phoneNumber = body.chat?.phone?.replace(/\D/g, '') || 
                        body.message?.chatid?.replace('@s.whatsapp.net', '').replace('@c.us', '') ||
                        body.chat?.wa_chatid?.replace('@s.whatsapp.net', '').replace('@c.us', '') || ''
    
    const senderName = body.message?.senderName || 
                       body.chat?.wa_name || 
                       body.chat?.name || 
                       'Cliente'
    
    const messageId = body.message?.messageid || 
                      body.message?.id || 
                      Date.now().toString()
    
    // Detecta tipo de mídia
    const messageData = body.message || {}
    const hasImage = messageData.image || messageData.imageMessage
    const hasAudio = messageData.audio || messageData.audioMessage || messageData.ptt
    const hasVideo = messageData.video || messageData.videoMessage
    const hasDocument = messageData.document || messageData.documentMessage
    const hasSticker = messageData.sticker || messageData.stickerMessage
    
    const isMedia = hasImage || hasAudio || hasVideo || hasDocument || hasSticker
    
    // Texto da mensagem
    let messageText = messageData.text || 
                      messageData.content || 
                      messageData.caption ||
                      messageData.conversation ||
                      body.chat?.wa_lastMessageTextVote || ''
    
    console.log('Dados extraídos:', { phoneNumber, senderName, messageText, messageId, isMedia })

    if (!phoneNumber) {
      console.log('Número de telefone não encontrado')
      return NextResponse.json({ success: false, error: 'Telefone não encontrado' }, { status: 400 })
    }

    // Ignora se não tiver conteúdo (mensagem vazia e sem mídia)
    if (!messageText && !isMedia) {
      console.log('Mensagem sem conteúdo, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }

    // Ignora se o nome parecer ser um ID de instância (vertix-XXXXXXX)
    if (senderName.startsWith('vertix-') || senderName.match(/^\d{10,}$/)) {
      console.log('Remetente parece ser instância, ignorando:', senderName)
      return NextResponse.json({ success: true, ignored: true })
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
    let contactId: number
    
    if (searchResult.payload && searchResult.payload.length > 0) {
      contactId = searchResult.payload[0].id
      console.log('Contato encontrado:', contactId)
    } else {
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
      
      if (createContactResult.payload?.contact?.id) {
        contactId = createContactResult.payload.contact.id
      } else if (createContactResult.id) {
        contactId = createContactResult.id
      } else {
        console.log('Erro ao criar contato:', createContactResult)
        return NextResponse.json({ success: false, error: 'Erro ao criar contato' }, { status: 400 })
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
    let conversationId: number
    
    const existingConversation = conversationsResult.payload?.find(
      (conv: any) => conv.inbox_id === parseInt(INBOX_ID) && conv.status !== 'resolved'
    )
    
    if (existingConversation) {
      conversationId = existingConversation.id
      console.log('Conversa existente:', conversationId)
    } else {
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
      conversationId = createConvResult.id
    }
    
    // 3. Envia a mensagem (com ou sem mídia)
    if (isMedia) {
      // Tenta baixar a mídia da UAZAPI
      try {
        const mediaResponse = await fetch(
          `${UAZAPI_URL}/message/download-media/${messageId}`,
          {
            headers: {
              'Authorization': `Bearer ${instanceToken}`
            }
          }
        )
        
        if (mediaResponse.ok) {
          const mediaBuffer = await mediaResponse.arrayBuffer()
          const mediaBase64 = Buffer.from(mediaBuffer).toString('base64')
          
          // Determina o tipo de mídia
          let mimeType = 'application/octet-stream'
          let fileName = 'arquivo'
          
          if (hasImage) {
            mimeType = messageData.image?.mimetype || messageData.imageMessage?.mimetype || 'image/jpeg'
            fileName = 'imagem.jpg'
          } else if (hasAudio) {
            mimeType = messageData.audio?.mimetype || messageData.audioMessage?.mimetype || 'audio/ogg'
            fileName = 'audio.ogg'
          } else if (hasVideo) {
            mimeType = messageData.video?.mimetype || messageData.videoMessage?.mimetype || 'video/mp4'
            fileName = 'video.mp4'
          } else if (hasSticker) {
            mimeType = messageData.sticker?.mimetype || messageData.stickerMessage?.mimetype || 'image/webp'
            fileName = 'sticker.webp'
          } else if (hasDocument) {
            mimeType = messageData.document?.mimetype || messageData.documentMessage?.mimetype || 'application/pdf'
            fileName = messageData.document?.fileName || messageData.documentMessage?.fileName || 'documento'
          }
          
          // Envia para o Chatwoot com attachment
          const formData = new FormData()
          formData.append('content', messageText || '')
          formData.append('message_type', 'incoming')
          formData.append('private', 'false')
          
          // Converte base64 para Blob
          const byteCharacters = atob(mediaBase64)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          
          formData.append('attachments[]', blob, fileName)
          
          const messageResponse = await fetch(
            `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`,
            {
              method: 'POST',
              headers: {
                'api_access_token': CHATWOOT_API_TOKEN
              },
              body: formData
            }
          )
          
          const messageResult = await messageResponse.json()
          console.log('Mensagem com mídia enviada:', JSON.stringify(messageResult, null, 2))
          
          return NextResponse.json({ 
            success: true, 
            clinica: clinica.nome,
            contactId,
            conversationId,
            messageResult,
            mediaType: mimeType
          })
        } else {
          console.log('Erro ao baixar mídia, enviando como texto')
        }
      } catch (mediaError) {
        console.log('Erro ao processar mídia:', mediaError)
      }
      
      // Fallback: se não conseguiu baixar a mídia, envia descrição
      let mediaDescription = '[Mídia recebida]'
      if (hasImage) mediaDescription = '📷 [Imagem]'
      if (hasAudio) mediaDescription = '🎵 [Áudio]'
      if (hasVideo) mediaDescription = '🎥 [Vídeo]'
      if (hasSticker) mediaDescription = '🎭 [Sticker]'
      if (hasDocument) mediaDescription = '📄 [Documento]'
      
      messageText = messageText ? `${mediaDescription}\n${messageText}` : mediaDescription
    }
    
    // Envia mensagem de texto
    const messageResponse = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': CHATWOOT_API_TOKEN
        },
        body: JSON.stringify({
          content: messageText || '[Mensagem sem texto]',
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