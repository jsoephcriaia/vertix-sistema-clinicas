'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Calendar, Loader2, Check, Clock, AlertCircle, RefreshCw, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/Alert';

interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  retorno_dias: number | null;
}

interface Profissional {
  id: string;
  nome: string;
  avatar?: string | null;
}

interface Slot {
  inicio: string;
  fim: string;
}

interface Agendamento {
  id: string;
  data_hora: string;
  valor: number;
  status: string;
  tipo: string;
  criado_por: string;
  observacoes: string | null;
  google_calendar_event_id: string | null;
  procedimento_id: string | null;
  profissional_id: string | null;
  procedimento?: Procedimento;
  profissional?: Profissional;
}

interface PainelAgendamentosProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  clienteId?: string | null;
  leadNome: string;
  leadTelefone?: string;
  clinicaId: string;
  onAgendamentoCriado?: () => void;
  onStatusAlterado?: (novaEtapa: string) => void;
}

export default function PainelAgendamentos({
  isOpen,
  onClose,
  leadId,
  clienteId,
  leadNome,
  leadTelefone,
  clinicaId,
  onAgendamentoCriado,
  onStatusAlterado,
}: PainelAgendamentosProps) {
  const { showToast, showConfirm } = useAlert();

  // Procedimentos disponíveis
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);

  // Profissionais disponíveis
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionaisDisponiveis, setProfissionaisDisponiveis] = useState<Profissional[]>([]);

  // Agendamentos
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  // Novo agendamento
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [procedimentoAgendamento, setProcedimentoAgendamento] = useState('');
  const [profissionalAgendamento, setProfissionalAgendamento] = useState('');
  const [valorAgendamento, setValorAgendamento] = useState('');
  const [observacoesAgendamento, setObservacoesAgendamento] = useState('');
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // Slots disponíveis
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [usarSlots, setUsarSlots] = useState(true);

  // Carregar dados quando abrir
  useEffect(() => {
    if (isOpen && clinicaId && (leadId || clienteId)) {
      fetchProcedimentos();
      fetchProfissionais();
      fetchAgendamentos();
    }
  }, [isOpen, leadId, clienteId, clinicaId]);

  // Atualizar valor e profissionais quando selecionar procedimento
  useEffect(() => {
    if (procedimentoAgendamento) {
      const proc = procedimentos.find(p => p.id === procedimentoAgendamento);
      if (proc) setValorAgendamento(proc.preco.toString());
      fetchProfissionaisPorProcedimento(procedimentoAgendamento);
    } else {
      setProfissionaisDisponiveis(profissionais);
      setProfissionalAgendamento('');
    }
  }, [procedimentoAgendamento, procedimentos, profissionais]);

  // Buscar slots quando mudar data ou profissional
  useEffect(() => {
    if (dataAgendamento && profissionalAgendamento && usarSlots) {
      fetchSlotsDisponiveis();
    } else {
      setSlotsDisponiveis([]);
    }
  }, [dataAgendamento, profissionalAgendamento, procedimentoAgendamento, usarSlots]);

  const fetchProcedimentos = async () => {
    try {
      const { data } = await supabase
        .from('procedimentos')
        .select('id, nome, preco, duracao_minutos, retorno_dias')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)
        .order('nome');

      if (data) setProcedimentos(data);
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    }
  };

  const fetchProfissionais = async () => {
    try {
      const { data } = await supabase
        .from('equipe')
        .select('id, nome, avatar')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)
        .order('nome');

      if (data) {
        setProfissionais(data);
        setProfissionaisDisponiveis(data);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    }
  };

  const fetchProfissionaisPorProcedimento = async (procedimentoId: string) => {
    try {
      // Buscar profissionais que fazem este procedimento
      const { data: relacoes } = await supabase
        .from('profissional_procedimentos')
        .select('profissional_id')
        .eq('procedimento_id', procedimentoId);

      if (relacoes && relacoes.length > 0) {
        const profIds = relacoes.map(r => r.profissional_id);
        const filtrados = profissionais.filter(p => profIds.includes(p.id));
        setProfissionaisDisponiveis(filtrados);

        // Se o profissional atual não faz este procedimento, limpar seleção
        if (!profIds.includes(profissionalAgendamento)) {
          setProfissionalAgendamento('');
        }
      } else {
        // Se não há relações, mostrar todos os profissionais
        setProfissionaisDisponiveis(profissionais);
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais do procedimento:', error);
      setProfissionaisDisponiveis(profissionais);
    }
  };

  const fetchSlotsDisponiveis = async () => {
    if (!dataAgendamento || !profissionalAgendamento) return;

    setLoadingSlots(true);
    try {
      const proc = procedimentos.find(p => p.id === procedimentoAgendamento);
      const duracao = proc?.duracao_minutos || 60;

      const response = await fetch(
        `/api/disponibilidade?profissionalId=${profissionalAgendamento}&clinicaId=${clinicaId}&data=${dataAgendamento}&duracaoMinutos=${duracao}`
      );
      const result = await response.json();

      if (result.slots) {
        setSlotsDisponiveis(result.slots);
      } else {
        setSlotsDisponiveis([]);
      }
    } catch (error) {
      console.error('Erro ao buscar slots:', error);
      setSlotsDisponiveis([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const fetchAgendamentos = async () => {
    setLoadingAgendamentos(true);
    try {
      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          valor,
          status,
          tipo,
          criado_por,
          observacoes,
          google_calendar_event_id,
          procedimento_id,
          profissional_id
        `)
        .eq('clinica_id', clinicaId)
        .order('data_hora', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      } else if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (data && !error) {
        // Buscar procedimentos para mapear
        const procedimentoIds = [...new Set(data.filter(a => a.procedimento_id).map(a => a.procedimento_id))];
        const profissionalIds = [...new Set(data.filter(a => a.profissional_id).map(a => a.profissional_id))];

        let procedimentosMap: Record<string, Procedimento> = {};
        let profissionaisMap: Record<string, Profissional> = {};

        if (procedimentoIds.length > 0) {
          const { data: procsData } = await supabase
            .from('procedimentos')
            .select('id, nome, preco, duracao_minutos, retorno_dias')
            .in('id', procedimentoIds);

          if (procsData) {
            procsData.forEach(p => { procedimentosMap[p.id] = p; });
          }
        }

        if (profissionalIds.length > 0) {
          const { data: profsData } = await supabase
            .from('equipe')
            .select('id, nome, avatar')
            .in('id', profissionalIds as string[]);

          if (profsData) {
            profsData.forEach(p => { profissionaisMap[p.id] = p; });
          }
        }

        // Montar agendamentos completos
        const agendamentosCompletos = data.map(a => ({
          ...a,
          procedimento: a.procedimento_id ? procedimentosMap[a.procedimento_id] : undefined,
          profissional: a.profissional_id ? profissionaisMap[a.profissional_id] : undefined,
        }));

        setAgendamentos(agendamentosCompletos as any);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoadingAgendamentos(false);
    }
  };

  const criarAgendamento = async () => {
    if (!dataAgendamento || !horaAgendamento) {
      showToast('Preencha data e hora do agendamento', 'warning');
      return;
    }

    if (!leadId && !clienteId) {
      showToast('Erro: Lead não vinculado. Recarregue a página e tente novamente.', 'error');
      return;
    }

    setSalvandoAgendamento(true);
    try {
      const dataHora = new Date(`${dataAgendamento}T${horaAgendamento}`);

      const { data, error } = await supabase
        .from('agendamentos')
        .insert({
          clinica_id: clinicaId,
          lead_id: leadId || null,
          cliente_id: clienteId || null,
          procedimento_id: procedimentoAgendamento || null,
          profissional_id: profissionalAgendamento || null,
          data_hora: dataHora.toISOString(),
          valor: valorAgendamento ? parseFloat(valorAgendamento) : null,
          status: 'agendado',
          tipo: 'normal',
          criado_por: 'humano',
          observacoes: observacoesAgendamento || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar etapa do lead para 'agendado'
      if (leadId) {
        await supabase
          .from('leads_ia')
          .update({ etapa: 'agendado' })
          .eq('id', leadId);

        if (onStatusAlterado) onStatusAlterado('agendado');
      }

      // Criar notificação
      await supabase
        .from('notificacoes')
        .insert({
          clinica_id: clinicaId,
          tipo: 'agendamento_novo',
          titulo: 'Novo agendamento',
          mensagem: `Agendamento criado para ${leadNome} em ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          lead_id: leadId,
          agendamento_id: data.id,
        });

      showToast('Agendamento criado!', 'success');
      limparFormulario();
      fetchAgendamentos();

      if (onAgendamentoCriado) onAgendamentoCriado();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      showToast('Erro ao criar agendamento', 'error');
    } finally {
      setSalvandoAgendamento(false);
    }
  };

  const limparFormulario = () => {
    setShowNovoAgendamento(false);
    setDataAgendamento('');
    setHoraAgendamento('');
    setProcedimentoAgendamento('');
    setProfissionalAgendamento('');
    setValorAgendamento('');
    setObservacoesAgendamento('');
    setSlotsDisponiveis([]);
  };

  const confirmarAgendamento = async (agendamento: Agendamento) => {
    try {
      // Criar evento no Google Calendar
      const startDate = new Date(agendamento.data_hora);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + (agendamento.procedimento?.duracao_minutos || 60));

      const profNome = agendamento.profissional?.nome || '';
      const eventData = {
        summary: `${agendamento.procedimento?.nome || 'Consulta'} - ${leadNome}${profNome ? ` (${profNome})` : ''}`,
        description: `Cliente: ${leadNome}\nTelefone: ${leadTelefone || 'Não informado'}${profNome ? `\nProfissional: ${profNome}` : ''}\nValor: R$ ${agendamento.valor?.toLocaleString('pt-BR') || '0'}${agendamento.observacoes ? '\nObs: ' + agendamento.observacoes : ''}`,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
      };

      let googleEventId = null;

      const calendarResponse = await fetch('/api/google/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          clinicaId,
          eventData,
        }),
      });

      const calendarResult = await calendarResponse.json();

      if (calendarResult.success) {
        googleEventId = calendarResult.eventId;
      }

      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'confirmado',
          google_calendar_event_id: googleEventId,
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamento.id);

      if (error) throw error;

      if (googleEventId) {
        showToast('Agendamento confirmado e adicionado ao Google Calendar!', 'success');
      } else {
        showToast('Agendamento confirmado!', 'success');
      }

      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      showToast('Erro ao confirmar agendamento', 'error');
    }
  };

  const cancelarAgendamento = async (agendamento: Agendamento) => {
    showConfirm(
      'Cancelar este agendamento?',
      async () => {
        try {
          if (agendamento.google_calendar_event_id) {
            await fetch('/api/google/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete',
                clinicaId,
                eventId: agendamento.google_calendar_event_id,
              }),
            });
          }

          const { error } = await supabase
            .from('agendamentos')
            .update({
              status: 'cancelado',
              google_calendar_event_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', agendamento.id);

          if (error) throw error;

          showToast('Agendamento cancelado!', 'success');
          fetchAgendamentos();
        } catch (error) {
          console.error('Erro ao cancelar agendamento:', error);
          showToast('Erro ao cancelar agendamento', 'error');
        }
      },
      'Cancelar Agendamento'
    );
  };

  const marcarRealizado = async (agendamento: Agendamento) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'realizado',
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamento.id);

      if (error) throw error;

      const { data: agendamentoCompleto } = await supabase
        .from('agendamentos')
        .select('lead_id, cliente_id')
        .eq('id', agendamento.id)
        .single();

      const leadIdParaRetorno = agendamentoCompleto?.lead_id || leadId;
      const clienteIdParaRetorno = agendamentoCompleto?.cliente_id || clienteId;

      if (agendamento.procedimento?.retorno_dias) {
        const dataRetorno = new Date();
        dataRetorno.setDate(dataRetorno.getDate() + agendamento.procedimento.retorno_dias);
        dataRetorno.setHours(10, 0, 0, 0);

        const dadosRetorno: any = {
          clinica_id: clinicaId,
          procedimento_id: agendamento.procedimento.id,
          profissional_id: agendamento.profissional_id,
          data_hora: dataRetorno.toISOString(),
          valor: agendamento.valor,
          status: 'agendado',
          tipo: 'retorno',
          criado_por: 'sistema',
          observacoes: `Retorno automático - ${agendamento.procedimento.retorno_dias} dias após procedimento`,
        };

        if (leadIdParaRetorno) dadosRetorno.lead_id = leadIdParaRetorno;
        if (clienteIdParaRetorno) dadosRetorno.cliente_id = clienteIdParaRetorno;

        const { error: erroRetorno } = await supabase
          .from('agendamentos')
          .insert(dadosRetorno);

        if (erroRetorno) {
          console.error('Erro ao criar retorno:', erroRetorno);
          showToast('Erro ao criar retorno automático', 'error');
        } else {
          showToast(`Realizado! Retorno agendado para ${dataRetorno.toLocaleDateString('pt-BR')}`, 'success');
        }
      } else {
        showToast('Marcado como realizado!', 'success');
      }

      // Converter lead para cliente se ainda não existe cliente
      if (leadIdParaRetorno && !clienteIdParaRetorno) {
        // Buscar dados do lead
        const { data: leadData } = await supabase
          .from('leads_ia')
          .select('nome, telefone, email')
          .eq('id', leadIdParaRetorno)
          .single();

        if (leadData) {
          // Verificar se já existe cliente com mesmo telefone
          const { data: clienteExistente } = await supabase
            .from('clientes')
            .select('id')
            .eq('clinica_id', clinicaId)
            .eq('telefone', leadData.telefone)
            .single();

          let novoClienteId = clienteExistente?.id;

          if (!novoClienteId) {
            // Criar novo cliente
            const { data: novoCliente, error: erroCliente } = await supabase
              .from('clientes')
              .insert({
                clinica_id: clinicaId,
                nome: leadData.nome || 'Cliente',
                telefone: leadData.telefone,
                email: leadData.email,
                status: 'ativo'
              })
              .select('id')
              .single();

            if (!erroCliente && novoCliente) {
              novoClienteId = novoCliente.id;
            }
          }

          if (novoClienteId) {
            // Atualizar este agendamento com cliente_id
            await supabase
              .from('agendamentos')
              .update({ cliente_id: novoClienteId })
              .eq('id', agendamento.id);

            // Atualizar agendamentos futuros deste lead
            await supabase
              .from('agendamentos')
              .update({ cliente_id: novoClienteId })
              .eq('lead_id', leadIdParaRetorno)
              .is('cliente_id', null);
          }
        }

        // Marcar lead como convertido
        await supabase
          .from('leads_ia')
          .update({ etapa: 'convertido' })
          .eq('id', leadIdParaRetorno);

        if (onStatusAlterado) onStatusAlterado('convertido');
      } else if (leadIdParaRetorno) {
        // Lead já tem cliente associado, só marcar como convertido
        await supabase
          .from('leads_ia')
          .update({ etapa: 'convertido' })
          .eq('id', leadIdParaRetorno);

        if (onStatusAlterado) onStatusAlterado('convertido');
      }

      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao marcar como realizado:', error);
      showToast('Erro ao atualizar agendamento', 'error');
    }
  };

  const marcarNaoCompareceu = async (agendamentoId: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({
          status: 'nao_compareceu',
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamentoId);

      if (error) throw error;

      showToast('Marcado como não compareceu', 'success');
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      showToast('Erro ao atualizar agendamento', 'error');
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isPast: data < new Date(),
    };
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; cor: string; bg: string }> = {
      agendado: { label: 'Aguardando', cor: 'text-blue-400', bg: 'bg-blue-500/20' },
      confirmado: { label: 'Confirmado', cor: 'text-green-400', bg: 'bg-green-500/20' },
      realizado: { label: 'Realizado', cor: 'text-emerald-400', bg: 'bg-emerald-500/20' },
      cancelado: { label: 'Cancelado', cor: 'text-red-400', bg: 'bg-red-500/20' },
      nao_compareceu: { label: 'Não Compareceu', cor: 'text-orange-400', bg: 'bg-orange-500/20' },
    };
    return statusMap[status] || { label: status, cor: 'text-gray-400', bg: 'bg-gray-500/20' };
  };

  const agendamentosPendentes = agendamentos.filter(a => ['agendado', 'confirmado'].includes(a.status));
  const agendamentosPassados = agendamentos.filter(a => ['realizado', 'cancelado', 'nao_compareceu'].includes(a.status));

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-[420px] max-w-full bg-[var(--theme-card)] border-l border-[var(--theme-card-border)] z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Calendar size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Agendamentos</h3>
                <p className="text-sm text-[var(--theme-text-muted)]">{leadNome}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--theme-text-muted)]">
              {agendamentosPendentes.length} pendente{agendamentosPendentes.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowNovoAgendamento(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm transition-colors"
            >
              <Plus size={16} />
              Agendar
            </button>
          </div>

          {/* Formulário novo agendamento */}
          {showNovoAgendamento && (
            <div className="mb-4 p-4 bg-[var(--theme-input)] rounded-lg border border-purple-500/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-purple-400" />
                Novo Agendamento
              </h4>
              <div className="space-y-3">
                {/* Procedimento */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Procedimento</label>
                  <select
                    value={procedimentoAgendamento}
                    onChange={(e) => setProcedimentoAgendamento(e.target.value)}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Selecione (opcional)</option>
                    {procedimentos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.duracao_minutos}min) - R$ {p.preco.toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profissional */}
                {profissionaisDisponiveis.length > 0 && (
                  <div>
                    <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Profissional</label>
                    <select
                      value={profissionalAgendamento}
                      onChange={(e) => setProfissionalAgendamento(e.target.value)}
                      className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione (opcional)</option>
                      {profissionaisDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Data */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Data *</label>
                  <input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Slots ou Hora */}
                {profissionalAgendamento && dataAgendamento && usarSlots ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-[var(--theme-text-muted)]">Horário Disponível *</label>
                      <button
                        onClick={() => setUsarSlots(false)}
                        className="text-xs text-purple-400 hover:underline"
                      >
                        Digitar hora manualmente
                      </button>
                    </div>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-purple-400" />
                      </div>
                    ) : slotsDisponiveis.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {slotsDisponiveis.map((slot) => (
                          <button
                            key={slot.inicio}
                            onClick={() => setHoraAgendamento(slot.inicio)}
                            className={`px-2 py-2 rounded-lg text-sm transition-colors ${
                              horaAgendamento === slot.inicio
                                ? 'bg-purple-500 text-white'
                                : 'bg-[var(--theme-card)] border border-[var(--theme-card-border)] hover:border-purple-500'
                            }`}
                          >
                            {slot.inicio}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-[var(--theme-text-muted)]">
                        <AlertCircle size={20} className="mx-auto mb-1 text-orange-400" />
                        Nenhum horário disponível neste dia
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-[var(--theme-text-muted)]">Hora *</label>
                      {profissionalAgendamento && dataAgendamento && (
                        <button
                          onClick={() => { setUsarSlots(true); setHoraAgendamento(''); }}
                          className="text-xs text-purple-400 hover:underline"
                        >
                          Ver horários disponíveis
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={horaAgendamento}
                      onChange={(e) => setHoraAgendamento(e.target.value)}
                      className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {/* Valor */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Valor</label>
                  <input
                    type="number"
                    value={valorAgendamento}
                    onChange={(e) => setValorAgendamento(e.target.value)}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                    placeholder="R$ 0,00"
                  />
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Observações</label>
                  <textarea
                    value={observacoesAgendamento}
                    onChange={(e) => setObservacoesAgendamento(e.target.value)}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 resize-none"
                    rows={2}
                    placeholder="Observações opcionais..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={limparFormulario}
                    className="flex-1 px-4 py-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={criarAgendamento}
                    disabled={!dataAgendamento || !horaAgendamento || salvandoAgendamento}
                    className="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {salvandoAgendamento ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Calendar size={16} />
                        Agendar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingAgendamentos ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-purple-400" />
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={48} className="mx-auto text-[var(--theme-text-muted)] mb-3" />
              <p className="text-[var(--theme-text-muted)]">Nenhum agendamento</p>
              <p className="text-xs text-[var(--theme-text-muted)] mt-1">Clique em "Agendar" para criar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pendentes */}
              {agendamentosPendentes.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--theme-text-muted)] uppercase mb-2">Próximos</h4>
                  <div className="space-y-2">
                    {agendamentosPendentes.map((ag) => {
                      const { data, hora, isPast } = formatarDataHora(ag.data_hora);
                      const statusInfo = getStatusInfo(ag.status);

                      return (
                        <div
                          key={ag.id}
                          className={`p-3 bg-[var(--theme-input)] rounded-lg border ${
                            isPast && ag.status === 'agendado'
                              ? 'border-orange-500/50'
                              : 'border-[var(--theme-card-border)]'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {ag.procedimento?.nome || 'Consulta'}
                                </p>
                                {ag.tipo === 'retorno' && (
                                  <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <RefreshCw size={10} />
                                    Retorno
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--theme-text-muted)]">
                                {data} às {hora}
                              </p>
                              {ag.profissional && (
                                <p className="text-xs text-purple-400 flex items-center gap-1 mt-1">
                                  <User size={12} />
                                  {ag.profissional.nome}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${statusInfo.bg} ${statusInfo.cor}`}>
                              {statusInfo.label}
                            </span>
                          </div>

                          {ag.valor && (
                            <p className="text-sm text-primary mb-2">
                              R$ {ag.valor.toLocaleString('pt-BR')}
                            </p>
                          )}

                          {ag.observacoes && (
                            <p className="text-xs text-[var(--theme-text-muted)] mb-2 bg-[var(--theme-card)] p-2 rounded">
                              {ag.observacoes}
                            </p>
                          )}

                          <div className="text-xs text-[var(--theme-text-muted)] mb-2">
                            Criado por: {ag.criado_por === 'ia' ? 'IA' : ag.criado_por === 'sistema' ? 'Sistema' : 'Humano'}
                          </div>

                          {ag.status === 'agendado' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => confirmarAgendamento(ag)}
                                className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                              >
                                <Check size={14} />
                                Confirmar
                              </button>
                              <button
                                onClick={() => cancelarAgendamento(ag)}
                                className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {ag.status === 'confirmado' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => marcarRealizado(ag)}
                                className="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                              >
                                <Check size={14} />
                                Realizado
                              </button>
                              <button
                                onClick={() => marcarNaoCompareceu(ag.id)}
                                className="flex-1 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs transition-colors"
                              >
                                Não Compareceu
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Histórico */}
              {agendamentosPassados.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--theme-text-muted)] uppercase mb-2 mt-6">Histórico</h4>
                  <div className="space-y-2">
                    {agendamentosPassados.slice(0, 5).map((ag) => {
                      const { data, hora } = formatarDataHora(ag.data_hora);
                      const statusInfo = getStatusInfo(ag.status);

                      return (
                        <div
                          key={ag.id}
                          className="p-3 bg-[var(--theme-input)]/50 rounded-lg border border-[var(--theme-card-border)]/50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm">{ag.procedimento?.nome || 'Consulta'}</p>
                              <p className="text-xs text-[var(--theme-text-muted)]">
                                {data}
                                {ag.profissional && ` - ${ag.profissional.nome}`}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.bg} ${statusInfo.cor}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
