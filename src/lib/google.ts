// src/lib/google.ts

export const googleConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/google/callback`,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.file'
    ]
  };
  
  export function getGoogleAuthUrl(clinicaId: string, tipo: 'calendar' | 'drive' | 'both') {
    const state = JSON.stringify({ clinicaId, tipo });
    
    const params = new URLSearchParams({
      client_id: googleConfig.clientId,
      redirect_uri: googleConfig.redirectUri,
      response_type: 'code',
      scope: googleConfig.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: encodeURIComponent(state)
    });
  
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
  ```
  
  ---
  
  ## Passo 3: Verificar que `.env.local` está no `.gitignore`
  
  Abra o arquivo `.gitignore` e confirme que tem essa linha:
  ```
  .env.local