'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus, X, Save, Loader2, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  interesse: string;
  valor_estimado: number;
  etapa: string;
  created_at: string;
}

interface PipelineProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

const etapas = [
  { id: 'novo', label: 'Novos', cor: 'bg-blue-500' },
  { id: 'atendimento', label: 'Em Atendimento', cor: 'bg-yellow-500' },
  { id: 'agendado', label: 'Agendado', cor: 'bg-purple-500' },
  { id: 'convertido', label: 'Convertido', cor: 'bg-green-500' },
  { id: 'perdido', label: 'Perdido', cor: 'bg-red-500' },
];

function LeadCard({
  lead,
  onDelete,
  onMensagem
}: {
  lead: Lead;
  onDelete: (id: string) => void;
  onMensagem: (lead: Lead) => void;
}) {
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-[var(--theme-input)] rounded-lg p-4 border border-[var(--theme-card-border)] hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{lead.nome}</h4>
      </div>

      <p className="text-sm text-primary mb-2">{lead.interesse}</p>

      <div className="flex items-center gap-2 text-xs text-[var(--theme-text-muted)] mb-2">
        <Phone size={12} />
        <span>{lead.telefone || 'Sem telefone'}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">
          R$ {Number(lead.valor_estimado || 0).toLocaleString('pt-BR')}
        </span>
        <span className="text-xs text-[var(--theme-text-muted)]">{formatarData(lead.created_at)}</span>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-[var(--theme-card-border)]">
        <button
          onClick={() => onMensagem(lead)}
          disabled={!lead.telefone}
          className="p-1.5 hover:bg-primary/20 rounded transition-colors disabled:opacity-50"
          title={lead.telefone ? 'Enviar mensagem' : 'Sem telefone'}
        >
          <MessageSquare size={14} className="text-primary" />
        </button>
        <button
          onClick={() => onDelete(lead.id)}
          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
          title="Excluir lead"
        >
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>
    </div>
  );
}

function Coluna({
  etapa,
  leads,
  total,
  onDelete,
  onMensagem,
}: {
  etapa: { id: string; label: string; cor: string };
  leads: Lead[];
  total: number;
  onDelete: (id: string) => void;
  onMensagem: (lead: Lead) => void;
}) {
  return (
    <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)]">
      <div className="p-4 border-b border-[var(--theme-card-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${etapa.cor}`}></div>
            <h3 className="font-semibold">{etapa.label}</h3>
            <span className="text-xs bg-[var(--theme-bg-tertiary)] px-2 py-0.5 rounded-full">{leads.length}</span>
          </div>
        </div>
        <p className={`text-xs mt-1 ${etapa.id === 'perdido' ? 'text-red-400' : 'text-primary'}`}>
          R$ {total.toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-auto">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onDelete={onDelete} onMensagem={onMensagem} />
        ))}

        {leads.length === 0 && (
          <div className="text-center py-8 text-[var(--theme-text-muted)] border-2 border-dashed rounded-lg border-[var(--theme-card-border)]">
            <p className="text-sm">Nenhum lead nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pipeline({ onAbrirConversa }: PipelineProps) {
  const { clinica } = useAuth();
  const { showConfirm, showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);

  const novoLead: Lead = {
    id: '',
    nome: '',
    telefone: '',
    interesse: '',
    valor_estimado: 0,
    etapa: 'novo',
    created_at: '',
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchLeads();
    }
  }, [CLINICA_ID]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads_ia')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar leads:', error);
    } else {
      // Mapear campos da leads_ia para o formato esperado
      const leadsFormatados = (data || []).map(lead => ({
        id: lead.id,
        nome: lead.nome || 'Sem nome',
        telefone: lead.telefone || '',
        interesse: lead.procedimento_interesse || '',
        valor_estimado: 0, // leads_ia não tem esse campo
        etapa: lead.etapa || 'novo',
        created_at: lead.created_at,
      }));
      setLeads(leadsFormatados);
    }
    setLoading(false);
  };

  const handleNew = () => {
    setEditando({ ...novoLead });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('leads_ia')
        .update({
          nome: editando.nome,
          telefone: editando.telefone,
          procedimento_interesse: editando.interesse,
          etapa: editando.etapa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar lead', 'error');
      } else {
        showToast('Lead atualizado com sucesso!', 'success');
      }
    } else {
      const { error } = await supabase
        .from('leads_ia')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          telefone: editando.telefone,
          procedimento_interesse: editando.interesse,
          etapa: editando.etapa,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar lead', 'error');
      } else {
        showToast('Lead criado com sucesso!', 'success');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    const lead = leads.find(l => l.id === id);
    showConfirm(
      `Excluir o lead "${lead?.nome}"?`,
      async () => {
        const { error } = await supabase.from('leads_ia').delete().eq('id', id);

        if (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir lead', 'error');
        } else {
          showToast('Lead excluído!', 'success');
          fetchLeads();
        }
      },
      'Excluir lead'
    );
  };

  const handleMensagem = (lead: Lead) => {
    if (!lead.telefone) {
      showToast('Este lead não possui telefone cadastrado', 'warning');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(lead.telefone, lead.nome);
    }
  };

  const getLeadsPorEtapa = (etapaId: string) => {
    return leads.filter((lead) => lead.etapa === etapaId);
  };

  const getTotalPorEtapa = (etapaId: string) => {
    return getLeadsPorEtapa(etapaId).reduce((acc, lead) => acc + Number(lead.valor_estimado || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Acompanhe seus leads em cada etapa do funil</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {etapas.map((etapa) => (
          <Coluna
            key={etapa.id}
            etapa={etapa}
            leads={getLeadsPorEtapa(etapa.id)}
            total={getTotalPorEtapa(etapa.id)}
            onDelete={handleDelete}
            onMensagem={handleMensagem}
          />
        ))}
      </div>

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">Novo Lead</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Nome do lead"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Telefone</label>
                <input
                  type="text"
                  value={editando.telefone}
                  onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Interesse</label>
                <input
                  type="text"
                  value={editando.interesse}
                  onChange={(e) => setEditando({ ...editando, interesse: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Ex: Harmonização Facial"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Valor Estimado</label>
                <input
                  type="number"
                  value={editando.valor_estimado}
                  onChange={(e) => setEditando({ ...editando, valor_estimado: Number(e.target.value) })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Etapa</label>
                <select
                  value={editando.etapa}
                  onChange={(e) => setEditando({ ...editando, etapa: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                >
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--theme-card-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editando.nome}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
