import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const CHATWOOT_URL = process.env.CHATWOOT_PLATFORM_URL || ''
const VERTIX_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.vertix.com.br'

const WEBHOOK_EVENTS = [
  'message_created',
  'message_updated',
  'conversation_created',
  'conversation_status_changed',
  'conversation_updated'
]

interface Webhook {
  id: number
  url: string
  subscriptions: string[]
}

// POST - Atualizar webhooks de todas as clínicas
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar todas as clínicas com Chatwoot configurado
    const { data: clinicas, error: clinicasError } = await supabase
      .from('clinicas')
      .select('id, nome, chatwoot_account_id, chatwoot_api_token')
      .not('chatwoot_account_id', 'is', null)
      .not('chatwoot_api_token', 'is', null)

    if (clinicasError) {
      return NextResponse.json({ error: clinicasError.message }, { status: 500 })
    }

    if (!clinicas || clinicas.length === 0) {
      return NextResponse.json({ message: 'Nenhuma clínica com Chatwoot configurado' })
    }

    const results: { clinica: string; status: string; details?: string }[] = []
    const webhookUrl = `${VERTIX_URL}/api/webhook/chatwoot`

    for (const clinica of clinicas) {
      try {
        const accountId = clinica.chatwoot_account_id
        const apiToken = clinica.chatwoot_api_token

        // 1. Listar webhooks existentes
        const listResponse = await fetch(
          `${CHATWOOT_URL}/api/v1/accounts/${accountId}/webhooks`,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_access_token': apiToken,
            },
          }
        )

        if (!listResponse.ok) {
          results.push({
            clinica: clinica.nome,
            status: 'error',
            details: `Erro ao listar webhooks: ${listResponse.status}`
          })
          continue
        }

        const webhooks: { payload: Webhook[] } = await listResponse.json()
        const existingWebhook = webhooks.payload?.find((w: Webhook) =>
          w.url.includes('/api/webhook/chatwoot')
        )

        if (existingWebhook) {
          // 2. Atualizar webhook existente
          const updateResponse = await fetch(
            `${CHATWOOT_URL}/api/v1/accounts/${accountId}/webhooks/${existingWebhook.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'api_access_token': apiToken,
              },
              body: JSON.stringify({
                url: webhookUrl,
                subscriptions: WEBHOOK_EVENTS,
              }),
            }
          )

          if (updateResponse.ok) {
            results.push({
              clinica: clinica.nome,
              status: 'updated',
              details: `Webhook atualizado com ${WEBHOOK_EVENTS.length} eventos`
            })
          } else {
            results.push({
              clinica: clinica.nome,
              status: 'error',
              details: `Erro ao atualizar: ${updateResponse.status}`
            })
          }
        } else {
          // 3. Criar novo webhook
          const createResponse = await fetch(
            `${CHATWOOT_URL}/api/v1/accounts/${accountId}/webhooks`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api_access_token': apiToken,
              },
              body: JSON.stringify({
                url: webhookUrl,
                subscriptions: WEBHOOK_EVENTS,
              }),
            }
          )

          if (createResponse.ok) {
            results.push({
              clinica: clinica.nome,
              status: 'created',
              details: `Webhook criado com ${WEBHOOK_EVENTS.length} eventos`
            })
          } else {
            results.push({
              clinica: clinica.nome,
              status: 'error',
              details: `Erro ao criar: ${createResponse.status}`
            })
          }
        }
      } catch (clinicaError) {
        results.push({
          clinica: clinica.nome,
          status: 'error',
          details: String(clinicaError)
        })
      }
    }

    return NextResponse.json({
      message: `Processadas ${clinicas.length} clínicas`,
      webhookUrl,
      events: WEBHOOK_EVENTS,
      results,
    })

  } catch (error) {
    console.error('Erro ao atualizar webhooks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar webhooks' },
      { status: 500 }
    )
  }
}
