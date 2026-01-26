import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { clinica_id, conversation_id, status } = await request.json();

    if (!clinica_id || !conversation_id || !status) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Buscar configurações do Chatwoot
    const { data: clinica } = await supabase
      .from('clinicas')
      .select('chatwoot_url, chatwoot_account_id, chatwoot_api_token')
      .eq('id', clinica_id)
      .single();

    if (!clinica?.chatwoot_url || !clinica?.chatwoot_api_token) {
      return NextResponse.json({ error: 'Chatwoot não configurado' }, { status: 400 });
    }

    // Alterar status da conversa no Chatwoot
    const response = await fetch(
      `${clinica.chatwoot_url}/api/v1/accounts/${clinica.chatwoot_account_id}/conversations/${conversation_id}/toggle_status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_access_token': clinica.chatwoot_api_token
        },
        body: JSON.stringify({ status })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro Chatwoot:', error);
      return NextResponse.json({ error: 'Erro ao alterar status' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
