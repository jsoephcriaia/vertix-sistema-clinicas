'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X, Upload, Clock, DollarSign, Calendar, AlertTriangle, Tag, Loader2, Image, ImagePlus } from 'lucide-react';
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
  imagem_url?: string;
  imagem_antes_depois_url?: string;
}

export default function ConfigProcedimentos({ onBack }: ConfigProcedimentosProps) {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Procedimento | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadingImagem, setUploadingImagem] = useState(false);
  const [uploadingAntesDepois, setUploadingAntesDepois] = useState(false);
  const [driveConectado, setDriveConectado] = useState(false);

  const inputImagemRef = useRef<HTMLInputElement>(null);
  const inputAntesDepoisRef = useRef<HTMLInputElement>(null);

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
    imagem_url: '',
    imagem_antes_depois_url: '',
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchProcedimentos();
      checkDriveConnection();
    }
  }, [CLINICA_ID]);

  const checkDriveConnection = async () => {
    const { data } = await supabase
      .from('clinicas')
      .select('google_drive_connected')
      .eq('id', CLINICA_ID)
      .single();
    
    setDriveConectado(data?.google_drive_connected || false);
  };

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
          imagem_url: editando.imagem_url,
          imagem_antes_depois_url: editando.imagem_antes_depois_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao salvar procedimento');
      }
    } else {
      const { data, error } = await supabase
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
          imagem_url: editando.imagem_url,
          imagem_antes_depois_url: editando.imagem_antes_depois_url,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar:', error);
        alert('Erro ao criar procedimento');
      } else if (data) {
        setEditando({ ...editando, id: data.id });
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

  const handleUploadImagem = async (file: File, tipo: 'imagem' | 'antes_depois') => {
    if (!editando) return;

    if (!driveConectado) {
      alert('Conecte o Google Drive nas Integrações antes de fazer upload de imagens.');
      return;
    }

    const setUploading = tipo === 'imagem' ? setUploadingImagem : setUploadingAntesDepois;
    setUploading(true);

    try {
      // Se o procedimento ainda não foi salvo, salvar primeiro
      let procedimentoId = editando.id;
      
      if (!procedimentoId) {
        const { data, error } = await supabase
          .from('procedimentos')
          .insert({
            clinica_id: CLINICA_ID,
            nome: editando.nome || 'Novo Procedimento',
            descricao: editando.descricao,
            preco: editando.preco,
            duracao_minutos: editando.duracao_minutos,
            retorno_dias: editando.retorno_dias,
            contraindicacoes: editando.contraindicacoes,
            promocao: editando.promocao,
            ativo: editando.ativo,
          })
          .select()
          .single();

        if (error) throw error;
        procedimentoId = data.id;
        setEditando({ ...editando, id: procedimentoId });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicaId', CLINICA_ID);
      formData.append('procedimentoId', procedimentoId);
      formData.append('tipo', tipo);

      const response = await fetch('/api/google/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Atualizar o estado local
      if (tipo === 'imagem') {
        setEditando({ ...editando, id: procedimentoId, imagem_url: result.imageUrl });
      } else {
        setEditando({ ...editando, id: procedimentoId, imagem_antes_depois_url: result.imageUrl });
      }

      alert('Imagem enviada com sucesso!');

    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar imagem: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'imagem' | 'antes_depois') => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 10MB.');
        return;
      }
      handleUploadImagem(file, tipo);
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

      {!driveConectado && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Google Drive não conectado</p>
              <p className="text-sm text-[#94a3b8]">
                Para fazer upload de imagens dos procedimentos, conecte o Google Drive em Configurações → Integrações.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-start gap-4">
                {/* Imagem do procedimento */}
                <div className="w-20 h-20 rounded-lg bg-[#334155] flex-shrink-0 overflow-hidden">
                  {proc.imagem_url ? (
                    <img src={proc.imagem_url} alt={proc.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={24} className="text-[#64748b]" />
                    </div>
                  )}
                </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Upload de Imagens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Imagem do Procedimento</label>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full h-32 rounded-lg bg-[#334155] flex items-center justify-center overflow-hidden">
                      {editando.imagem_url ? (
                        <img src={editando.imagem_url} alt="Imagem" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={32} className="text-[#64748b]" />
                      )}
                    </div>
                    <input
                      ref={inputImagemRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onFileSelect(e, 'imagem')}
                    />
                    <button
                      onClick={() => inputImagemRef.current?.click()}
                      disabled={uploadingImagem}
                      className="w-full px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadingImagem ? (
                        <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                      ) : (
                        <><Upload size={16} /> Upload Imagem</>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Antes e Depois</label>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full h-32 rounded-lg bg-[#334155] flex items-center justify-center overflow-hidden">
                      {editando.imagem_antes_depois_url ? (
                        <img src={editando.imagem_antes_depois_url} alt="Antes e Depois" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus size={32} className="text-[#64748b]" />
                      )}
                    </div>
                    <input
                      ref={inputAntesDepoisRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onFileSelect(e, 'antes_depois')}
                    />
                    <button
                      onClick={() => inputAntesDepoisRef.current?.click()}
                      disabled={uploadingAntesDepois}
                      className="w-full px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploadingAntesDepois ? (
                        <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                      ) : (
                        <><Upload size={16} /> Upload Antes/Depois</>
                      )}
                    </button>
                  </div>
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