'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, RefreshCw, CheckCircle, XCircle, Loader2, Unplug } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ConfigWhatsAppProps {
  onBack: () => void;
}

// Configurações UAZAPI
const UAZAPI_URL = 'https://iaparanegocios.uazapi.com';
const UAZAPI_ADMIN_TOKEN = 'OH50xrHALaPO3SG69UjJD0npdG5aw7NhmVeky4l4pKa2Qn32F6';

type Status = 'loading' | 'disconnected' | 'generating' | 'qrcode' | 'connected' | 'error';

export default function ConfigWhatsApp({ onBack }: ConfigWhatsAppProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [qrcode, setQrcode] = useState<string>('');
  const [instanceToken, setInstanceToken] = useState<string>('');
  const [instanceName, setInstanceName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(30);
  const [clinicaId, setClinicaId] = useState<string>('');
  const [pollingInterval, setPollingIntervalState] = useState<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownIntervalState] = useState<NodeJS.Timeout | null>(null);

  // Carregar configuração da instância ao montar
  useEffect(() => {
    loadInstanceConfig();
    return () => {
      // Limpar intervalos ao desmontar
      if (pollingInterval) clearInterval(pollingInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const loadInstanceConfig = async () => {
    try {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinica = sessao ? JSON.parse(sessao).clinica : null;
      
      if (!clinica?.id) {
        setStatus('error');
        setErrorMessage('Clínica não encontrada');
        return;
      }

      setClinicaId(clinica.id);

      // Buscar dados da instância no banco
      const { data, error } = await supabase
        .from('clinicas')
        .select('uazapi_instance_token, uazapi_instance_name')
        .eq('id', clinica.id)
        .single();

      if (error) throw error;

      if (data?.uazapi_instance_token) {
        setInstanceToken(data.uazapi_instance_token);
        setInstanceName(data.uazapi_instance_name || '');
        
        // Verificar status atual da instância
        await checkInstanceStatus(data.uazapi_instance_token);
      } else {
        // Não tem instância configurada
        setStatus('disconnected');
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
      setStatus('error');
      setErrorMessage('Erro ao carregar configurações');
    }
  };

  const checkInstanceStatus = async (token: string) => {
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/status`, {
        method: 'GET',
        headers: {
          'token': token,
        },
      });

      // Se retornou 401, a instância foi deletada no UAZAPI
      if (response.status === 401) {
        console.log('Instância não existe mais no UAZAPI, limpando token...');
        await clearInstanceToken();
        return false;
      }

      const data = await response.json();

      if (data.instance?.status === 'connected') {
        setStatus('connected');
        setPhoneNumber(data.instance?.phone || '');

        // Garantir que o webhook está configurado (auto-fix)
        await ensureWebhookConfigured(token);

        return true;
      } else {
        setStatus('disconnected');
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setStatus('disconnected');
      return false;
    }
  };

  // Garante que o webhook está configurado corretamente
  const ensureWebhookConfigured = async (token: string) => {
    try {
      const webhookUrl = `${window.location.origin}/api/webhook/uazapi`;

      // Verificar webhook atual
      const checkResponse = await fetch(`${UAZAPI_URL}/webhook/get`, {
        method: 'GET',
        headers: { 'token': token },
      });

      if (checkResponse.ok) {
        const webhookData = await checkResponse.json();
        const currentUrl = webhookData.webhook?.url || webhookData.webhookUrl || '';

        // Se já está configurado corretamente, não faz nada
        if (currentUrl === webhookUrl) {
          console.log('Webhook já está configurado corretamente');
          return;
        }
      }

      // Configurar webhook
      console.log('Configurando webhook automaticamente:', webhookUrl);
      await fetch(`${UAZAPI_URL}/webhook/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          webhookEnabled: true,
        }),
      });
      console.log('Webhook configurado com sucesso');
    } catch (error) {
      console.error('Erro ao verificar/configurar webhook:', error);
    }
  };

  // Limpa o token da instância quando ela foi deletada externamente
  const clearInstanceToken = async () => {
    try {
      if (clinicaId) {
        await supabase
          .from('clinicas')
          .update({
            uazapi_instance_token: null,
            uazapi_instance_name: null,
          })
          .eq('id', clinicaId);
      }
      setInstanceToken('');
      setInstanceName('');
      setStatus('disconnected');
    } catch (error) {
      console.error('Erro ao limpar token:', error);
    }
  };

  const connectWhatsApp = async () => {
    setStatus('generating');

    try {
      let token = instanceToken;

      // Se não tem instância, criar uma nova
      if (!token) {
        const instName = 'vertix-' + Date.now();
        const createResponse = await fetch(`${UAZAPI_URL}/instance/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'admintoken': UAZAPI_ADMIN_TOKEN,
          },
          body: JSON.stringify({ name: instName }),
        });

        const createData = await createResponse.json();

        if (!createData.token) {
          throw new Error('Erro ao criar instância');
        }

        token = createData.token;
        setInstanceToken(token);
        setInstanceName(instName);

        // Salvar no banco
        await supabase
          .from('clinicas')
          .update({
            uazapi_instance_token: token,
            uazapi_instance_name: instName,
          })
          .eq('id', clinicaId);
      }

      // Configurar webhook do UAZAPI para receber mensagens
      const webhookUrl = `${window.location.origin}/api/webhook/uazapi`;
      console.log('Configurando webhook UAZAPI:', webhookUrl);

      try {
        await fetch(`${UAZAPI_URL}/webhook/set`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': token,
          },
          body: JSON.stringify({
            webhookUrl: webhookUrl,
            webhookEnabled: true,
          }),
        });
        console.log('Webhook configurado com sucesso');
      } catch (webhookError) {
        console.error('Erro ao configurar webhook:', webhookError);
        // Continua mesmo se falhar - pode ser configurado manualmente
      }

      // Gerar QR Code (conectar)
      const connectResponse = await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify({}),
      });

      // Se retornou 401, a instância foi deletada - limpar e tentar criar nova
      if (connectResponse.status === 401) {
        console.log('Instância inválida ao conectar, criando nova...');
        await clearInstanceToken();
        // Recursivamente tentar conectar (agora vai criar nova instância)
        return connectWhatsApp();
      }

      // Aguardar um pouco para o QR Code ser gerado
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Buscar QR Code
      await fetchQRCode(token);

      // Iniciar polling
      startPolling(token);
    } catch (error) {
      console.error('Erro:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      setStatus('error');
    }
  };

  const fetchQRCode = async (token: string) => {
    try {
      const response = await fetch(`${UAZAPI_URL}/instance/status`, {
        method: 'GET',
        headers: {
          'token': token,
        },
      });

      const data = await response.json();

      if (data.instance?.status === 'connected') {
        setStatus('connected');
        setPhoneNumber(data.instance?.phone || '');
        stopPolling();
        return true;
      }

      if (data.instance?.qrcode) {
        setQrcode(data.instance.qrcode);
        setStatus('qrcode');
      }

      return false;
    } catch (error) {
      console.error('Erro ao buscar QR:', error);
      return false;
    }
  };

  const startPolling = (token: string) => {
    let count = 30;
    
    const countInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) count = 30;
    }, 1000);
    setCountdownIntervalState(countInterval);

    const pollInterval = setInterval(async () => {
      const isConnected = await fetchQRCode(token);
      if (isConnected) {
        stopPolling();
      }
      setCountdown(30);
    }, 30000);
    setPollingIntervalState(pollInterval);

    // Limpar após 5 minutos
    setTimeout(() => {
      stopPolling();
    }, 300000);
  };

  const stopPolling = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    setPollingIntervalState(null);
    setCountdownIntervalState(null);
  };

  const disconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    try {
      if (instanceToken) {
        await fetch(`${UAZAPI_URL}/instance/logout`, {
          method: 'POST',
          headers: {
            'token': instanceToken,
          },
        });
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }

    setStatus('disconnected');
    setQrcode('');
    setPhoneNumber('');
  };

  const resetAndRetry = () => {
    stopPolling();
    setStatus('disconnected');
    setQrcode('');
    setErrorMessage('');
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Conecte o WhatsApp da clínica para receber mensagens</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Status: Carregando inicial */}
        {status === 'loading' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 text-center border border-[var(--theme-card-border)]">
            <Loader2 size={48} className="animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Verificando conexão...</h2>
            <p className="text-[var(--theme-text-muted)]">Aguarde um momento</p>
          </div>
        )}

        {/* Status: Desconectado */}
        {status === 'disconnected' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 text-center border border-[var(--theme-card-border)]">
            <div className="w-20 h-20 bg-[var(--theme-input)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone size={40} className="text-[var(--theme-text-muted)]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">WhatsApp não conectado</h2>
            <p className="text-[var(--theme-text-muted)] mb-6">
              Conecte seu WhatsApp para que a Secretária de IA possa atender seus clientes automaticamente
            </p>
            {instanceToken && (
              <p className="text-xs text-[var(--theme-text-muted)] mb-4">
                Instância: <span className="text-primary">{instanceName}</span>
              </p>
            )}
            <button
              onClick={connectWhatsApp}
              className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {instanceToken ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
            </button>
          </div>
        )}

        {/* Status: Gerando QR */}
        {status === 'generating' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 text-center border border-[var(--theme-card-border)]">
            <Loader2 size={48} className="animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Gerando QR Code...</h2>
            <p className="text-[var(--theme-text-muted)]">Aguarde um momento</p>
          </div>
        )}

        {/* Status: QR Code */}
        {status === 'qrcode' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 text-center border border-[var(--theme-card-border)]">
            <h2 className="text-xl font-semibold mb-4">Escaneie o QR Code</h2>
            
            {qrcode && (
              <img
                src={qrcode}
                alt="QR Code"
                className="mx-auto mb-4 rounded-lg border-4 border-[var(--theme-card-border)]"
                style={{ maxWidth: '280px' }}
              />
            )}

            <p className="text-[var(--theme-text-muted)] text-sm mb-4">
              Atualizando em <span className="text-primary font-bold">{countdown}s</span>...
            </p>

            <div className="bg-[var(--theme-input)] rounded-lg p-4 text-left text-sm">
              <p className="font-medium mb-2">Como conectar:</p>
              <ol className="list-decimal list-inside text-[var(--theme-text-secondary)] space-y-1">
                <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                <li>Toque em <strong>Menu (⋮)</strong> ou <strong>Configurações</strong></li>
                <li>Toque em <strong>Dispositivos Conectados</strong></li>
                <li>Toque em <strong>Conectar Dispositivo</strong></li>
                <li>Aponte a câmera para este QR Code</li>
              </ol>
            </div>

            <button
              onClick={resetAndRetry}
              className="mt-4 text-[var(--theme-text-muted)] hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Status: Conectado */}
        {status === 'connected' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 border border-[#10b981]">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">WhatsApp Conectado!</h2>
              <p className="text-primary">Seu WhatsApp está pronto para uso</p>
            </div>

            <div className="bg-[var(--theme-input)] rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Smartphone size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-medium">{phoneNumber || 'Número conectado'}</p>
                  <p className="text-sm text-[var(--theme-text-muted)]">Instância: {instanceName}</p>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary">
                    ● Online
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={disconnect}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
            >
              <Unplug size={18} />
              Desconectar WhatsApp
            </button>
          </div>
        )}

        {/* Status: Erro */}
        {status === 'error' && (
          <div className="bg-[var(--theme-card)] rounded-xl p-8 text-center border border-red-500">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Erro na conexão</h2>
            <p className="text-red-400 mb-6">{errorMessage}</p>
            <button
              onClick={resetAndRetry}
              className="bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} />
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}