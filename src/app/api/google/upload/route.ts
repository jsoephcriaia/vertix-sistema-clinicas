// src/app/api/google/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocyjkukwgftezyspqjxr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeWprdWt3Z2Z0ZXp5c3BxanhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjQwOTgsImV4cCI6MjA4NDk0MDA5OH0.KXLUgBNFtfkKnmP3ReniJHSUIf0IRdYo-MnvEEPUMSo';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  console.log('=== UPLOAD API INICIADO ===');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clinicaId = formData.get('clinicaId') as string;
    const procedimentoId = formData.get('procedimentoId') as string;
    const tipo = formData.get('tipo') as string;

    console.log('Dados recebidos:', { clinicaId, procedimentoId, tipo, fileName: file?.name, fileSize: file?.size });

    if (!file || !clinicaId) {
      console.log('Erro: Arquivo ou clinicaId faltando');
      return NextResponse.json({ error: 'Arquivo e clinicaId são obrigatórios' }, { status: 400 });
    }

    // Buscar tokens da clínica
    console.log('Buscando tokens da clínica...');
    const { data: clinica, error: clinicaError } = await supabase
      .from('clinicas')
      .select('google_access_token, google_refresh_token, google_drive_folder_id')
      .eq('id', clinicaId)
      .single();

    if (clinicaError) {
      console.log('Erro ao buscar clínica:', clinicaError);
      return NextResponse.json({ error: 'Erro ao buscar clínica' }, { status: 400 });
    }

    if (!clinica?.google_access_token) {
      console.log('Google Drive não conectado');
      return NextResponse.json({ error: 'Google Drive não conectado' }, { status: 400 });
    }

    console.log('Token encontrado, folder_id:', clinica.google_drive_folder_id);

    let folderId = clinica.google_drive_folder_id;

    // Se não tem pasta, criar uma
    if (!folderId) {
      console.log('Criando pasta no Drive...');
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
      console.log('Resposta criação pasta:', folderData);
      
      if (folderData.error) {
        console.log('Erro ao criar pasta:', folderData.error);
        return NextResponse.json({ error: 'Erro ao criar pasta no Drive: ' + folderData.error.message }, { status: 500 });
      }

      if (folderData.id) {
        folderId = folderData.id;
        
        // Salvar ID da pasta na clínica
        await supabase
          .from('clinicas')
          .update({ google_drive_folder_id: folderId })
          .eq('id', clinicaId);
        
        console.log('Pasta criada com ID:', folderId);
      }
    }

    // Converter arquivo para base64
    console.log('Convertendo arquivo para base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    console.log('Arquivo convertido, tamanho base64:', base64Data.length);

    // Upload do arquivo para o Google Drive
    const fileName = `${procedimentoId || 'img'}_${tipo}_${Date.now()}.${file.name.split('.').pop()}`;
    console.log('Nome do arquivo:', fileName);

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

    console.log('Fazendo upload para o Drive...');
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clinica.google_access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const uploadData = await uploadResponse.json();
    console.log('Resposta upload:', uploadData);

    if (uploadData.error) {
      console.log('Erro no upload:', uploadData.error);
      return NextResponse.json({ error: 'Erro no upload: ' + uploadData.error.message }, { status: 500 });
    }

    // Tornar o arquivo público
    console.log('Tornando arquivo público...');
    const permResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
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

    const permData = await permResponse.json();
    console.log('Resposta permissão:', permData);

    // URL pública da imagem
    const imageUrl = `https://drive.google.com/uc?id=${uploadData.id}`;
    console.log('URL da imagem:', imageUrl);

    // Atualizar procedimento com a URL da imagem
    if (procedimentoId) {
      const updateField = tipo === 'antes_depois' ? 'imagem_antes_depois_url' : 'imagem_url';
      
      console.log('Atualizando procedimento:', procedimentoId, updateField);
      const { error: updateError } = await supabase
        .from('procedimentos')
        .update({ [updateField]: imageUrl })
        .eq('id', procedimentoId);

      if (updateError) {
        console.log('Erro ao atualizar procedimento:', updateError);
      }
    }

    console.log('=== UPLOAD CONCLUÍDO COM SUCESSO ===');
    return NextResponse.json({ 
      success: true, 
      fileId: uploadData.id,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('=== ERRO NO UPLOAD ===', error);
    return NextResponse.json({ error: 'Erro interno: ' + (error instanceof Error ? error.message : 'Desconhecido') }, { status: 500 });
  }
}