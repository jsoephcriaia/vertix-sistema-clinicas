// src/app/api/google/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocyjkukwgftezyspqjxr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeWprdWt3Z2Z0ZXp5c3BxanhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQwOTgsImV4cCI6MjA4NDk0MDA5OH0.KXLUgBNFtfkKnmP3ReniJHSUIf0IRdYo-MnvEEPUMSo';

const supabase = createClient(supabaseUrl, supabaseKey);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

// Função para renovar o token
async function refreshAccessToken(refreshToken: string, clinicaId: string): Promise<string | null> {
  console.log('Renovando access_token...');
  
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    console.log('Resposta refresh token:', data.access_token ? 'Token obtido' : data.error);

    if (data.access_token) {
      // Atualizar token no banco
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + data.expires_in);

      await supabase
        .from('clinicas')
        .update({
          google_access_token: data.access_token,
          google_token_expiry: expiryDate.toISOString(),
        })
        .eq('id', clinicaId);

      return data.access_token;
    }

    return null;
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return null;
  }
}

// Função para obter token válido
async function getValidAccessToken(clinica: any, clinicaId: string): Promise<string | null> {
  const now = new Date();
  const expiry = clinica.google_token_expiry ? new Date(clinica.google_token_expiry) : null;

  // Se token ainda não expirou, usar ele
  if (expiry && expiry > now) {
    console.log('Token ainda válido');
    return clinica.google_access_token;
  }

  // Se expirou, renovar com refresh_token
  if (clinica.google_refresh_token) {
    console.log('Token expirado, renovando...');
    return await refreshAccessToken(clinica.google_refresh_token, clinicaId);
  }

  console.log('Sem refresh_token disponível');
  return null;
}

export async function POST(request: NextRequest) {
  console.log('=== UPLOAD API INICIADO ===');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clinicaId = formData.get('clinicaId') as string;
    const procedimentoId = formData.get('procedimentoId') as string;
    const tipo = formData.get('tipo') as string;

    console.log('Dados recebidos:', { clinicaId, procedimentoId, tipo, fileName: file?.name });

    if (!file || !clinicaId) {
      return NextResponse.json({ error: 'Arquivo e clinicaId são obrigatórios' }, { status: 400 });
    }

    // Buscar tokens da clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('google_access_token, google_refresh_token, google_token_expiry, google_drive_folder_id')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica) {
      return NextResponse.json({ error: 'Erro ao buscar clínica' }, { status: 400 });
    }

    if (!clinica.google_access_token && !clinica.google_refresh_token) {
      return NextResponse.json({ error: 'Google Drive não conectado' }, { status: 400 });
    }

    // Obter token válido (renova se necessário)
    const accessToken = await getValidAccessToken(clinica, clinicaId);
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Não foi possível obter token válido. Reconecte o Google Drive.' }, { status: 401 });
    }

    console.log('Token válido obtido');

    let folderId = clinica.google_drive_folder_id;

    // Se não tem pasta, criar uma
    if (!folderId) {
      console.log('Criando pasta no Drive...');
      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Vertix - Procedimentos',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      const folderData = await folderResponse.json();
      
      if (folderData.error) {
        console.log('Erro ao criar pasta:', folderData.error);
        return NextResponse.json({ error: 'Erro ao criar pasta no Drive: ' + folderData.error.message }, { status: 500 });
      }

      if (folderData.id) {
        folderId = folderData.id;
        await supabase
          .from('clinicas')
          .update({ google_drive_folder_id: folderId })
          .eq('id', clinicaId);
        console.log('Pasta criada:', folderId);
      }
    }

    // Converter arquivo para base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Upload do arquivo
    const fileName = `${procedimentoId || 'img'}_${tipo}_${Date.now()}.${file.name.split('.').pop()}`;
    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };

    const boundary = 'vertix_upload_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${file.type}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    console.log('Fazendo upload...');
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      console.log('Erro upload:', uploadData.error);
      return NextResponse.json({ error: 'Erro no upload: ' + uploadData.error.message }, { status: 500 });
    }

    // Tornar público
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    const imageUrl = `https://drive.google.com/thumbnail?id=${uploadData.id}&sz=w1000`;

    // Atualizar procedimento
    if (procedimentoId) {
      const updateField = tipo === 'antes_depois' ? 'imagem_antes_depois_url' : 'imagem_url';
      await supabase
        .from('procedimentos')
        .update({ [updateField]: imageUrl })
        .eq('id', procedimentoId);
    }

    console.log('=== UPLOAD CONCLUÍDO ===');
    return NextResponse.json({ 
      success: true, 
      fileId: uploadData.id,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Desconhecido') }, { status: 500 });
  }
}