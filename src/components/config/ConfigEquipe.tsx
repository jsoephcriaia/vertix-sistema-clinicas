'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigEquipeProps {
  onBack: () => void;
}

interface Profissional {
  id: string;
  nome: string;
  cargo: string;
  especialidades: string[];
  telefone: string;
  email: string;
  ativo: boolean;
}

export default function ConfigEquipe({ onBack }: ConfigEquipeProps) {
  const { clinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [equipe, setEquipe] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [novaEspecialidade, setNovaEspecialidade] = useState('');

  const novoProfissional: Profissional = {
    id: '',
    nome: '',
    cargo: '',
    especialidades: [],
    telefone: '',
    email: '',
    ativo: true,
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchEquipe();
    }
  }, [CLINICA_ID]);

  const fetchEquipe = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipe')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar equipe:', error);
    } else {
      setEquipe(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (prof: Profissional) => {
    setEditando({ ...prof, especialidades: [...(prof.especialidades || [])] });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditando({ ...novoProfissional });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('equipe')
        .update({
          nome: editando.nome,
          cargo: editando.cargo,
          especialidades: editando.especialidades,
          telefone: editando.telefone,
          email: editando.email,
          ativo: editando.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar profissional', 'error');
      }
    } else {
      const { error } = await supabase
        .from('equipe')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          cargo: editando.cargo,
          especialidades: editando.especialidades,
          telefone: editando.telefone,
          email: editando.email,
          ativo: editando.ativo,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar profissional', 'error');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchEquipe();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    const { error } = await supabase
      .from('equipe')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
      showToast('Erro ao excluir profissional', 'error');
    } else {
      fetchEquipe();
    }
  };

  const addEspecialidade = () => {
    if (!editando || !novaEspecialidade.trim()) return;
    setEditando({
      ...editando,
      especialidades: [...editando.especialidades, novaEspecialidade.trim()]
    });
    setNovaEspecialidade('');
  };

  const removeEspecialidade = (index: number) => {
    if (!editando) return;
    setEditando({
      ...editando,
      especialidades: editando.especialidades.filter((_, i) => i !== index)
    });
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
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-[#64748b] text-sm">Cadastre os profissionais da clínica</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Profissional
        </button>
      </div>

      {equipe.length === 0 ? (
        <div className="text-center py-12 text-[#64748b]">
          <Upload size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum profissional cadastrado</p>
          <p className="text-sm">Clique em "Novo Profissional" para adicionar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipe.map((prof) => (
            <div
              key={prof.id}
              className={`bg-[#1e293b] rounded-xl border ${prof.ativo ? 'border-[#334155]' : 'border-red-500/30'} p-5`}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {prof.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{prof.nome}</h3>
                    {!prof.ativo && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Inativo</span>
                    )}
                  </div>
                  <p className="text-[#10b981] text-sm mb-2">{prof.cargo}</p>
                  {prof.especialidades && prof.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {prof.especialidades.map((esp, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-[#334155] text-[#94a3b8]">
                          {esp}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#64748b]">{prof.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(prof)}
                    className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-[#64748b]" />
                  </button>
                  <button
                    onClick={() => handleDelete(prof.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#334155] flex items-center justify-center">
                    {editando.nome ? (
                      <span className="text-3xl font-bold text-[#10b981]">{editando.nome.charAt(0)}</span>
                    ) : (
                      <Upload size={32} className="text-[#64748b]" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Dra. Amanda Silva"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Cargo *</label>
                <input
                  type="text"
                  value={editando.cargo}
                  onChange={(e) => setEditando({ ...editando, cargo: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Biomédica Esteta, Esteticista..."
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Especialidades</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={novaEspecialidade}
                    onChange={(e) => setNovaEspecialidade(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEspecialidade())}
                    className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 focus:outline-none focus:border-[#10b981]"
                    placeholder="Digite e pressione Enter"
                  />
                  <button
                    onClick={addEspecialidade}
                    type="button"
                    className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editando.especialidades.map((esp, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm bg-[#10b981]/20 text-[#10b981] flex items-center gap-2">
                      {esp}
                      <button onClick={() => removeEspecialidade(i)} className="hover:text-red-400">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Telefone</label>
                  <input
                    type="text"
                    value={editando.telefone}
                    onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Email</label>
                  <input
                    type="email"
                    value={editando.email}
                    onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-[#334155] bg-[#0f172a] text-[#10b981] focus:ring-[#10b981]"
                />
                <span>Profissional ativo</span>
              </label>
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