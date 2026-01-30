import { useState, useEffect, useCallback } from 'react';

interface Conversa {
  id: number;
  nome: string;
  telefone: string;
  ultima: string;
  tempo: string;
  naoLida: boolean;
  humano: boolean;
  anotacao: string;
  chatwootLabels: string[];
  avatar?: string;
  status: 'open' | 'resolved' | 'pending';
}

interface UseConversasOptions {
  clinicaId: string;
  status?: 'open' | 'resolved' | 'all';
  pollingInterval?: number; // ms, 0 = desabilitado
}

export function useConversas({ clinicaId, status = 'open', pollingInterval = 30000 }: UseConversasOptions) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversas = useCallback(async (silent = false) => {
    if (!clinicaId) return;

    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ clinica_id: clinicaId });
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`/api/chatwoot/conversations?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar conversas');

      const data = await res.json();

      // Transformar payload do Chatwoot para nosso formato
      const conversasFormatadas: Conversa[] = (data.data?.payload || []).map((c: any) => ({
        id: c.id,
        nome: c.meta?.sender?.name || 'Desconhecido',
        telefone: c.meta?.sender?.phone_number || '',
        ultima: c.last_non_activity_message?.content || '',
        tempo: formatTempo(c.last_activity_at),
        naoLida: c.unread_count > 0,
        humano: c.labels?.includes('humano') || false,
        anotacao: '',
        chatwootLabels: c.labels || [],
        avatar: c.meta?.sender?.thumbnail || undefined,
        status: c.status,
      }));

      setConversas(conversasFormatadas);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [clinicaId, status]);

  // Fetch inicial
  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchConversas(true); // silent
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchConversas, pollingInterval]);

  return {
    conversas,
    loading,
    error,
    refetch: fetchConversas,
  };
}

function formatTempo(timestamp: string | number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}
