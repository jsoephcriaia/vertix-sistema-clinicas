'use client';

import { useState } from 'react';
import { ArrowLeft, Smartphone, RefreshCw, CheckCircle, XCircle, Loader2, Unplug } from 'lucide-react';

interface ConfigWhatsAppProps {
  onBack: () => void;
}

// Configurações UAZAPI
const UAZAPI_URL = 'https://iaparanegocios.uazapi.com';
const UAZAPI_ADMIN_TOKEN = 'OH50xrHALaPO3SG69UjJD0npdG5aw7NhmVeky4l4pKa2Qn32F6';

type Status = 'disconnected' | 'loading' | 'qrcode' | 'connected' | 'error';

export default function ConfigWhatsApp({ onBack }: ConfigWhatsAppProps) {
  const [status, setStatus] = useState<Status>('disconnected');
  const [qrcode, setQrcode] = useState<string>('');
  const [instanceToken, setInstanceToken] = useState<string>('');
  const [instanceName, setInstanceName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState(30);

  const connectWhatsApp = async () => {
    setStatus('loading');

    try {
      // 1. Criar instância
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

      setInstanceToken(createData.token);
      setInstanceName(instName);

      // 2. Conectar (gerar QR)
      await fetch(`${UAZAPI_URL}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': createData.token,
        },
        body: JSON.stringify({}),
      });

      // 3. Buscar QR Code
      await fetchQRCode(createData.token);

      // 4. Iniciar polling
      startPolling(createData.token);
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
    
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) count = 30;
    }, 1000);

    const pollingInterval = setInterval(async () => {
      const isConnected = await fetchQRCode(token);
      if (isConnected) {
        clearInterval(pollingInterval);
        clearInterval(countdownInterval);
      }
      setCountdown(30);
    }, 30000);

    // Limpar após 5 minutos
    setTimeout(() => {
      clearInterval(pollingInterval);
      clearInterval(countdownInterval);
    }, 300000);
  };

  const disconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    // Aqui você chamaria a API para desconectar
    setStatus('disconnected');
    setQrcode('');
    setInstanceToken('');
    setPhoneNumber('');
  };

  const resetAndRetry = () => {
    setStatus('disconnected');
    setQrcode('');
    setInstanceToken('');
    setErrorMessage('');
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#334155] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-[#64748b] text-sm">Conecte o WhatsApp da clínica para receber mensagens</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Status: Desconectado */}
        {status === 'disconnected' && (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center border border-[#334155]">
            <div className="w-20 h-20 bg-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-6">
              <Smartphone size={40} className="text-[#64748b]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">WhatsApp não conectado</h2>
            <p className="text-[#64748b] mb-6">
              Conecte seu WhatsApp para que a Secretária de IA possa atender seus clientes automaticamente
            </p>
            <button
              onClick={connectWhatsApp}
              className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Conectar WhatsApp
            </button>
          </div>
        )}

        {/* Status: Carregando */}
        {status === 'loading' && (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center border border-[#334155]">
            <Loader2 size={48} className="animate-spin text-[#10b981] mx-auto mb-6" />
            <h2 className="text-xl font-semibold mb-2">Gerando QR Code...</h2>
            <p className="text-[#64748b]">Aguarde um momento</p>
          </div>
        )}

        {/* Status: QR Code */}
        {status === 'qrcode' && (
          <div className="bg-[#1e293b] rounded-xl p-8 text-center border border-[#334155]">
            <h2 className="text-xl font-semibold mb-4">Escaneie o QR Code</h2>
            
            {qrcode && (
              <img
                src={qrcode}
                alt="QR Code"
                className="mx-auto mb-4 rounded-lg border-4 border-[#334155]"
                style={{ maxWidth: '280px' }}
              />
            )}

            <p className="text-[#64748b] text-sm mb-4">
              Atualizando em <span className="text-[#10b981] font-bold">{countdown}s</span>...
            </p>

            <div className="bg-[#0f172a] rounded-lg p-4 text-left text-sm">
              <p className="font-medium mb-2">Como conectar:</p>
              <ol className="list-decimal list-inside text-[#94a3b8] space-y-1">
                <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                <li>Toque em <strong>Menu (⋮)</strong> ou <strong>Configurações</strong></li>
                <li>Toque em <strong>Dispositivos Conectados</strong></li>
                <li>Toque em <strong>Conectar Dispositivo</strong></li>
                <li>Aponte a câmera para este QR Code</li>
              </ol>
            </div>

            <button
              onClick={resetAndRetry}
              className="mt-4 text-[#64748b] hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Status: Conectado */}
        {status === 'connected' && (
          <div className="bg-[#1e293b] rounded-xl p-8 border border-[#10b981]">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-[#10b981]" />
              </div>
              <h2 className="text-xl font-semibold mb-2">WhatsApp Conectado!</h2>
              <p className="text-[#10b981]">Seu WhatsApp está pronto para uso</p>
            </div>

            <div className="bg-[#0f172a] rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center">
                  <Smartphone size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-medium">{phoneNumber || 'Número conectado'}</p>
                  <p className="text-sm text-[#64748b]">Instância: {instanceName}</p>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1 rounded-full text-xs bg-[#10b981]/20 text-[#10b981]">
                    ● Online
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0f172a] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-[#10b981]">24</p>
                <p className="text-xs text-[#64748b]">Mensagens hoje</p>
              </div>
              <div className="bg-[#0f172a] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-[#64748b]">Este mês</p>
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
          <div className="bg-[#1e293b] rounded-xl p-8 text-center border border-red-500">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Erro na conexão</h2>
            <p className="text-red-400 mb-6">{errorMessage}</p>
            <button
              onClick={resetAndRetry}
              className="bg-[#334155] hover:bg-[#475569] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
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