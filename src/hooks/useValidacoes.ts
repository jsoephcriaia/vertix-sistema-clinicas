import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Validacoes {
  whatsappConectado: boolean | null;
  iaAtiva: boolean | null;
  googleConectado: boolean;
  horariosDefinidos: boolean;
  profissionaisComHorario: boolean;
  procedimentosDefinidos: boolean;
}

interface UseValidacoesOptions {
  clinicaId: string;
  pollingInterval?: number;
}

export function useValidacoes({ clinicaId, pollingInterval = 60000 }: UseValidacoesOptions) {
  const [validacoes, setValidacoes] = useState<Validacoes>({
    whatsappConectado: null,
    iaAtiva: null,
    googleConectado: false,
    horariosDefinidos: false,
    profissionaisComHorario: false,
    procedimentosDefinidos: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchValidacoes = useCallback(async (silent = false) => {
    if (!clinicaId) return;

    if (!silent) setLoading(true);
    try {
      // Buscar dados da clínica
      const { data: clinicaData } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', clinicaId)
        .single();

      if (!clinicaData) return;

      // Verificar WhatsApp
      let whatsappStatus: boolean | null = null;
      if (clinicaData.uazapi_instance_id && clinicaData.uazapi_token) {
        try {
          const res = await fetch('/api/uazapi/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinica_id: clinicaId }),
          });
          const data = await res.json();
          whatsappStatus = data.connected === true;
        } catch {
          whatsappStatus = false;
        }
      }

      // Verificar horários
      const { count: horariosCount } = await supabase
        .from('horarios')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId);

      // Verificar profissionais com horário
      const { count: profCount } = await supabase
        .from('horarios_profissional')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId);

      // Verificar procedimentos
      const { count: procCount } = await supabase
        .from('procedimentos')
        .select('*', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId);

      setValidacoes({
        whatsappConectado: whatsappStatus,
        iaAtiva: clinicaData.ia_ativa === true,
        googleConectado: !!clinicaData.google_tokens,
        horariosDefinidos: (horariosCount || 0) > 0,
        profissionaisComHorario: (profCount || 0) > 0,
        procedimentosDefinidos: (procCount || 0) > 0,
      });
    } catch (error) {
      console.error('Erro ao buscar validações:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchValidacoes();
  }, [fetchValidacoes]);

  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchValidacoes(true);
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchValidacoes, pollingInterval]);

  return {
    ...validacoes,
    loading,
    refetch: fetchValidacoes,
  };
}
