'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, Clock, DollarSign, Calendar, AlertTriangle, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface ConfigProcedimentosProps {
  onBack: () => void;
}

interface Procedimento {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracao_minutos: number;
  retorno_dias: number;
  contraindicacoes: string;
  promocao: string;
  ativo: boolean;
}

export default function ConfigProcedimentos({ onBack }: ConfigProcedimentosProps) {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Procedimento | null>(null);
  const [showModal, setShowModal] = useState(false);

  const novoProcedimento: Procedimento = {
    id: '',
    nome: '',
    descricao: '',
    preco: 0,
    duracao_minutos: 60,
    retorno_dias: 30,
    contraindicacoes: '',
    promocao: '',
    ativo: true,
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchProcedimentos();
    }
  }, [CLINICA_ID]);

  const fetchProcedimentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('procedimentos')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar procedimentos:', error);
      alert('Erro ao carregar procedimentos');
    } else {
      setProcedimentos(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (proc: Procedimento) => {
    setEditando({ ...proc });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditando({ ...novoProcedimento });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;
    
    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('procedimentos')
        .update({
          nome: editando.nome,
          descricao: editando.descricao,
          preco: editando.preco,
          duracao_minutos: editando.duracao_minutos,
          retorno_dias: editando.retorno_dias,
          contraindicacoes: editando.contraindicacoes,
          promocao: editando.promocao,
          ativo: editando.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao salvar procedimento');
      }
    } else {
      const { error } = await supabase
        .from('procedimentos')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          descricao: editando.descricao,
          preco: editando.preco,
          duracao_minutos: editando.duracao_minutos,
          retorno_dias: editando.retorno_dias,
          contraindicacoes: editando.contraindicacoes,
          promocao: editando.promocao,
          ativo: editando.ativo,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        alert('Erro ao criar procedimento');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchProcedimentos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este procedimento?')) return;
    
    const { error } = await supabase
      .from('procedimentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir procedimento');
    } else {
      fetchProcedimentos();
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from('procedimentos')
      .update({ ativo: !ativo, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar:', error);
    } else {
      fetchProcedimentos();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[#334155] rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Procedimentos</h1>
            <p className="text-[#64748b] text-sm">Cadastre os serviços oferecidos pela clínica</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Procedimento
        </button>
      </div>

      {procedimentos.length === 0 ? (
        <div className="text-center py-12 text-[#64748b]">
          <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum procedimento cadastrado</p>
          <p className="text-sm">Clique em "Novo Procedimento" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {procedimentos.map((proc) => (
            <div
              key={proc.id}
              className={`bg-[#1e293b] rounded-xl border ${proc.ativo ? 'border-[#334155]' : 'border-red-500/30'} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{proc.nome}</h3>
                    {!proc.ativo && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Inativo</span>
                    )}
                    {proc.promocao && (
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                        <Tag size={12} /> {proc.promocao}
                      </span>
                    )}
                  </div>
                  <p className="text-[#94a3b8] text-sm mb-3">{proc.descricao}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1 text-[#10b981]">
                      <DollarSign size={16} />
                      R$ {Number(proc.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-1 text-[#64748b]">
                      <Clock size={16} />
                      {proc.duracao_minutos} min
                    </span>
                    <span className="flex items-center gap-1 text-[#64748b]">
                      <Calendar size={16} />
                      Retorno: {proc.retorno_dias} dias
                    </span>
                  </div>
                  {proc.contraindicacoes && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-orange-400">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{proc.contraindicacoes}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleAtivo(proc.id, proc.ativo)}
                    className={`px-3 py-1 rounded text-sm ${proc.ativo ? 'bg-green-500/20 text-green-400' : 'bg-[#334155] text-[#64748b]'}`}
                  >
                    {proc.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => handleEdit(proc)}
                    className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                  >
                    <Edit size={18} className="text-[#64748b]" />
                  </button>
                  <button
                    onClick={() => handleDelete(proc.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#64748b] mb-2">Imagem do Procedimento</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-24 rounded-lg bg-[#334155] flex items-center justify-center">
                    <Upload size={24} className="text-[#64748b]" />
                  </div>
                  <button className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors">
                    Upload Imagem
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Nome do Procedimento *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Limpeza de Pele"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Descrição</label>
                <textarea
                  value={editando.descricao || ''}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Descreva o procedimento..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Preço (R$) *</label>
                  <input
                    type="number"
                    value={editando.preco}
                    onChange={(e) => setEditando({ ...editando, preco: Number(e.target.value) })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Duração (minutos)</label>
                  <input
                    type="number"
                    value={editando.duracao_minutos}
                    onChange={(e) => setEditando({ ...editando, duracao_minutos: Number(e.target.value) })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Retorno (dias)</label>
                  <input
                    type="number"
                    value={editando.retorno_dias}
                    onChange={(e) => setEditando({ ...editando, retorno_dias: Number(e.target.value) })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                    placeholder="Ex: 30"
                  />
                  <p className="text-xs text-[#64748b] mt-1">Dias para sugerir retorno do cliente</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">
                  <AlertTriangle size={14} className="inline mr-1 text-orange-400" />
                  Contraindicações (opcional)
                </label>
                <textarea
                  value={editando.contraindicacoes || ''}
                  onChange={(e) => setEditando({ ...editando, contraindicacoes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Gestantes, pessoas com alergia a..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">
                  <Tag size={14} className="inline mr-1 text-yellow-400" />
                  Promoção Ativa (opcional)
                </label>
                <input
                  type="text"
                  value={editando.promocao || ''}
                  onChange={(e) => setEditando({ ...editando, promocao: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: 10% OFF até sexta"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[#334155] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editando.nome}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] disabled:text-[#64748b] rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}