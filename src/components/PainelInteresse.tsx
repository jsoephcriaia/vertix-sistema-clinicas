'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/Alert';

interface Procedimento {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  retorno_dias: number | null;
}

interface LeadProcedimento {
  id: string;
  procedimento_id: string;
  valor_personalizado: number | null;
  procedimento?: Procedimento;
}

interface PainelInteresseProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  leadNome: string;
  clinicaId: string;
}

export default function PainelInteresse({
  isOpen,
  onClose,
  leadId,
  leadNome,
  clinicaId,
}: PainelInteresseProps) {
  const { showToast, showConfirm } = useAlert();

  // Procedimentos disponíveis
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loadingProcedimentos, setLoadingProcedimentos] = useState(false);

  // Procedimentos vinculados ao lead
  const [leadProcedimentos, setLeadProcedimentos] = useState<LeadProcedimento[]>([]);
  const [loadingLeadProcedimentos, setLoadingLeadProcedimentos] = useState(false);

  // Novo procedimento
  const [showAddProcedimento, setShowAddProcedimento] = useState(false);
  const [procedimentoSelecionado, setProcedimentoSelecionado] = useState('');
  const [valorPersonalizado, setValorPersonalizado] = useState('');
  const [salvandoProcedimento, setSalvandoProcedimento] = useState(false);

  // Carregar dados quando abrir
  useEffect(() => {
    if (isOpen && leadId && clinicaId) {
      fetchProcedimentos();
      fetchLeadProcedimentos();
    }
  }, [isOpen, leadId, clinicaId]);

  const fetchProcedimentos = async () => {
    setLoadingProcedimentos(true);
    try {
      const { data, error } = await supabase
        .from('procedimentos')
        .select('id, nome, preco, duracao_minutos, retorno_dias')
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
          procedimento:procedimentos(id, nome, preco, duracao_minutos, retorno_dias)
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
          showToast('Este procedimento já está vinculado ao lead', 'warning');
        } else {
          throw error;
        }
      } else {
        showToast('Procedimento vinculado!', 'success');
        setShowAddProcedimento(false);
        setProcedimentoSelecionado('');
        setValorPersonalizado('');
        fetchLeadProcedimentos();
      }
    } catch (error) {
      console.error('Erro ao adicionar procedimento:', error);
      showToast('Erro ao vincular procedimento', 'error');
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

          showToast('Procedimento removido!', 'success');
          fetchLeadProcedimentos();
        } catch (error) {
          console.error('Erro ao remover procedimento:', error);
          showToast('Erro ao remover procedimento', 'error');
        }
      },
      'Remover'
    );
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
      <div className="fixed right-0 top-0 h-full w-[380px] max-w-full bg-[var(--theme-card)] border-l border-[var(--theme-card-border)] z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Package size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Procedimentos de Interesse</h3>
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
              {leadProcedimentos.length} procedimento{leadProcedimentos.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowAddProcedimento(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-hover rounded-lg text-sm transition-colors"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          {/* Formulário adicionar procedimento - NO TOPO */}
          {showAddProcedimento && (
            <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/30">
              <h4 className="font-medium mb-3">Adicionar Procedimento</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">Procedimento</label>
                  <select
                    value={procedimentoSelecionado}
                    onChange={(e) => {
                      setProcedimentoSelecionado(e.target.value);
                      const proc = procedimentos.find(p => p.id === e.target.value);
                      if (proc) setValorPersonalizado(proc.preco.toString());
                    }}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="">Selecione um procedimento...</option>
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
                  <label className="block text-xs text-[var(--theme-text-muted)] mb-1">
                    Valor Personalizado <span className="text-[#475569]">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    value={valorPersonalizado}
                    onChange={(e) => setValorPersonalizado(e.target.value)}
                    className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                    placeholder="Valor com desconto ou personalizado"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowAddProcedimento(false);
                      setProcedimentoSelecionado('');
                      setValorPersonalizado('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={adicionarProcedimento}
                    disabled={!procedimentoSelecionado || salvandoProcedimento}
                    className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {salvandoProcedimento ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={16} />
                        Vincular
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingLeadProcedimentos ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : leadProcedimentos.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-[#334155] mb-3" />
              <p className="text-[var(--theme-text-muted)]">Nenhum procedimento vinculado</p>
              <p className="text-xs text-[#475569] mt-1">Clique em "Adicionar" para vincular</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leadProcedimentos.map((lp) => (
                <div
                  key={lp.id}
                  className="flex items-center justify-between p-3 bg-[var(--theme-input)] rounded-lg border border-[var(--theme-card-border)]"
                >
                  <div className="flex-1">
                    <p className="font-medium">{lp.procedimento?.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {lp.valor_personalizado && lp.valor_personalizado !== lp.procedimento?.preco ? (
                        <>
                          <span className="text-xs text-[var(--theme-text-muted)] line-through">
                            R$ {lp.procedimento?.preco?.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-sm text-primary font-medium">
                            R$ {lp.valor_personalizado.toLocaleString('pt-BR')}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-primary">
                          R$ {lp.procedimento?.preco?.toLocaleString('pt-BR')}
                        </span>
                      )}
                      {lp.procedimento?.retorno_dias && (
                        <span className="text-xs text-[var(--theme-text-muted)] bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded">
                          Retorno: {lp.procedimento.retorno_dias} dias
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removerProcedimento(lp.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* Total */}
              {leadProcedimentos.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-[#10b981]/30 mt-4">
                  <span className="font-medium text-primary">Total Estimado</span>
                  <span className="font-bold text-lg text-primary">
                    R$ {valorTotal.toLocaleString('pt-BR')}
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
