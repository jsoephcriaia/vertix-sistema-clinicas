import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LeadIA {
  id: string;
  nome: string;
  telefone: string;
  procedimento_interesse: string | null;
  etapa: string;
  created_at: string;
  clinica_id: string;
  conversation_id: number | null;
  avatar?: string | null;
}

interface UseLeadIAOptions {
  clinicaId: string;
  conversationId: number | null;
  telefone?: string;
}

export function useLeadIA({ clinicaId, conversationId, telefone }: UseLeadIAOptions) {
  const [lead, setLead] = useState<LeadIA | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLead = useCallback(async () => {
    if (!clinicaId || (!conversationId && !telefone)) {
      setLead(null);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('leads_ia')
        .select('*')
        .eq('clinica_id', clinicaId);

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      } else if (telefone) {
        query = query.eq('telefone', telefone);
      }

      const { data, error: err } = await query.single();

      if (err && err.code !== 'PGRST116') { // PGRST116 = not found
        throw err;
      }

      setLead(data || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [clinicaId, conversationId, telefone]);

  const updateEtapa = useCallback(async (novaEtapa: string) => {
    if (!lead) return false;

    try {
      const { error: err } = await supabase
        .from('leads_ia')
        .update({ etapa: novaEtapa })
        .eq('id', lead.id);

      if (err) throw err;

      setLead(prev => prev ? { ...prev, etapa: novaEtapa } : null);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [lead]);

  const updateNome = useCallback(async (novoNome: string) => {
    if (!lead) return false;

    try {
      const { error: err } = await supabase
        .from('leads_ia')
        .update({ nome: novoNome })
        .eq('id', lead.id);

      if (err) throw err;

      setLead(prev => prev ? { ...prev, nome: novoNome } : null);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [lead]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return {
    lead,
    loading,
    error,
    refetch: fetchLead,
    updateEtapa,
    updateNome,
  };
}
