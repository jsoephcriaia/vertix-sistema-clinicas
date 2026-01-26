import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const clinicaId = request.nextUrl.searchParams.get('clinica_id')
    const conversationId = request.nextUrl.searchParams.get('conversation_id')
    
    if (!clinicaId || !conversationId) {
      return NextResponse.json({ error: 'clinica_id e conversation_id required' }, { status: 400 })
    }

    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinicaId)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversationId}/messages`,
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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let clinicaId: string
    let conversationId: string
    let content: string
    let replyTo: string | null = null
    let files: File[] = []
    
    // Verifica se é FormData (com arquivos) ou JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      clinicaId = formData.get('clinica_id') as string
      conversationId = formData.get('conversation_id') as string
      content = formData.get('content') as string || ''
      replyTo = formData.get('reply_to') as string | null
      
      // Pega os arquivos
      const attachments = formData.getAll('attachments[]')
      files = attachments.filter(a => a instanceof File) as File[]
    } else {
      const body = await request.json()
      clinicaId = body.clinica_id
      conversationId = body.conversation_id
      content = body.content
      replyTo = body.reply_to
    }
    
    if (!clinicaId || !conversationId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const { data: clinica, error } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinicaId)
      .single()

    if (error || !clinica?.chatwoot_url) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 })
    }

    let response
    
    if (files.length > 0) {
      // Envia com FormData para o Chatwoot
      const chatwootFormData = new FormData()
      chatwootFormData.append('content', content)
      chatwootFormData.append('message_type', 'outgoing')
      chatwootFormData.append('private', 'false')
      
      if (replyTo) {
        chatwootFormData.append('content_attributes[in_reply_to]', replyTo)
      }
      
      for (const file of files) {
        chatwootFormData.append('attachments[]', file)
      }
      
      response = await fetch(
        `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'api_access_token': clinica.chatwoot_api_token
          },
          body: chatwootFormData
        }
      )
    } else {
      // Envia só texto
      const body: any = {
        content,
        message_type: 'outgoing',
        private: false
      }
      
      if (replyTo) {
        body.content_attributes = {
          in_reply_to: parseInt(replyTo)
        }
      }
      
      response = await fetch(
        `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api_access_token': clinica.chatwoot_api_token
          },
          body: JSON.stringify(body)
        }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}