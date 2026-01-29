'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, HardDrive, CheckCircle, Link2, Loader2 } from 'lucide-react';
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

  // Carregar status das integrações Google ao montar
  useEffect(() => {
    loadGoogleStatus();
  }, []);

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

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Conecte serviços externos para ampliar as funcionalidades</p>
        </div>
      </div>

      {/* Google Status Message */}
      {googleMessage && (
        <div className={`p-4 rounded-lg mb-6 ${
          googleStatus === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
          googleStatus === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
          'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]'
        }`}>
          {googleMessage}
        </div>
      )}

      {/* Lista de Integrações Google */}
      <div className="space-y-4">
        {integracoes.map((integracao) => (
          <div
            key={integracao.id}
            className={`bg-[var(--theme-card)] rounded-xl border ${integracao.conectado ? 'border-[#10b981]' : 'border-[var(--theme-card-border)]'} p-6`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[var(--theme-input)] flex items-center justify-center">
                {integracao.icon}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{integracao.nome}</h3>
                  {integracao.conectado && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary flex items-center gap-1">
                      <CheckCircle size={12} /> Conectado
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--theme-text-muted)]">{integracao.descricao}</p>
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
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
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
              <div className="mt-4 pt-4 border-t border-[var(--theme-card-border)]">
                {integracao.id === 'google-calendar' && (
                  <div className="bg-[var(--theme-input)] rounded-lg p-4">
                    <p className="text-sm text-green-400">
                      ✓ Google Calendar conectado! A IA agora pode verificar disponibilidade e agendar consultas.
                    </p>
                  </div>
                )}

                {integracao.id === 'google-drive' && (
                  <div className="bg-[var(--theme-input)] rounded-lg p-4">
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

    </div>
  );
}