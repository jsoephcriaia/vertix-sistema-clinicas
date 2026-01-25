'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, HardDrive, CheckCircle, Link2, ExternalLink, AlertCircle } from 'lucide-react';

interface ConfigIntegracoesProps {
  onBack: () => void;
}

interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  icon: React.ReactNode;
  conectado: boolean;
  conta?: string;
}

export default function ConfigIntegracoes({ onBack }: ConfigIntegracoesProps) {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: 'google-calendar',
      nome: 'Google Agenda',
      descricao: 'Sincronize agendamentos com o Google Calendar',
      icon: <Calendar size={24} className="text-blue-400" />,
      conectado: false,
    },
    {
      id: 'google-drive',
      nome: 'Google Drive',
      descricao: 'Armazene imagens dos procedimentos no Drive',
      icon: <HardDrive size={24} className="text-yellow-400" />,
      conectado: false,
    },
  ]);

  const handleConnect = async (id: string) => {
    // Simulação de conexão OAuth
    // Na implementação real, isso abriria o fluxo OAuth do Google
    
    const clientId = 'SEU_CLIENT_ID_GOOGLE'; // Você precisará criar no Google Cloud Console
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/google/callback');
    
    let scope = '';
    if (id === 'google-calendar') {
      scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
    } else if (id === 'google-drive') {
      scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
    }

    // Por enquanto, vamos simular a conexão
    const confirmed = confirm(
      `Para conectar com ${id === 'google-calendar' ? 'Google Agenda' : 'Google Drive'}, você será redirecionado para fazer login na sua conta Google.\n\nDeseja continuar?`
    );

    if (confirmed) {
      // Simula conexão bem-sucedida
      setIntegracoes(prev => prev.map(i => 
        i.id === id 
          ? { ...i, conectado: true, conta: 'clinica@gmail.com' }
          : i
      ));
    }

    // Na implementação real:
    // window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
  };

  const handleDisconnect = (id: string) => {
    if (confirm('Tem certeza que deseja desconectar esta integração?')) {
      setIntegracoes(prev => prev.map(i => 
        i.id === id 
          ? { ...i, conectado: false, conta: undefined }
          : i
      ));
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#334155] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-[#64748b] text-sm">Conecte serviços externos para ampliar as funcionalidades</p>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Configuração necessária</p>
            <p className="text-sm text-[#94a3b8]">
              Para ativar as integrações com Google, é necessário configurar as credenciais OAuth no Google Cloud Console. 
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">
                Saiba mais <ExternalLink size={12} className="inline" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Integrações */}
      <div className="space-y-4">
        {integracoes.map((integracao) => (
          <div
            key={integracao.id}
            className={`bg-[#1e293b] rounded-xl border ${integracao.conectado ? 'border-[#10b981]' : 'border-[#334155]'} p-6`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0f172a] flex items-center justify-center">
                {integracao.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{integracao.nome}</h3>
                  {integracao.conectado && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[#10b981]/20 text-[#10b981] flex items-center gap-1">
                      <CheckCircle size={12} /> Conectado
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#64748b]">{integracao.descricao}</p>
                {integracao.conectado && integracao.conta && (
                  <p className="text-sm text-[#10b981] mt-1">Conta: {integracao.conta}</p>
                )}
              </div>

              {integracao.conectado ? (
                <button
                  onClick={() => handleDisconnect(integracao.id)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(integracao.id)}
                  className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Link2 size={18} />
                  Conectar
                </button>
              )}
            </div>

            {/* Funcionalidades quando conectado */}
            {integracao.conectado && (
              <div className="mt-4 pt-4 border-t border-[#334155]">
                {integracao.id === 'google-calendar' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0f172a] rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Calendário sincronizado</p>
                      <select className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#10b981]">
                        <option>Agenda Principal</option>
                        <option>Clínica - Atendimentos</option>
                        <option>Criar novo calendário...</option>
                      </select>
                    </div>
                    <div className="bg-[#0f172a] rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Opções</p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-[#334155] bg-[#0f172a] text-[#10b981]" />
                        Criar eventos automaticamente ao agendar
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-[#334155] bg-[#0f172a] text-[#10b981]" />
                        Enviar lembretes por email
                      </label>
                    </div>
                  </div>
                )}

                {integracao.id === 'google-drive' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0f172a] rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Pasta de armazenamento</p>
                      <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-[#64748b]" />
                        <span className="text-sm text-[#94a3b8]">/Vertix/Procedimentos</span>
                      </div>
                    </div>
                    <div className="bg-[#0f172a] rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">Espaço utilizado</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#334155] rounded-full overflow-hidden">
                          <div className="h-full w-1/4 bg-[#10b981] rounded-full"></div>
                        </div>
                        <span className="text-sm text-[#64748b]">2.5 GB / 15 GB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Outras integrações futuras */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-[#64748b]">Em breve</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1e293b]/50 rounded-xl border border-[#334155]/50 p-6 opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0f172a] flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <h3 className="font-semibold">Google Sheets</h3>
                <p className="text-sm text-[#64748b]">Exporte relatórios para planilhas</p>
              </div>
            </div>
          </div>
          <div className="bg-[#1e293b]/50 rounded-xl border border-[#334155]/50 p-6 opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0f172a] flex items-center justify-center">
                <span className="text-2xl">💳</span>
              </div>
              <div>
                <h3 className="font-semibold">Asaas</h3>
                <p className="text-sm text-[#64748b]">Cobranças e pagamentos automáticos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}