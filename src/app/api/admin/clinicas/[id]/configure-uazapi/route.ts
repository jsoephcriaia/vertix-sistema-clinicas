import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const UAZAPI_URL = 'https://iaparanegocios.uazapi.com';

/**
 * POST - Configurar Chatwoot no UAZAPI para uma clínica
 * Força a configuração das credenciais do Chatwoot na instância UAZAPI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clinicaId } = await params;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar dados da clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('nome, chatwoot_url, chatwoot_api_token, chatwoot_account_id, chatwoot_inbox_id, uazapi_instance_token')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json(
        { error: 'Clínica não encontrada' },
        { status: 404 }
      );
    }

    if (!clinica.uazapi_instance_token) {
      return NextResponse.json(
        { error: 'UAZAPI não configurado para esta clínica. Conecte o WhatsApp primeiro.' },
        { status: 400 }
      );
    }

    if (!clinica.chatwoot_url || !clinica.chatwoot_api_token || !clinica.chatwoot_account_id || !clinica.chatwoot_inbox_id) {
      return NextResponse.json(
        { error: 'Chatwoot não configurado para esta clínica' },
        { status: 400 }
      );
    }

    // Formato correto para UAZAPI (camelCase, sem prefixo chatwoot_)
    // URL sem barra no final
    const chatwootUrl = clinica.chatwoot_url.replace(/\/$/, '');

    const chatwootConfig = {
      enabled: true,
      url: chatwootUrl,
      token: clinica.chatwoot_api_token,
      accountId: parseInt(clinica.chatwoot_account_id),
      inboxId: parseInt(clinica.chatwoot_inbox_id),
      ignoreGroups: true,
      signMessages: false,
      createNewConversation: false,
    };

    console.log('Configurando Chatwoot no UAZAPI:', JSON.stringify(chatwootConfig, null, 2));

    // Tentar múltiplos métodos HTTP
    const methods = ['PUT', 'POST', 'PATCH'];
    let success = false;
    let lastError = '';
    let responseData = null;

    for (const method of methods) {
      try {
        console.log(`Tentando ${method} /chatwoot/config...`);

        const configResponse = await fetch(`${UAZAPI_URL}/chatwoot/config`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'token': clinica.uazapi_instance_token,
          },
          body: JSON.stringify(chatwootConfig),
        });

        const text = await configResponse.text();
        console.log(`${method} response status:`, configResponse.status);
        console.log(`${method} response body:`, text);

        if (configResponse.ok) {
          success = true;
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = { raw: text };
          }
          console.log(`${method} funcionou!`);
          break;
        } else {
          lastError = `${method}: ${configResponse.status} - ${text}`;
        }
      } catch (e) {
        lastError = `${method}: ${e instanceof Error ? e.message : String(e)}`;
        console.log(`${method} falhou:`, lastError);
      }
    }

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível configurar Chatwoot no UAZAPI',
        lastError,
        configSent: chatwootConfig,
      }, { status: 500 });
    }

    // Verificar se a configuração foi aplicada
    const verifyResponse = await fetch(`${UAZAPI_URL}/chatwoot/config`, {
      headers: { 'token': clinica.uazapi_instance_token },
    });

    const verifyData = await verifyResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Chatwoot configurado no UAZAPI com sucesso',
      configSent: chatwootConfig,
      configResponse: responseData,
      verification: verifyData,
    });

  } catch (error) {
    console.error('Erro ao configurar UAZAPI:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao configurar UAZAPI' },
      { status: 500 }
    );
  }
}
