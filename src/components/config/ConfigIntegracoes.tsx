'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, HardDrive, CheckCircle, Link2, ExternalLink, AlertCircle, MessageSquare, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  tipo: 'calendar' | 'drive';
}

export default function ConfigIntegracoes({ onBack }: ConfigIntegracoesProps) {
  // Chatwoot Config
  const [chatwootUrl, setChatwootUrl] = useState('');
  const [chatwootAccountId, setChatwootAccountId] = useState('');
  const [chatwootInboxId, setChatwootInboxId] = useState('');
  const [chatwootApiToken, setChatwootApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [chatwootSaving, setChatwootSaving] = useState(false);
  const [chatwootTesting, setChatwootTesting] = useState(false);
  const [chatwootStatus, setChatwootStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [chatwootMessage, setChatwootMessage] = useState('');

  // Google Status
  const [googleMessage, setGoogleMessage] = useState('');
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [conectando, setConectando] = useState<string | null>(null);

  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    {
      id: 'google-calendar',
      nome: 'Google Agenda',
      descricao: 'Sincronize agendamentos com o Google Calendar',
      icon: <Calendar size={24} className="text-blue-400" />,
      conectado: false,
      tipo: 'calendar',
    },
    {
      id: 'google-drive',
      nome: 'Google Drive',
      descricao: 'Armazene imagens dos procedimentos no Drive',
      icon: <HardDrive size={24} className="text-yellow-400" />,
      conectado: false,
      tipo: 'drive',
    },
  ]);

  // Verificar parâmetros da URL (retorno do OAuth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleResult = urlParams.get('google');
    const message = urlParams.get('message');

    if (googleResult === 'success') {
      setGoogleStatus('success');
      setGoogleMessage('Integração com Google realizada com sucesso!');
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
      // Recarregar status
      loadGoogleStatus();
    } else if (googleResult === 'error') {
      setGoogleStatus('error');
      setGoogleMessage(`Erro na integração: ${message || 'Erro desconhecido'}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Carregar status das integrações Google
  const loadGoogleStatus = async () => {
    const sessao = localStorage.getItem('vertix_sessao');
    const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
    if (!clinicaId) return;

    const { data, error } = await supabase
      .from('clinicas')
      .select('google_calendar_connected, google_drive_connected')
      .eq('id', clinicaId)
      .single();

    if (data) {
      setIntegracoes(prev => prev.map(i => {
        if (i.id === 'google-calendar') {
          return { ...i, conectado: data.google_calendar_connected || false };
        }
        if (i.id === 'google-drive') {
          return { ...i, conectado: data.google_drive_connected || false };
        }
        return i;
      }));
    }
  };

  // Carregar configurações do Chatwoot e Google
  useEffect(() => {
    const loadConfig = async () => {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) return;

      const { data, error } = await supabase
        .from('clinicas')
        .select('chatwoot_url, chatwoot_account_id, chatwoot_inbox_id, chatwoot_api_token, google_calendar_connected, google_drive_connected')
        .eq('id', clinicaId)
        .single();

      if (data) {
        setChatwootUrl(data.chatwoot_url || '');
        setChatwootAccountId(data.chatwoot_account_id || '');
        setChatwootInboxId(data.chatwoot_inbox_id || '');
        setChatwootApiToken(data.chatwoot_api_token || '');

        // Atualizar status Google
        setIntegracoes(prev => prev.map(i => {
          if (i.id === 'google-calendar') {
            return { ...i, conectado: data.google_calendar_connected || false };
          }
          if (i.id === 'google-drive') {
            return { ...i, conectado: data.google_drive_connected || false };
          }
          return i;
        }));
      }
    };

    loadConfig();
  }, []);

  // Salvar configurações do Chatwoot
  const handleSaveChatwoot = async () => {
    setChatwootSaving(true);
    setChatwootStatus('idle');
    setChatwootMessage('');

    try {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) throw new Error('Clínica não encontrada');

      const { error } = await supabase
        .from('clinicas')
        .update({
          chatwoot_url: chatwootUrl,
          chatwoot_account_id: chatwootAccountId,
          chatwoot_inbox_id: chatwootInboxId,
          chatwoot_api_token: chatwootApiToken,
        })
        .eq('id', clinicaId);

      if (error) throw error;

      setChatwootStatus('success');
      setChatwootMessage('Configurações salvas com sucesso!');
    } catch (error) {
      setChatwootStatus('error');
      setChatwootMessage('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setChatwootSaving(false);
    }
  };

  // Testar conexão com Chatwoot
  const handleTestChatwoot = async () => {
    setChatwootTesting(true);
    setChatwootStatus('idle');
    setChatwootMessage('');

    try {
      if (!chatwootUrl || !chatwootAccountId || !chatwootApiToken) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const response = await fetch(`${chatwootUrl}/api/v1/accounts/${chatwootAccountId}/inboxes`, {
        headers: {
          'api_access_token': chatwootApiToken,
        },
      });

      if (!response.ok) {
        throw new Error('Falha na conexão. Verifique as credenciais.');
      }

      const data = await response.json();
      setChatwootStatus('success');
      setChatwootMessage(`Conexão OK! ${data.payload?.length || 0} inbox(es) encontrada(s).`);
    } catch (error) {
      setChatwootStatus('error');
      setChatwootMessage(error instanceof Error ? error.message : 'Erro ao testar conexão');
    } finally {
      setChatwootTesting(false);
    }
  };

  // Conectar com Google
  const handleConnect = async (id: string) => {
    const integracao = integracoes.find(i => i.id === id);
    if (!integracao) return;

    const sessao = localStorage.getItem('vertix_sessao');
    const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
    
    if (!clinicaId) {
      setGoogleStatus('error');
      setGoogleMessage('Erro: Clínica não encontrada');
      return;
    }

    setConectando(id);

    // Redirecionar para API de OAuth
    const tipo = integracao.tipo;
    window.location.href = `/api/google?clinicaId=${clinicaId}&tipo=${tipo}`;
  };

  // Desconectar Google
  const handleDisconnect = async (id: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta integração?')) return;

    const sessao = localStorage.getItem('vertix_sessao');
    const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
    if (!clinicaId) return;

    const integracao = integracoes.find(i => i.id === id);
    if (!integracao) return;

    const updateData: Record<string, unknown> = {};
    
    if (integracao.tipo === 'calendar') {
      updateData.google_calendar_connected = false;
    } else if (integracao.tipo === 'drive') {
      updateData.google_drive_connected = false;
    }

    const { error } = await supabase
      .from('clinicas')
      .update(updateData)
      .eq('id', clinicaId);

    if (!error) {
      setIntegracoes(prev => prev.map(i =>
        i.id === id ? { ...i, conectado: false } : i
      ));
      setGoogleStatus('success');
      setGoogleMessage('Integração desconectada com sucesso');
    }
  };

  const isChatwootConfigured = chatwootUrl && chatwootAccountId && chatwootApiToken;

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

      {/* Chatwoot Integration */}
      <div className={`bg-[#1e293b] rounded-xl border ${isChatwootConfigured ? 'border-[#10b981]' : 'border-[#334155]'} p-6 mb-6`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[#0f172a] flex items-center justify-center">
            <MessageSquare size={24} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Chatwoot</h3>
              {isChatwootConfigured && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-[#10b981]/20 text-[#10b981] flex items-center gap-1">
                  <CheckCircle size={12} /> Configurado
                </span>
              )}
            </div>
            <p className="text-sm text-[#64748b]">Integração com o Chatwoot para gerenciar conversas do WhatsApp</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#64748b] mb-2">URL do Chatwoot *</label>
              <input
                type="text"
                value={chatwootUrl}
                onChange={(e) => setChatwootUrl(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981]"
                placeholder="https://chatwoot.seudominio.com"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Account ID *</label>
              <input
                type="text"
                value={chatwootAccountId}
                onChange={(e) => setChatwootAccountId(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981]"
                placeholder="Ex: 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Inbox ID</label>
              <input
                type="text"
                value={chatwootInboxId}
                onChange={(e) => setChatwootInboxId(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981]"
                placeholder="Ex: 1"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">API Token *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={chatwootApiToken}
                  onChange={(e) => setChatwootApiToken(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-[#10b981]"
                  placeholder="Token de acesso"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {chatwootMessage && (
            <div className={`p-3 rounded-lg text-sm ${
              chatwootStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
              chatwootStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
              'bg-[#334155] text-[#94a3b8]'
            }`}>
              {chatwootMessage}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestChatwoot}
              disabled={chatwootTesting}
              className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {chatwootTesting ? 'Testando...' : 'Testar Conexão'}
            </button>
            <button
              onClick={handleSaveChatwoot}
              disabled={chatwootSaving}
              className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {chatwootSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-400">
              <strong>Dica:</strong> Para encontrar o Account ID e Inbox ID, acesse o Chatwoot e veja a URL.
              Ex: <code className="bg-[#0f172a] px-1 rounded">/app/accounts/2/inbox/1</code> → Account ID: 2, Inbox ID: 1
            </p>
          </div>
        </div>
      </div>

      {/* Google Status Message */}
      {googleMessage && (
        <div className={`p-4 rounded-lg mb-6 ${
          googleStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
          googleStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
          'bg-[#334155] text-[#94a3b8]'
        }`}>
          {googleMessage}
        </div>
      )}

      {/* Lista de Integrações Google */}
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
                  disabled={conectando === integracao.id}
                  className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {conectando === integracao.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Link2 size={18} />
                      Conectar
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Funcionalidades quando conectado */}
            {integracao.conectado && (
              <div className="mt-4 pt-4 border-t border-[#334155]">
                {integracao.id === 'google-calendar' && (
                  <div className="bg-[#0f172a] rounded-lg p-4">
                    <p className="text-sm text-green-400">
                      ✓ Google Calendar conectado! A IA agora pode verificar disponibilidade e agendar consultas.
                    </p>
                  </div>
                )}

                {integracao.id === 'google-drive' && (
                  <div className="bg-[#0f172a] rounded-lg p-4">
                    <p className="text-sm text-green-400">
                      ✓ Google Drive conectado! Você pode fazer upload de imagens dos procedimentos.
                    </p>
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