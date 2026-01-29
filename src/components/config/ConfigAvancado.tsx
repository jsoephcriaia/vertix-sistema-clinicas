'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bot, CheckCircle, PauseCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ConfigAvancadoProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export default function ConfigAvancado({ onBack, onNavigate }: ConfigAvancadoProps) {
  // agente_ia_pausado: false = IA ativa (padrão), true = IA pausada
  const [agenteIaPausado, setAgenteIaPausado] = useState(false);
  const [agenteSaving, setAgenteSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [whatsappConectado, setWhatsappConectado] = useState(false);

  const iaAtiva = !agenteIaPausado;

  useEffect(() => {
    const loadConfig = async () => {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) return;

      const { data } = await supabase
        .from('clinicas')
        .select('agente_ia_pausado, uazapi_instance_token')
        .eq('id', clinicaId)
        .single();

      if (data) {
        setAgenteIaPausado(data.agente_ia_pausado || false);
        setWhatsappConectado(!!data.uazapi_instance_token);
      }
      setLoading(false);
    };

    loadConfig();
  }, []);

  const handleToggleAgente = async () => {
    setAgenteSaving(true);
    setErro(null);
    const novoStatus = !agenteIaPausado;

    try {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) throw new Error('Clínica não encontrada');

      const { error } = await supabase
        .from('clinicas')
        .update({ agente_ia_pausado: novoStatus })
        .eq('id', clinicaId);

      if (error) throw error;

      setAgenteIaPausado(novoStatus);

      // Dispara evento para atualizar outros componentes (ex: Conversas)
      window.dispatchEvent(new CustomEvent('iaStatusChanged'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setErro(`Erro ao alterar: ${msg}`);
      console.error('Erro ao alterar status do agente:', error);
    } finally {
      setAgenteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Avançado</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Configurações avançadas do sistema</p>
        </div>
      </div>

      {/* Aviso WhatsApp não conectado */}
      {!whatsappConectado && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-400 mb-1">WhatsApp não conectado</h3>
              <p className="text-sm text-[var(--theme-text-secondary)] mb-3">
                A Secretária de IA precisa do WhatsApp conectado para funcionar. Conecte o WhatsApp nas configurações para que a IA possa responder automaticamente.
              </p>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('configuracoes-whatsapp')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  <MessageSquare size={16} />
                  Conectar WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agente de IA Toggle */}
      <div className={`bg-[var(--theme-card)] rounded-xl border ${!whatsappConectado ? 'border-[var(--theme-card-border)] opacity-60' : iaAtiva ? 'border-[#10b981]' : 'border-yellow-500/50'} p-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${!whatsappConectado ? 'bg-[var(--theme-bg-tertiary)]' : iaAtiva ? 'bg-primary/20' : 'bg-yellow-500/20'}`}>
            <Bot size={24} className={!whatsappConectado ? 'text-[var(--theme-text-muted)]' : iaAtiva ? 'text-primary' : 'text-yellow-400'} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Secretária de IA</h3>
              {!whatsappConectado ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] flex items-center gap-1">
                  <AlertTriangle size={12} /> Aguardando WhatsApp
                </span>
              ) : iaAtiva ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary flex items-center gap-1">
                  <CheckCircle size={12} /> Ativa
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                  <PauseCircle size={12} /> Pausada
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--theme-text-muted)]">
              {!whatsappConectado
                ? 'Conecte o WhatsApp para ativar a Secretária de IA'
                : iaAtiva
                  ? 'A Secretária de IA está respondendo automaticamente às mensagens do WhatsApp'
                  : 'A Secretária de IA está pausada. Todas as conversas serão atendidas manualmente'}
            </p>
          </div>

          <button
            onClick={handleToggleAgente}
            disabled={agenteSaving || !whatsappConectado}
            className={`relative w-16 h-8 rounded-full transition-colors ${
              !whatsappConectado
                ? 'bg-[var(--theme-bg-tertiary)] cursor-not-allowed'
                : iaAtiva
                  ? 'bg-primary'
                  : 'bg-yellow-500'
            } ${agenteSaving ? 'opacity-50' : ''}`}
            title={!whatsappConectado ? 'Conecte o WhatsApp primeiro' : ''}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
              iaAtiva && whatsappConectado ? 'left-9' : 'left-1'
            }`} />
          </button>
        </div>

        {erro && (
          <div className="mt-4 p-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/30">
            {erro}
          </div>
        )}

        {whatsappConectado && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            iaAtiva
              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
          }`}>
            {iaAtiva ? (
              <p>
                <strong>Secretária Ativa:</strong> As mensagens recebidas serão processadas automaticamente.
                Para assumir uma conversa manualmente, use o botão &quot;Humano&quot; na conversa.
              </p>
            ) : (
              <p>
                <strong>Secretária Pausada:</strong> Todas as conversas serão atendidas manualmente.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
