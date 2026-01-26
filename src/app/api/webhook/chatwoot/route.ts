import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const UAZAPI_URL = 'https://iaparanegocios.uazapi.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('=== WEBHOOK CHATWOOT RECEBIDO ===')
    console.log(JSON.stringify(body, null, 2))
    
    // Só processa mensagens de saída (outgoing) enviadas por agentes
    if (body.event !== 'message_created') {
      console.log('Evento ignorado:', body.event)
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Ignora mensagens incoming (do cliente) e privadas
    if (body.message_type === 'incoming' || body.private === true) {
      console.log('Mensagem incoming ou privada, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    // Só processa mensagens outgoing (do atendente)
    if (body.message_type !== 'outgoing') {
      console.log('Não é mensagem outgoing, ignorando...')
      return NextResponse.json({ success: true, ignored: true })
    }
    
    const accountId = body.account?.id?.toString()
    const messageContent = body.content
    const phoneNumber = body.conversation?.meta?.sender?.phone_number?.replace(/\D/g, '')
    
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