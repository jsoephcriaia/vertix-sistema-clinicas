'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bot, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ConfigAvancadoProps {
  onBack: () => void;
}

export default function ConfigAvancado({ onBack }: ConfigAvancadoProps) {
  const [agenteIaAtivo, setAgenteIaAtivo] = useState(false);
  const [agenteSaving, setAgenteSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) return;

      const { data } = await supabase
        .from('clinicas')
        .select('agente_ia_ativo')
        .eq('id', clinicaId)
        .single();

      if (data) {
        setAgenteIaAtivo(data.agente_ia_ativo || false);
      }
      setLoading(false);
    };

    loadConfig();
  }, []);

  const handleToggleAgente = async () => {
    setAgenteSaving(true);
    const novoStatus = !agenteIaAtivo;

    try {
      const sessao = localStorage.getItem('vertix_sessao');
      const clinicaId = sessao ? JSON.parse(sessao).clinica?.id : null;
      if (!clinicaId) throw new Error('Clínica não encontrada');

      const { error } = await supabase
        .from('clinicas')
        .update({ agente_ia_ativo: novoStatus })
        .eq('id', clinicaId);

      if (error) throw error;

      setAgenteIaAtivo(novoStatus);
    } catch (error) {
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

      {/* Agente de IA Toggle */}
      <div className={`bg-[var(--theme-card)] rounded-xl border ${agenteIaAtivo ? 'border-[#10b981]' : 'border-[var(--theme-card-border)]'} p-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${agenteIaAtivo ? 'bg-primary/20' : 'bg-[var(--theme-input)]'}`}>
            <Bot size={24} className={agenteIaAtivo ? 'text-primary' : 'text-[var(--theme-text-muted)]'} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Agente de IA (n8n)</h3>
              {agenteIaAtivo && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary flex items-center gap-1">
                  <CheckCircle size={12} /> Ativo
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--theme-text-muted)]">
              {agenteIaAtivo
                ? 'A IA está respondendo automaticamente às mensagens do WhatsApp'
                : 'A IA está desativada. Todas as conversas serão atendidas manualmente'}
            </p>
          </div>

          <button
            onClick={handleToggleAgente}
            disabled={agenteSaving}
            className={`relative w-16 h-8 rounded-full transition-colors ${
              agenteIaAtivo
                ? 'bg-primary'
                : 'bg-[var(--theme-card-border)]'
            } ${agenteSaving ? 'opacity-50' : ''}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
              agenteIaAtivo ? 'left-9' : 'left-1'
            }`} />
          </button>
        </div>

        <div className={`mt-4 p-3 rounded-lg text-sm ${
          agenteIaAtivo
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
        }`}>
          {agenteIaAtivo ? (
            <p>
              <strong>IA Ativa:</strong> O agente n8n processará automaticamente as mensagens recebidas.
              Para pausar temporariamente em uma conversa específica, adicione a etiqueta &quot;humano&quot; no Chatwoot.
            </p>
          ) : (
            <p>
              <strong>IA Desativada:</strong> Nenhuma mensagem será enviada ao agente n8n.
              Você pode atender todas as conversas manualmente sem precisar usar etiquetas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
