'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock, DollarSign, Package, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/Alert';

interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface LeadProcedimento {
  id: string;
  procedimento_id: string;
  valor_personalizado: number | null;
  procedimento?: Procedimento;
}

interface Agendamento {
  id: string;
  data_hora: string;
  valor: number;
  status: string;
  criado_por: string;
  observacoes: string | null;
  procedimento?: Procedimento;
}

interface PainelAtendimentoProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  leadNome: string;
  clinicaId: string;
  onAgendamentoCriado?: () => void;
}

export default function PainelAtendimento({
  isOpen,
  onClose,
  leadId,
  leadNome,
  clinicaId,
  onAgendamentoCriado,
}: PainelAtendimentoProps) {
  const { showSuccess, showError, showConfirm } = useAlert();

  // Procedimentos disponíveis
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loadingProcedimentos, setLoadingProcedimentos] = useState(false);

  // Procedimentos vinculados ao lead
  const [leadProcedimentos, setLeadProcedimentos] = useState<LeadProcedimento[]>([]);
  const [loadingLeadProcedimentos, setLoadingLeadProcedimentos] = useState(false);

  // Agendamentos do lead
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  // Novo procedimento
  const [showAddProcedimento, setShowAddProcedimento] = useState(false);
  const [procedimentoSelecionado, setProcedimentoSelecionado] = useState('');
  const [valorPersonalizado, setValorPersonalizado] = useState('');
  const [salvandoProcedimento, setSalvandoProcedimento] = useState(false);

  // Novo agendamento
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [procedimentoAgendamento, setProcedimentoAgendamento] = useState('');
  const [valorAgendamento, setValorAgendamento] = useState('');
  const [observacoesAgendamento, setObservacoesAgendamento] = useState('');
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // Carregar dados quando abrir
  useEffect(() => {
    if (isOpen && leadId && clinicaId) {
      fetchProcedimentos();
      fetchLeadProcedimentos();
      fetchAgendamentos();
    }
  }, [isOpen, leadId, clinicaId]);

  // Atualizar valor quando selecionar procedimento para agendamento
  useEffect(() => {
    if (procedimentoAgendamento) {
      const proc = procedimentos.find(p => p.id === procedimentoAgendamento);
      const leadProc = leadProcedimentos.find(lp => lp.procedimento_id === procedimentoAgendamento);
      const valor = leadProc?.valor_personalizado || proc?.preco || 0;
      setValorAgendamento(valor.toString());
    }
  }, [procedimentoAgendamento, procedimentos, leadProcedimentos]);

  const fetchProcedimentos = async () => {
    setLoadingProcedimentos(true);
    try {
      const { data, error } = await supabase
        .from('procedimentos')
        .select('id, nome, preco, duracao_minutos')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)
        .order('nome');

      if (data && !error) {
        setProcedimentos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos:', error);
    } finally {
      setLoadingProcedimentos(false);
    }
  };

  const fetchLeadProcedimentos = async () => {
    if (!leadId) return;

    setLoadingLeadProcedimentos(true);
    try {
      const { data, error } = await supabase
        .from('lead_procedimentos')
        .select(`
          id,
          procedimento_id,
          valor_personalizado,
          procedimento:procedimentos(id, nome, preco, duracao_minutos)
        `)
        .eq('lead_id', leadId);

      if (data && !error) {
        setLeadProcedimentos(data as any);
      }
    } catch (error) {
      console.error('Erro ao buscar procedimentos do lead:', error);
    } finally {
      setLoadingLeadProcedimentos(false);
    }
  };

  const fetchAgendamentos = async () => {
    if (!leadId) return;

    setLoadingAgendamentos(true);
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          valor,
          status,
          criado_por,
          observacoes,
          procedimento:procedimentos(id, nome, preco, duracao_minutos)
        `)
        .eq('lead_id', leadId)
        .order('data_hora', { ascending: false });

      if (data && !error) {
        setAgendamentos(data as any);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setLoadingAgendamentos(false);
    }
  };

  const adicionarProcedimento = async () => {
    if (!leadId || !procedimentoSelecionado) return;

    setSalvandoProcedimento(true);
    try {
      const valor = valorPersonalizado ? parseFloat(valorPersonalizado) : null;

      const { error } = await supabase
        .from('lead_procedimentos')
        .insert({
          lead_id: leadId,
          procedimento_id: procedimentoSelecionado,
          valor_personalizado: valor,
        });

      if (error) {
        if (error.code === '23505') {
          showError('Este procedimento já está vinculado ao lead');
        } else {
          throw error;
        }
      } else {
        showSuccess('Procedimento vinculado!');
        setShowAddProcedimento(false);
        setProcedimentoSelecionado('');
        setValorPersonalizado('');
        fetchLeadProcedimentos();
      }
    } catch (error) {
      console.error('Erro ao adicionar procedimento:', error);
      showError('Erro ao vincular procedimento');
    } finally {
      setSalvandoProcedimento(false);
    }
  };

  const removerProcedimento = async (id: string) => {
    showConfirm(
      'Remover este procedimento do lead?',
      async () => {
        try {
          const { error } = await supabase
            .from('lead_procedimentos')
            .delete()
            .eq('id', id);

          if (error) throw error;

          showSuccess('Procedimento removido!');
          fetchLeadProcedimentos();
        } catch (error) {
          console.error('Erro ao remover procedimento:', error);
          showError('Erro ao remover procedimento');
        }
      },
      'Remover'
    );
  };

  const criarAgendamento = async () => {
    if (!leadId || !dataAgendamento || !horaAgendamento) {
      showError('Preencha data e hora do agendamento');
      return;
    }

    setSalvandoAgendamento(true);
    try {
      const dataHora = new Date(`${dataAgendamento}T${horaAgendamento}`);

      const { error } = await supabase
        .from('agendamentos')
        .insert({
          clinica_id: clinicaId,
          lead_id: leadId,
          procedimento_id: procedimentoAgendamento || null,
          data_hora: dataHora.toISOString(),
          valor: valorAgendamento ? parseFloat(valorAgendamento) : null,
          status: 'agendado',
          criado_por: 'humano',
          observacoes: observacoesAgendamento || null,
        });

      if (error) throw error;

      // Atualizar etapa do lead para 'agendado'
      await supabase
        .from('leads_ia')
        .update({ etapa: 'agendado' })
        .eq('id', leadId);

      // Criar notificação
      await supabase
        .from('notificacoes')
        .insert({
          clinica_id: clinicaId,
          tipo: 'agendamento_novo',
          titulo: 'Novo agendamento',
          mensagem: `Agendamento criado para ${leadNome} em ${dataHora.toLocaleDateString('pt-BR')} às ${dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          lead_id: leadId,
        });

      showSuccess('Agendamento criado!');
      setShowNovoAgendamento(false);
      setDataAgendamento('');
      setHoraAgendamento('');
      setProcedimentoAgendamento('');
      setValorAgendamento('');
      setObservacoesAgendamento('');
      fetchAgendamentos();

      if (onAgendamentoCriado) {
        onAgendamentoCriado();
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      showError('Erro ao criar agendamento');
    } finally {
      setSalvandoAgendamento(false);
    }
  };

  const atualizarStatusAgendamento = async (agendamentoId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', agendamentoId);

      if (error) throw error;

      // Se marcou como realizado, atualiza lead para convertido
      if (novoStatus === 'realizado') {
        await supabase
          .from('leads_ia')
          .update({ etapa: 'convertido' })
          .eq('id', leadId);
      }

      showSuccess('Status atualizado!');
      fetchAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showError('Erro ao atualizar status');
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; cor: string }> = {
      agendado: { label: 'Agendado', cor: 'bg-blue-500/20 text-blue-400' },
      confirmado: { label: 'Confirmado', cor: 'bg-green-500/20 text-green-400' },
      realizado: { label: 'Realizado', cor: 'bg-emerald-500/20 text-emerald-400' },
      cancelado: { label: 'Cancelado', cor: 'bg-red-500/20 text-red-400' },
      nao_compareceu: { label: 'Não compareceu', cor: 'bg-orange-500/20 text-orange-400' },
    };
    return statusMap[status] || { label: status, cor: 'bg-gray-500/20 text-gray-400' };
  };

  // Calcular valor total dos procedimentos vinculados
  const valorTotal = leadProcedimentos.reduce((acc, lp) => {
    const valor = lp.valor_personalizado || lp.procedimento?.preco || 0;
    return acc + valor;
  }, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-full bg-[#1e293b] border-l border-[#334155] z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Atendimento</h3>
            <p className="text-sm text-[#64748b]">{leadNome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Procedimentos Vinculados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Package size={18} className="text-[#10b981]" />
                Procedimentos de Interesse
              </h4>
              <button
                onClick={() => setShowAddProcedimento(true)}
                className="p-1.5 bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors"
                title="Adicionar procedimento"
              >
                <Plus size={16} />
              </button>
            </div>

            {loadingLeadProcedimentos ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-[#10b981]" />
              </div>
            ) : leadProcedimentos.length === 0 ? (
              <p className="text-sm text-[#64748b] text-center py-4 bg-[#0f172a] rounded-lg">
                Nenhum procedimento vinculado
              </p>
            ) : (
              <div className="space-y-2">
                {leadProcedimentos.map((lp) => (
                  <div
                    key={lp.id}
                    className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{lp.procedimento?.nome}</p>
                      <p className="text-xs text-[#64748b]">
                        {lp.valor_personalizado ? (
                          <>
                            <span className="line-through mr-1">
                              R$ {lp.procedimento?.preco?.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[#10b981]">
                              R$ {lp.valor_personalizado.toLocaleString('pt-BR')}
                            </span>
                          </>
                        ) : (
                          <span>R$ {lp.procedimento?.preco?.toLocaleString('pt-BR')}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removerProcedimento(lp.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between p-3 bg-[#10b981]/10 rounded-lg border border-[#10b981]/30">
                  <span className="font-medium text-[#10b981]">Total</span>
                  <span className="font-bold text-[#10b981]">
                    R$ {valorTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            {/* Formulário adicionar procedimento */}
            {showAddProcedimento && (
              <div className="mt-3 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Procedimento</label>
                    <select
                      value={procedimentoSelecionado}
                      onChange={(e) => {
                        setProcedimentoSelecionado(e.target.value);
                        const proc = procedimentos.find(p => p.id === e.target.value);
                        if (proc) setValorPersonalizado(proc.preco.toString());
                      }}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                    >
                      <option value="">Selecione...</option>
                      {procedimentos
                        .filter(p => !leadProcedimentos.find(lp => lp.procedimento_id === p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} - R$ {p.preco.toLocaleString('pt-BR')}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Valor (editável)</label>
                    <input
                      type="number"
                      value={valorPersonalizado}
                      onChange={(e) => setValorPersonalizado(e.target.value)}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                      placeholder="Valor personalizado"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddProcedimento(false);
                        setProcedimentoSelecionado('');
                        setValorPersonalizado('');
                      }}
                      className="flex-1 px-3 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={adicionarProcedimento}
                      disabled={!procedimentoSelecionado || salvandoProcedimento}
                      className="flex-1 px-3 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {salvandoProcedimento ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={14} />
                          Adicionar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agendamentos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar size={18} className="text-purple-400" />
                Agendamentos
              </h4>
              <button
                onClick={() => setShowNovoAgendamento(true)}
                className="p-1.5 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors"
                title="Novo agendamento"
              >
                <Plus size={16} />
              </button>
            </div>

            {loadingAgendamentos ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-purple-400" />
              </div>
            ) : agendamentos.length === 0 ? (
              <p className="text-sm text-[#64748b] text-center py-4 bg-[#0f172a] rounded-lg">
                Nenhum agendamento
              </p>
            ) : (
              <div className="space-y-2">
                {agendamentos.map((ag) => {
                  const { data, hora } = formatarDataHora(ag.data_hora);
                  const statusInfo = getStatusInfo(ag.status);
                  const isPast = new Date(ag.data_hora) < new Date();

                  return (
                    <div
                      key={ag.id}
                      className={`p-3 bg-[#0f172a] rounded-lg ${isPast && ag.status === 'agendado' ? 'border border-orange-500/30' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {ag.procedimento?.nome || 'Consulta'}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {data} às {hora}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.cor}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {ag.valor && (
                        <p className="text-sm text-[#10b981] mb-2">
                          R$ {ag.valor.toLocaleString('pt-BR')}
                        </p>
                      )}

                      {ag.observacoes && (
                        <p className="text-xs text-[#64748b] mb-2">{ag.observacoes}</p>
                      )}

                      <div className="text-xs text-[#64748b] mb-2">
                        Criado por: {ag.criado_por === 'ia' ? '🤖 IA' : '👤 Humano'}
                      </div>

                      {/* Botões de ação */}
                      {ag.status === 'agendado' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => atualizarStatusAgendamento(ag.id, 'confirmado')}
                            className="flex-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => atualizarStatusAgendamento(ag.id, 'cancelado')}
                            className="flex-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}

                      {ag.status === 'confirmado' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => atualizarStatusAgendamento(ag.id, 'realizado')}
                            className="flex-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-xs transition-colors"
                          >
                            Realizado
                          </button>
                          <button
                            onClick={() => atualizarStatusAgendamento(ag.id, 'nao_compareceu')}
                            className="flex-1 px-2 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded text-xs transition-colors"
                          >
                            Não compareceu
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Formulário novo agendamento */}
            {showNovoAgendamento && (
              <div className="mt-3 p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#64748b] mb-1">Data</label>
                      <input
                        type="date"
                        value={dataAgendamento}
                        onChange={(e) => setDataAgendamento(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#64748b] mb-1">Hora</label>
                      <input
                        type="time"
                        value={horaAgendamento}
                        onChange={(e) => setHoraAgendamento(e.target.value)}
                        className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Procedimento (opcional)</label>
                    <select
                      value={procedimentoAgendamento}
                      onChange={(e) => setProcedimentoAgendamento(e.target.value)}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione...</option>
                      {procedimentos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Valor</label>
                    <input
                      type="number"
                      value={valorAgendamento}
                      onChange={(e) => setValorAgendamento(e.target.value)}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#64748b] mb-1">Observações</label>
                    <textarea
                      value={observacoesAgendamento}
                      onChange={(e) => setObservacoesAgendamento(e.target.value)}
                      className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none"
                      rows={2}
                      placeholder="Observações..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowNovoAgendamento(false);
                        setDataAgendamento('');
                        setHoraAgendamento('');
                        setProcedimentoAgendamento('');
                        setValorAgendamento('');
                        setObservacoesAgendamento('');
                      }}
                      className="flex-1 px-3 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={criarAgendamento}
                      disabled={!dataAgendamento || !horaAgendamento || salvandoAgendamento}
                      className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-[#334155] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {salvandoAgendamento ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Calendar size={14} />
                          Agendar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
