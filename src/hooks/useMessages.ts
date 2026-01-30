import { useState, useCallback, useRef, useEffect } from 'react';

interface Attachment {
  id: number;
  file_type: string;
  data_url: string;
  thumb_url?: string;
  file_name?: string;
}

interface Mensagem {
  id: number;
  tipo: 'recebida' | 'enviada';
  texto: string;
  hora: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Attachment[];
  replyTo?: { id: number; content: string };
}

interface UseMessagesOptions {
  clinicaId: string;
  conversationId: number | null;
  pollingInterval?: number;
}

export function useMessages({ clinicaId, conversationId, pollingInterval = 5000 }: UseMessagesOptions) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastMessageIdRef = useRef<number>(0);

  const fetchMensagens = useCallback(async (silent = false) => {
    if (!clinicaId || !conversationId) return;

    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/chatwoot/messages?clinica_id=${clinicaId}&conversation_id=${conversationId}`
      );
      if (!res.ok) throw new Error('Erro ao buscar mensagens');

      const data = await res.json();
      const msgs: Mensagem[] = (data.data?.payload || []).map((m: any) => ({
        id: m.id,
        tipo: m.message_type === 'incoming' ? 'recebida' : 'enviada',
        texto: m.content || '',
        hora: new Date(m.created_at * 1000).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: m.status,
        attachments: m.attachments,
        replyTo: m.content_attributes?.in_reply_to
          ? { id: m.content_attributes.in_reply_to, content: '' }
          : undefined,
      }));

      // Ordenar por ID (mais antigo primeiro)
      msgs.sort((a, b) => a.id - b.id);

      // Verificar se há novas mensagens
      const lastId = msgs[msgs.length - 1]?.id || 0;
      const hasNewMessages = lastId > lastMessageIdRef.current;
      lastMessageIdRef.current = lastId;

      setMensagens(msgs);
      setError(null);

      return { messages: msgs, hasNewMessages };
    } catch (err) {
      setError(err as Error);
      return { messages: [], hasNewMessages: false };
    } finally {
      setLoading(false);
    }
  }, [clinicaId, conversationId]);

  // Fetch quando conversa muda
  useEffect(() => {
    if (conversationId) {
      lastMessageIdRef.current = 0;
      fetchMensagens();
    } else {
      setMensagens([]);
    }
  }, [conversationId, fetchMensagens]);

  // Polling
  useEffect(() => {
    if (!conversationId || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchMensagens(true);
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [conversationId, fetchMensagens, pollingInterval]);

  return {
    mensagens,
    loading,
    error,
    refetch: fetchMensagens,
  };
}
