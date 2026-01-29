import { NextRequest, NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = 'https://servidor-n8n.bkbfzi.easypanel.host/webhook/indexar-clinica'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clinica_id } = body

    if (!clinica_id) {
      return NextResponse.json(
        { success: false, error: 'clinica_id é obrigatório' },
        { status: 400 }
      )
    }

    console.log('RAG Reindex: Disparando para clínica', clinica_id)

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clinica_id }),
    })

    const data = await response.json()

    console.log('RAG Reindex: Resposta do n8n', data)

    return NextResponse.json({
      success: true,
      message: 'Reindexação disparada',
      n8n_response: data
    })
  } catch (error) {
    console.error('RAG Reindex: Erro', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
