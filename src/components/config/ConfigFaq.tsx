'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronUp, HelpCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigFaqProps {
  onBack: () => void;
}

interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
  ordem: number;
}

export default function ConfigFaq({ onBack }: ConfigFaqProps) {
  const { clinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<FaqItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchFaqs();
    }
  }, [CLINICA_ID]);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faq')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('ordem');

    if (error) {
      console.error('Erro ao buscar FAQs:', error);
    } else {
      setFaqs(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (faq: FaqItem) => {
    setEditando({ ...faq });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditando({
      id: '',
      pergunta: '',
      resposta: '',
      ordem: faqs.length + 1,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.pergunta || !editando.resposta) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('faq')
        .update({
          pergunta: editando.pergunta,
          resposta: editando.resposta,
          ordem: editando.ordem,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar FAQ', 'error');
      }
    } else {
      const { error } = await supabase
        .from('faq')
        .insert({
          clinica_id: CLINICA_ID,
          pergunta: editando.pergunta,
          resposta: editando.resposta,
          ordem: editando.ordem,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar FAQ', 'error');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchFaqs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    const { error } = await supabase
      .from('faq')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
      showToast('Erro ao excluir FAQ', 'error');
    } else {
      fetchFaqs();
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    
    const newFaqs = [...faqs];
    [newFaqs[index - 1], newFaqs[index]] = [newFaqs[index], newFaqs[index - 1]];
    
    for (let i = 0; i < newFaqs.length; i++) {
      await supabase
        .from('faq')
        .update({ ordem: i + 1 })
        .eq('id', newFaqs[i].id);
    }
    
    fetchFaqs();
  };

  const moveDown = async (index: number) => {
    if (index === faqs.length - 1) return;
    
    const newFaqs = [...faqs];
    [newFaqs[index], newFaqs[index + 1]] = [newFaqs[index + 1], newFaqs[index]];
    
    for (let i = 0; i < newFaqs.length; i++) {
      await supabase
        .from('faq')
        .update({ ordem: i + 1 })
        .eq('id', newFaqs[i].id);
    }
    
    fetchFaqs();
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
            <h1 className="text-2xl font-bold">FAQ - Perguntas Frequentes</h1>
            <p className="text-[var(--theme-text-muted)] text-sm">Perguntas que a IA usará para responder clientes</p>
          </div>
        </div>
        <button
          onClick={handleNew}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Pergunta
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <HelpCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-medium">Dica</p>
            <p className="text-sm text-[var(--theme-text-secondary)]">Cadastre as perguntas mais comuns dos seus clientes. A Secretária de IA usará essas respostas para responder automaticamente no WhatsApp.</p>
          </div>
        </div>
      </div>

      {faqs.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhuma pergunta cadastrada</p>
          <p className="text-sm">Clique em "Nova Pergunta" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={faq.id} className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)]">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandido(expandido === faq.id ? null : faq.id)}
              >
                <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <p className="flex-1 font-medium">{faq.pergunta}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveUp(index); }}
                    className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                    disabled={index === 0}
                  >
                    <ChevronUp size={16} className={index === 0 ? 'text-[#334155]' : 'text-[var(--theme-text-muted)]'} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveDown(index); }}
                    className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                    disabled={index === faqs.length - 1}
                  >
                    <ChevronDown size={16} className={index === faqs.length - 1 ? 'text-[#334155]' : 'text-[var(--theme-text-muted)]'} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(faq); }}
                    className="p-1.5 hover:bg-[var(--theme-bg-tertiary)] rounded transition-colors"
                  >
                    <Edit size={16} className="text-[var(--theme-text-muted)]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                  <ChevronDown 
                    size={20} 
                    className={`text-[var(--theme-text-muted)] transition-transform ${expandido === faq.id ? 'rotate-180' : ''}`} 
                  />
                </div>
              </div>
              {expandido === faq.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pl-12 text-[var(--theme-text-secondary)] bg-[var(--theme-input)] rounded-lg p-4">
                    {faq.resposta}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Pergunta *</label>
                <input
                  type="text"
                  value={editando.pergunta}
                  onChange={(e) => setEditando({ ...editando, pergunta: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Ex: Quais formas de pagamento vocês aceitam?"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Resposta *</label>
                <textarea
                  value={editando.resposta}
                  onChange={(e) => setEditando({ ...editando, resposta: e.target.value })}
                  rows={5}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Digite a resposta completa que a IA deve usar..."
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
                disabled={saving || !editando.pergunta || !editando.resposta}
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