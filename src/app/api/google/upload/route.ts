// src/app/api/google/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocyjkukwgftezyspqjxr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeWprdWt3Z2Z0ZXp5c3BxanhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQwOTgsImV4cCI6MjA4NDk0MDA5OH0.KXLUgBNFtfkKnmP3ReniJHSUIf0IRdYo-MnvEEPUMSo';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clinicaId = formData.get('clinicaId') as string;
    const procedimentoId = formData.get('procedimentoId') as string;
    const tipo = formData.get('tipo') as string; // 'imagem' ou 'antes_depois'

    if (!file || !clinicaId) {
      return NextResponse.json({ error: 'Arquivo e clinicaId são obrigatórios' }, { status: 400 });
    }

    // Buscar tokens da clínica
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('google_access_token, google_refresh_token, google_drive_folder_id')
      .eq('id', clinicaId)
      .single();

    if (clinicaError || !clinica?.google_access_token) {
      return NextResponse.json({ error: 'Google Drive não conectado' }, { status: 400 });
    }

    let folderId = clinica.google_drive_folder_id;

    // Se não tem pasta, criar uma
    if (!folderId) {
      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clinica.google_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Vertix - Procedimentos',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      const folderData = await folderResponse.json();
      
      if (folderData.id) {
        folderId = folderData.id;
        
        // Salvar ID da pasta na clínica
        await supabase
          .from('clinicas')
          .update({ google_drive_folder_id: folderId })
          .eq('id', clinicaId);
      }
    }

    // Converter arquivo para base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload do arquivo para o Google Drive
    const metadata = {
      name: `${procedimentoId}_${tipo}_${Date.now()}.${file.name.split('.').pop()}`,
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
      buffer.toString('base64') +
      closeDelimiter;

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clinica.google_access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      console.error('Erro upload Google Drive:', uploadData.error);
      return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
    }

    // Tornar o arquivo público
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clinica.google_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    // URL pública da imagem
    const imageUrl = `https://drive.google.com/uc?id=${uploadData.id}`;

    // Atualizar procedimento com a URL da imagem
    if (procedimentoId) {
      const updateField = tipo === 'antes_depois' ? 'imagem_antes_depois_url' : 'imagem_url';
      
      await supabase
        .from('procedimentos')
        .update({ [updateField]: imageUrl })
        .eq('id', procedimentoId);
    }

    return NextResponse.json({ 
      success: true, 
      fileId: uploadData.id,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}