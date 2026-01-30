'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';
import { useConversas } from '@/hooks/useConversas';
import { useMessages } from '@/hooks/useMessages';
import { useLeadIA } from '@/hooks/useLeadIA';
import { useValidacoes } from '@/hooks/useValidacoes';
import { ConversasList } from './Conversas/ConversasList';
import { ConversaHeader } from './Conversas/ConversaHeader';
import { ChatMessages } from './Conversas/ChatMessages';
import { MessageInput } from './Conversas/MessageInput';
import PainelInteresse from './PainelInteresse';
import PainelAgendamentos from './PainelAgendamentos';

interface ConversasProps {
  conversaInicial?: { telefone: string; nome: string } | null;
  onConversaIniciada?: () => void;
}

export default function Conversas({ conversaInicial, onConversaIniciada }: ConversasProps) {
  const { clinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  // Estado local mínimo
  const [conversaSelecionada, setConversaSelecionada] = useState<any>(null);
  const [showInteresse, setShowInteresse] = useState(false);
  const [showAgendamentos, setShowAgendamentos] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Hooks customizados
  const { conversas, loading: loadingConversas, refetch: refetchConversas } = useConversas({
    clinicaId: CLINICA_ID,
  });

  const { mensagens, loading: loadingMensagens, refetch: refetchMensagens } = useMessages({
    clinicaId: CLINICA_ID,
    conversationId: conversaSelecionada?.id || null,
  });

  const { lead, updateEtapa, updateNome } = useLeadIA({
    clinicaId: CLINICA_ID,
    conversationId: conversaSelecionada?.id || null,
    telefone: conversaSelecionada?.telefone,
  });

  const validacoes = useValidacoes({ clinicaId: CLINICA_ID });

  // Handlers
  const handleSelectConversa = useCallback((conversa: any) => {
    setConversaSelecionada(conversa);
    setReplyingTo(null);
  }, []);

  const handleEnviarMensagem = useCallback(async (texto: string, arquivos?: File[], audio?: Blob) => {
    if (!conversaSelecionada) return;

    try {
      // Implementar envio via API
      const formData = new FormData();
      formData.append('clinica_id', CLINICA_ID);
      formData.append('conversation_id', conversaSelecionada.id.toString());
      formData.append('content', texto);

      if (arquivos) {
        arquivos.forEach(f => formData.append('files', f));
      }
      if (audio) {
        formData.append('audio', audio, 'audio.webm');
      }

      const res = await fetch('/api/chatwoot/messages', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Erro ao enviar');

      await refetchMensagens();
      setReplyingTo(null);
    } catch (error) {
      showToast('Erro ao enviar mensagem', 'error');
    }
  }, [CLINICA_ID, conversaSelecionada, refetchMensagens, showToast]);

  const handleToggleHumano = useCallback(async () => {
    if (!conversaSelecionada) return;
    // Implementar toggle de label "humano" via Chatwoot API
  }, [conversaSelecionada]);

  // Alertas de validação
  const renderValidationAlerts = () => {
    const alerts = [];

    if (validacoes.whatsappConectado === false) {
      alerts.push(
        <div key="whatsapp" className="bg-red-500/20 text-red-400 px-4 py-2 text-sm">
          WhatsApp desconectado. Conecte em Configurações.
        </div>
      );
    }

    return alerts.length > 0 ? <div className="space-y-1">{alerts}</div> : null;
  };

  if (!CLINICA_ID) {
    return <div className="p-8 text-center text-[var(--theme-text-muted)]">Carregando...</div>;
  }

  return (
    <div className="h-full flex">
      {/* Lista de conversas */}
      <ConversasList
        conversas={conversas}
        loading={loadingConversas}
        conversaSelecionada={conversaSelecionada}
        onSelectConversa={handleSelectConversa}
        onNovaConversa={() => {/* TODO: modal nova conversa */}}
        onRefresh={() => refetchConversas()}
      />

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {conversaSelecionada ? (
          <>
            {renderValidationAlerts()}

            <ConversaHeader
              nome={lead?.nome || conversaSelecionada.nome}
              telefone={conversaSelecionada.telefone}
              avatar={conversaSelecionada.avatar}
              etapa={lead?.etapa || 'novo'}
              humano={conversaSelecionada.humano}
              onUpdateNome={updateNome}
              onUpdateEtapa={updateEtapa}
              onToggleHumano={handleToggleHumano}
              onOpenInteresse={() => setShowInteresse(true)}
              onOpenAgendamentos={() => setShowAgendamentos(true)}
              onOpenAnotacoes={() => {/* TODO */}}
            />

            <ChatMessages
              mensagens={mensagens}
              loading={loadingMensagens}
              onReply={setReplyingTo}
            />

            <MessageInput
              onSend={handleEnviarMensagem}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              disabled={!validacoes.whatsappConectado}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--theme-text-muted)]">
            Selecione uma conversa
          </div>
        )}
      </div>

      {/* Painéis laterais */}
      <PainelInteresse
        isOpen={showInteresse && !!lead}
        leadId={lead?.id || null}
        leadNome={lead?.nome || conversaSelecionada?.nome || ''}
        clinicaId={CLINICA_ID}
        onClose={() => setShowInteresse(false)}
      />

      <PainelAgendamentos
        isOpen={showAgendamentos && !!lead}
        leadId={lead?.id || null}
        leadNome={lead?.nome || conversaSelecionada?.nome || ''}
        leadTelefone={conversaSelecionada?.telefone}
        clinicaId={CLINICA_ID}
        onClose={() => setShowAgendamentos(false)}
      />
    </div>
  );
}
