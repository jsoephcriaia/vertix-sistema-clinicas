'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';
import { triggerRAGReindex } from '@/lib/rag';

interface ConfigPoliticasProps {
  onBack: () => void;
}

interface Politica {
  id: string;
  titulo: string;
  conteudo: string;
}

export default function ConfigPoliticas({ onBack }: ConfigPoliticasProps) {
  const { clinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Politica | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchPoliticas();
    }
  }, [CLINICA_ID]);

  const fetchPoliticas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('politicas')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('created_at');

    if (error) {
      console.error('Erro ao buscar políticas:', error);
    } else {
      setPoliticas(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (politica: Politica) => {
    setEditando({ ...politica });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditando({
      id: '',
      titulo: '',
      conteudo: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.titulo || !editando.conteudo) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('politicas')
        .update({
          titulo: editando.titulo,
          conteudo: editando.conteudo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar política', 'error');
      }
    } else {
      const { error } = await supabase
        .from('politicas')
        .insert({
          clinica_id: CLINICA_ID,
          titulo: editando.titulo,
          conteudo: editando.conteudo,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar política', 'error');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchPoliticas();
    triggerRAGReindex(CLINICA_ID);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta política?')) return;

    const { error } = await supabase
      .from('politicas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
      showToast('Erro ao excluir política', 'error');
    } else {
      fetchPoliticas();
      triggerRAGReindex(CLINICA_ID);
    }
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
            <h1 className="text-2xl font-bold">Políticas</h1>
            <p className="text-[var(--theme-text-muted)] text-sm">Regras e termos que a IA informará aos clientes</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Política
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <FileText size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Importante</p>
            <p className="text-sm text-[var(--theme-text-secondary)]">Essas políticas serão usadas pela Secretária de IA para informar clientes sobre regras da clínica. Seja claro e objetivo.</p>
          </div>
        </div>
      </div>

      {politicas.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma política cadastrada</p>
          <p className="text-sm">Clique em "Nova Política" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {politicas.map((politica) => (
            <div key={politica.id} className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{politica.titulo}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(politica)}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-[var(--theme-text-muted)]" />
                  </button>
                  <button
                    onClick={() => handleDelete(politica.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-[var(--theme-text-secondary)] text-sm">{politica.conteudo}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Política' : 'Nova Política'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Título *</label>
                <input
                  type="text"
                  value={editando.titulo}
                  onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Ex: Política de Cancelamento"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Conteúdo *</label>
                <textarea
                  value={editando.conteudo}
                  onChange={(e) => setEditando({ ...editando, conteudo: e.target.value })}
                  rows={6}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Descreva a política em detalhes..."
                />
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
                disabled={saving || !editando.titulo || !editando.conteudo}
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