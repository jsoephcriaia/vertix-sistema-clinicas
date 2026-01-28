'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigEquipeProps {
  onBack: () => void;
}

interface Procedimento {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Profissional {
  id: string;
  nome: string;
  cargo: string;
  especialidades: string[];
  telefone: string;
  email: string;
  ativo: boolean;
  avatar?: string | null;
  descricao?: string | null;
}

export default function ConfigEquipe({ onBack }: ConfigEquipeProps) {
  const { clinica } = useAuth();
  const { showToast, showConfirm } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [equipe, setEquipe] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [novaEspecialidade, setNovaEspecialidade] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>([]);
  const inputAvatarRef = useRef<HTMLInputElement>(null);

  const novoProfissional: Profissional = {
    id: '',
    nome: '',
    cargo: '',
    especialidades: [],
    telefone: '',
    email: '',
    ativo: true,
    avatar: null,
    descricao: null,
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchData();
    }
  }, [CLINICA_ID]);

  const fetchData = async () => {
    setLoading(true);

    // Buscar equipe
    const { data: equipeData, error: equipeError } = await supabase
      .from('equipe')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (equipeError) {
      console.error('Erro ao buscar equipe:', equipeError);
    } else {
      setEquipe(equipeData || []);
    }

    // Buscar procedimentos ativos
    const { data: procData, error: procError } = await supabase
      .from('procedimentos')
      .select('id, nome, ativo')
      .eq('clinica_id', CLINICA_ID)
      .eq('ativo', true)
      .order('nome');

    if (procError) {
      console.error('Erro ao buscar procedimentos:', procError);
    } else {
      setProcedimentos(procData || []);
    }

    setLoading(false);
  };

  const fetchProcedimentosProfissional = async (profissionalId: string) => {
    const { data, error } = await supabase
      .from('profissional_procedimentos')
      .select('procedimento_id')
      .eq('profissional_id', profissionalId);

    if (error) {
      console.error('Erro ao buscar procedimentos do profissional:', error);
      return [];
    }

    return data?.map(p => p.procedimento_id) || [];
  };

  const handleEdit = async (prof: Profissional) => {
    const procs = await fetchProcedimentosProfissional(prof.id);
    setProcedimentosSelecionados(procs);
    setEditando({ ...prof, especialidades: [...(prof.especialidades || [])] });
    setShowModal(true);
  };

  const handleNew = () => {
    setProcedimentosSelecionados([]);
    setEditando({ ...novoProfissional });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    let profissionalId = editando.id;

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
          descricao: editando.descricao,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar profissional', 'error');
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('equipe')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          cargo: editando.cargo,
          especialidades: editando.especialidades,
          telefone: editando.telefone,
          email: editando.email,
          ativo: editando.ativo,
          descricao: editando.descricao,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar profissional', 'error');
        setSaving(false);
        return;
      }

      profissionalId = data.id;
    }

    // Salvar procedimentos do profissional
    if (profissionalId) {
      // Deletar relações existentes
      await supabase
        .from('profissional_procedimentos')
        .delete()
        .eq('profissional_id', profissionalId);

      // Inserir novas relações
      if (procedimentosSelecionados.length > 0) {
        const relacoes = procedimentosSelecionados.map(procId => ({
          profissional_id: profissionalId,
          procedimento_id: procId,
          clinica_id: CLINICA_ID,
        }));

        const { error: relError } = await supabase
          .from('profissional_procedimentos')
          .insert(relacoes);

        if (relError) {
          console.error('Erro ao salvar procedimentos:', relError);
        }
      }
    }

    showToast('Profissional salvo com sucesso!', 'success');
    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const prof = equipe.find(p => p.id === id);
    showConfirm(
      `Excluir o profissional "${prof?.nome}"?`,
      async () => {
        const { error } = await supabase
          .from('equipe')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir profissional', 'error');
        } else {
          showToast('Profissional excluído!', 'success');
          fetchData();
        }
      },
      'Excluir profissional'
    );
  };

  const handleUploadAvatar = async (file: File) => {
    if (!editando?.id || !clinica?.id) {
      showToast('Salve o profissional primeiro antes de adicionar foto', 'warning');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicaId', clinica.id);
      formData.append('tipo', 'profissional_avatar');
      formData.append('profissionalId', editando.id);

      const response = await fetch('/api/google/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      setEditando({ ...editando, avatar: result.imageUrl });
      showToast('Foto atualizada!', 'success');
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      showToast('Erro ao enviar foto', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removerAvatar = async () => {
    if (!editando?.id) return;

    try {
      await supabase
        .from('equipe')
        .update({ avatar: null, updated_at: new Date().toISOString() })
        .eq('id', editando.id);

      setEditando({ ...editando, avatar: null });
      showToast('Foto removida!', 'success');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      showToast('Erro ao remover foto', 'error');
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

  const toggleProcedimento = (procId: string) => {
    setProcedimentosSelecionados(prev =>
      prev.includes(procId)
        ? prev.filter(id => id !== procId)
        : [...prev, procId]
    );
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
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-[var(--theme-text-muted)] text-sm">Cadastre os profissionais da clínica</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Profissional
        </button>
      </div>

      {equipe.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <Upload size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum profissional cadastrado</p>
          <p className="text-sm">Clique em "Novo Profissional" para adicionar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipe.map((prof) => (
            <div
              key={prof.id}
              className={`bg-[var(--theme-card)] rounded-xl border ${prof.ativo ? 'border-[var(--theme-card-border)]' : 'border-red-500/30'} p-5`}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
                  {prof.avatar ? (
                    <img src={prof.avatar} alt={prof.nome} className="w-full h-full object-cover" />
                  ) : (
                    prof.nome.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{prof.nome}</h3>
                    {!prof.ativo && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Inativo</span>
                    )}
                  </div>
                  <p className="text-primary text-sm mb-2">{prof.cargo}</p>
                  {prof.descricao && (
                    <p className="text-xs text-[var(--theme-text-muted)] mb-2 line-clamp-2">{prof.descricao}</p>
                  )}
                  {prof.especialidades && prof.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {prof.especialidades.map((esp, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]">
                          {esp}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[var(--theme-text-muted)]">{prof.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(prof)}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-[var(--theme-text-muted)]" />
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
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-[var(--theme-bg-tertiary)] flex items-center justify-center overflow-hidden">
                    {editando.avatar ? (
                      <>
                        <img src={editando.avatar} alt={editando.nome} className="w-full h-full object-cover" />
                        <button
                          onClick={removerAvatar}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover foto"
                        >
                          <Trash2 size={24} className="text-red-400" />
                        </button>
                      </>
                    ) : editando.nome ? (
                      <span className="text-3xl font-bold text-primary">{editando.nome.charAt(0)}</span>
                    ) : (
                      <Camera size={32} className="text-[var(--theme-text-muted)]" />
                    )}
                  </div>
                </div>
                <input
                  ref={inputAvatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadAvatar(file);
                    e.target.value = '';
                  }}
                />
                {editando.id && (
                  <button
                    onClick={() => inputAvatarRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><Upload size={16} /> Alterar Foto</>
                    )}
                  </button>
                )}
                {!editando.id && (
                  <p className="text-xs text-[var(--theme-text-muted)]">Salve para adicionar foto</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Ex: Dra. Amanda Silva"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Cargo *</label>
                <input
                  type="text"
                  value={editando.cargo}
                  onChange={(e) => setEditando({ ...editando, cargo: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Ex: Biomédica Esteta, Esteticista..."
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Descrição / Bio</label>
                <textarea
                  value={editando.descricao || ''}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary resize-none"
                  placeholder="Uma breve descrição sobre o profissional..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Especialidades</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={novaEspecialidade}
                    onChange={(e) => setNovaEspecialidade(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEspecialidade())}
                    className="flex-1 bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    placeholder="Digite e pressione Enter"
                  />
                  <button
                    onClick={addEspecialidade}
                    type="button"
                    className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editando.especialidades.map((esp, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm bg-primary/20 text-primary flex items-center gap-2">
                      {esp}
                      <button onClick={() => removeEspecialidade(i)} className="hover:text-red-400">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Procedimentos que realiza */}
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Procedimentos que Realiza</label>
                {procedimentos.length === 0 ? (
                  <p className="text-sm text-[var(--theme-text-muted)]">Nenhum procedimento cadastrado</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-[var(--theme-input)] rounded-lg border border-[var(--theme-card-border)]">
                    {procedimentos.map((proc) => (
                      <label key={proc.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--theme-bg-tertiary)] rounded">
                        <input
                          type="checkbox"
                          checked={procedimentosSelecionados.includes(proc.id)}
                          onChange={() => toggleProcedimento(proc.id)}
                          className="w-4 h-4 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary focus:ring-[#10b981]"
                        />
                        <span className="text-sm truncate">{proc.nome}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Telefone</label>
                  <input
                    type="text"
                    value={editando.telefone}
                    onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Email</label>
                  <input
                    type="email"
                    value={editando.email}
                    onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary focus:ring-[#10b981]"
                />
                <span>Profissional ativo</span>
              </label>
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
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg transition-colors flex items-center gap-2"
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
