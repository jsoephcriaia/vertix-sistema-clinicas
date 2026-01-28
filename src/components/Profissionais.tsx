'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Save, X, Upload, Loader2, Clock, Ban, Calendar, Copy, Camera, Trash, RotateCcw, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Procedimento {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Profissional {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  ativo: boolean;
  avatar?: string | null;
  descricao?: string | null;
}

interface Horario {
  id?: string;
  dia_semana: number;
  ativo: boolean;
  abertura: string;
  fechamento: string;
  intervalo_inicio: string;
  intervalo_fim: string;
}

interface Bloqueio {
  id: string;
  descricao: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  tipo: string;
}

interface Feriado {
  date: string;
  name: string;
  type: string;
}

const diasSemana = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export default function Profissionais() {
  const { clinica } = useAuth();
  const { showToast, showConfirm } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  // Lista de profissionais
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [loading, setLoading] = useState(true);

  // Profissional selecionado para edição
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<string | null>(null);
  const [editando, setEditando] = useState<Profissional | null>(null);
  const [procedimentosSelecionados, setProcedimentosSelecionados] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const inputAvatarRef = useRef<HTMLInputElement>(null);

  // Procedimentos dropdown
  const [showProcedimentosDropdown, setShowProcedimentosDropdown] = useState(false);
  const [filtroProc, setFiltroProc] = useState('');
  const procedimentosDropdownRef = useRef<HTMLDivElement>(null);

  // Horários
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [usarHorariosClinica, setUsarHorariosClinica] = useState(true);
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  const [loadingFeriados, setLoadingFeriados] = useState(false);
  const [novoBloqueio, setNovoBloqueio] = useState({
    descricao: '',
    data: '',
    hora_inicio: '00:00',
    hora_fim: '23:59',
  });

  useEffect(() => {
    if (CLINICA_ID) {
      fetchProfissionais();
      fetchProcedimentos();
    }
  }, [CLINICA_ID]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (procedimentosDropdownRef.current && !procedimentosDropdownRef.current.contains(event.target as Node)) {
        setShowProcedimentosDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (profissionalSelecionado && profissionalSelecionado !== 'novo') {
      fetchHorariosProfissional();
      fetchBloqueiosProfissional();
    }
  }, [profissionalSelecionado]);

  const fetchProfissionais = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipe')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar profissionais:', error);
    } else {
      setProfissionais(data || []);
    }
    setLoading(false);
  };

  const fetchProcedimentos = async () => {
    const { data, error } = await supabase
      .from('procedimentos')
      .select('id, nome, ativo')
      .eq('clinica_id', CLINICA_ID)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar procedimentos:', error);
    } else {
      setProcedimentos(data || []);
    }
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

  const fetchHorariosProfissional = async () => {
    if (!profissionalSelecionado || profissionalSelecionado === 'novo') return;

    const { data, error } = await supabase
      .from('horarios_profissional')
      .select('*')
      .eq('profissional_id', profissionalSelecionado)
      .order('dia_semana');

    if (error) {
      console.error('Erro ao buscar horários:', error);
    } else if (data && data.length > 0) {
      setUsarHorariosClinica(false);
      setHorarios(data.map(h => ({
        id: h.id,
        dia_semana: h.dia_semana,
        ativo: h.ativo,
        abertura: h.abertura || '08:00',
        fechamento: h.fechamento || '18:00',
        intervalo_inicio: h.intervalo_inicio || '12:00',
        intervalo_fim: h.intervalo_fim || '13:00',
      })));
    } else {
      setUsarHorariosClinica(true);
      await carregarHorariosClinica();
    }
  };

  const carregarHorariosClinica = async () => {
    const { data, error } = await supabase
      .from('horarios')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('dia_semana');

    if (error || !data || data.length === 0) {
      setHorarios([0, 1, 2, 3, 4, 5, 6].map(dia => ({
        dia_semana: dia,
        ativo: dia >= 1 && dia <= 5,
        abertura: '08:00',
        fechamento: '18:00',
        intervalo_inicio: '12:00',
        intervalo_fim: '13:00',
      })));
    } else {
      setHorarios(data.map(h => ({
        dia_semana: h.dia_semana,
        ativo: h.ativo,
        abertura: h.abertura || '08:00',
        fechamento: h.fechamento || '18:00',
        intervalo_inicio: h.intervalo_inicio || '12:00',
        intervalo_fim: h.intervalo_fim || '13:00',
      })));
    }
  };

  const fetchBloqueiosProfissional = async () => {
    if (!profissionalSelecionado || profissionalSelecionado === 'novo') return;

    const { data, error } = await supabase
      .from('bloqueios_profissional')
      .select('*')
      .eq('profissional_id', profissionalSelecionado)
      .order('data');

    if (error) {
      console.error('Erro ao buscar bloqueios:', error);
    } else {
      setBloqueios(data || []);
    }
  };

  const handleNovo = () => {
    setProfissionalSelecionado('novo');
    setEditando({
      id: '',
      nome: '',
      cargo: '',
      telefone: '',
      email: '',
      ativo: true,
      avatar: null,
      descricao: null,
    });
    setProcedimentosSelecionados([]);
    setUsarHorariosClinica(true);
    carregarHorariosClinica();
    setBloqueios([]);
  };

  const handleEditar = async (prof: Profissional) => {
    setProfissionalSelecionado(prof.id);
    setEditando({ ...prof });
    const procs = await fetchProcedimentosProfissional(prof.id);
    setProcedimentosSelecionados(procs);
  };

  const handleVoltar = () => {
    setProfissionalSelecionado(null);
    setEditando(null);
    fetchProfissionais();
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    let profissionalId = editando.id;

    try {
      if (editando.id) {
        // Atualizar existente
        const { error } = await supabase
          .from('equipe')
          .update({
            nome: editando.nome,
            cargo: editando.cargo,
            telefone: editando.telefone,
            email: editando.email,
            ativo: editando.ativo,
            descricao: editando.descricao,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editando.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('equipe')
          .insert({
            clinica_id: CLINICA_ID,
            nome: editando.nome,
            cargo: editando.cargo,
            telefone: editando.telefone,
            email: editando.email,
            ativo: editando.ativo,
            descricao: editando.descricao,
          })
          .select()
          .single();

        if (error) throw error;
        profissionalId = data.id;
        setProfissionalSelecionado(profissionalId);
        setEditando({ ...editando, id: profissionalId });
      }

      // Salvar procedimentos
      if (profissionalId) {
        await supabase
          .from('profissional_procedimentos')
          .delete()
          .eq('profissional_id', profissionalId);

        if (procedimentosSelecionados.length > 0) {
          const relacoes = procedimentosSelecionados.map(procId => ({
            profissional_id: profissionalId,
            procedimento_id: procId,
            clinica_id: CLINICA_ID,
          }));

          await supabase.from('profissional_procedimentos').insert(relacoes);
        }
      }

      // Salvar horários
      if (profissionalId) {
        if (usarHorariosClinica) {
          await supabase
            .from('horarios_profissional')
            .delete()
            .eq('profissional_id', profissionalId);
        } else {
          await supabase
            .from('horarios_profissional')
            .delete()
            .eq('profissional_id', profissionalId);

          const horariosInsert = horarios.map(h => ({
            profissional_id: profissionalId,
            clinica_id: CLINICA_ID,
            dia_semana: h.dia_semana,
            ativo: h.ativo,
            abertura: h.ativo ? h.abertura : null,
            fechamento: h.ativo ? h.fechamento : null,
            intervalo_inicio: h.ativo && h.intervalo_inicio ? h.intervalo_inicio : null,
            intervalo_fim: h.ativo && h.intervalo_fim ? h.intervalo_fim : null,
          }));

          await supabase.from('horarios_profissional').insert(horariosInsert);
        }
      }

      showToast('Profissional salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar profissional', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const prof = profissionais.find(p => p.id === id);
    showConfirm(
      `Excluir o profissional "${prof?.nome}"?`,
      async () => {
        const { error } = await supabase.from('equipe').delete().eq('id', id);

        if (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir profissional', 'error');
        } else {
          showToast('Profissional excluído!', 'success');
          fetchProfissionais();
        }
      },
      'Excluir profissional'
    );
  };

  const handleUploadAvatar = async (file: File) => {
    if (!editando?.id || !clinica?.id) {
      showToast('Salve o profissional primeiro', 'warning');
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

  const toggleProcedimento = (procId: string) => {
    setProcedimentosSelecionados(prev =>
      prev.includes(procId)
        ? prev.filter(id => id !== procId)
        : [...prev, procId]
    );
  };

  const handleHorarioChange = (diaSemana: number, field: keyof Horario, value: string | boolean) => {
    setHorarios(prev => prev.map(h =>
      h.dia_semana === diaSemana ? { ...h, [field]: value } : h
    ));
  };

  const handleCopiarHorariosClinica = async () => {
    await carregarHorariosClinica();
    setUsarHorariosClinica(false);
    showToast('Horários da clínica copiados!', 'success');
  };

  const limparTodosHorarios = () => {
    showConfirm(
      'Limpar todos os horários deste profissional?',
      async () => {
        if (profissionalSelecionado && profissionalSelecionado !== 'novo') {
          await supabase
            .from('horarios_profissional')
            .delete()
            .eq('profissional_id', profissionalSelecionado);
        }
        setUsarHorariosClinica(true);
        await carregarHorariosClinica();
        showToast('Horários limpos!', 'success');
      },
      'Limpar horários'
    );
  };

  const handleAddBloqueio = async () => {
    if (!novoBloqueio.descricao || !novoBloqueio.data || !profissionalSelecionado || profissionalSelecionado === 'novo') return;

    const { error } = await supabase
      .from('bloqueios_profissional')
      .insert({
        profissional_id: profissionalSelecionado,
        clinica_id: CLINICA_ID,
        descricao: novoBloqueio.descricao,
        data: novoBloqueio.data,
        hora_inicio: novoBloqueio.hora_inicio,
        hora_fim: novoBloqueio.hora_fim,
        tipo: 'manual',
      });

    if (error) {
      showToast('Erro ao criar bloqueio', 'error');
    } else {
      setShowBloqueioModal(false);
      setNovoBloqueio({ descricao: '', data: '', hora_inicio: '00:00', hora_fim: '23:59' });
      fetchBloqueiosProfissional();
      showToast('Bloqueio adicionado!', 'success');
    }
  };

  const handleDeleteBloqueio = async (id: string) => {
    showConfirm('Excluir este bloqueio?', async () => {
      const { error } = await supabase.from('bloqueios_profissional').delete().eq('id', id);

      if (error) {
        showToast('Erro ao excluir bloqueio', 'error');
      } else {
        fetchBloqueiosProfissional();
        showToast('Bloqueio excluído!', 'success');
      }
    }, 'Excluir bloqueio');
  };

  // Máscara de telefone (aceita fixo e celular)
  const formatarTelefone = (valor: string): string => {
    const numeros = valor.replace(/\D/g, '');

    if (numeros.length <= 2) {
      return numeros.length > 0 ? `(${numeros}` : '';
    }
    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }
    if (numeros.length <= 10) {
      // Telefone fixo: (11) 9999-9999
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    // Celular: (11) 99999-9999
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarTelefone(e.target.value);
    setEditando(prev => prev ? { ...prev, telefone: formatted } : prev);
  };

  const handleAplicarFeriados = async () => {
    if (!profissionalSelecionado || profissionalSelecionado === 'novo') return;

    setLoadingFeriados(true);

    try {
      const ano = new Date().getFullYear();
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
      const feriados: Feriado[] = await response.json();

      if (!Array.isArray(feriados)) throw new Error('Resposta inválida');

      const hoje = new Date().toISOString().split('T')[0];
      const feriadosFuturos = feriados.filter(f => f.date >= hoje);

      const { data: bloqueiosExistentes } = await supabase
        .from('bloqueios_profissional')
        .select('data')
        .eq('profissional_id', profissionalSelecionado)
        .eq('tipo', 'feriado');

      const datasExistentes = bloqueiosExistentes?.map(b => b.data) || [];

      const novosBloqueios = feriadosFuturos
        .filter(f => !datasExistentes.includes(f.date))
        .map(f => ({
          profissional_id: profissionalSelecionado,
          clinica_id: CLINICA_ID,
          descricao: f.name,
          data: f.date,
          hora_inicio: '00:00',
          hora_fim: '23:59',
          tipo: 'feriado',
        }));

      if (novosBloqueios.length > 0) {
        await supabase.from('bloqueios_profissional').insert(novosBloqueios);
        showToast(`${novosBloqueios.length} feriados adicionados!`, 'success');
        fetchBloqueiosProfissional();
      } else {
        showToast('Todos os feriados já estão cadastrados', 'info');
      }
    } catch (error) {
      showToast('Erro ao buscar feriados', 'error');
    } finally {
      setLoadingFeriados(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // Página de detalhe do profissional
  if (profissionalSelecionado && editando) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={handleVoltar} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {editando.id ? editando.nome || 'Editar Profissional' : 'Novo Profissional'}
              </h1>
              <p className="text-[var(--theme-text-muted)] text-sm">Informações e horários</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !editando.nome}
            className="bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Linha 1: Informações Básicas + Procedimentos (lado a lado em desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card de Informações Básicas */}
            <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
              <h2 className="font-semibold mb-4">Informações Básicas</h2>

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-[var(--theme-bg-tertiary)] flex items-center justify-center overflow-hidden">
                    {editando.avatar ? (
                      <>
                        <img src={editando.avatar} alt={editando.nome} className="w-full h-full object-cover" />
                        <button
                          onClick={removerAvatar}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                {editando.id ? (
                  <button
                    onClick={() => inputAvatarRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                  </button>
                ) : (
                  <p className="text-xs text-[var(--theme-text-muted)]">Salve para adicionar foto</p>
                )}
              </div>

              <div className="space-y-4">
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
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Cargo</label>
                  <input
                    type="text"
                    value={editando.cargo}
                    onChange={(e) => setEditando({ ...editando, cargo: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    placeholder="Ex: Biomédica Esteta"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Descrição / Bio</label>
                  <textarea
                    value={editando.descricao || ''}
                    onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary resize-none"
                    rows={3}
                    placeholder="Uma breve descrição sobre o profissional..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Telefone</label>
                    <input
                      type="text"
                      value={editando.telefone}
                      onChange={handleTelefoneChange}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Email</label>
                    <input
                      type="email"
                      value={editando.email}
                      onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                      placeholder="profissional@email.com"
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
            </div>

            {/* Procedimentos que realiza */}
            <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6 h-fit">
              <h2 className="font-semibold mb-4">Procedimentos que Realiza</h2>

              {/* Procedimentos selecionados como tags */}
              {procedimentosSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {procedimentosSelecionados.map((procId) => {
                    const proc = procedimentos.find(p => p.id === procId);
                    if (!proc) return null;
                    return (
                      <span
                        key={procId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm"
                      >
                        {proc.nome}
                        <button
                          type="button"
                          onClick={() => toggleProcedimento(procId)}
                          className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Dropdown de seleção */}
              <div className="relative" ref={procedimentosDropdownRef}>
                <div
                  onClick={() => setShowProcedimentosDropdown(!showProcedimentosDropdown)}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 cursor-pointer flex items-center justify-between hover:border-primary transition-colors"
                >
                  <span className="text-[var(--theme-text-muted)]">
                    {procedimentosSelecionados.length === 0
                      ? 'Selecionar procedimentos...'
                      : `${procedimentosSelecionados.length} selecionado(s)`}
                  </span>
                  <ChevronDown size={18} className={`text-[var(--theme-text-muted)] transition-transform ${showProcedimentosDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showProcedimentosDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg shadow-lg overflow-hidden">
                    {/* Campo de busca */}
                    <div className="p-2 border-b border-[var(--theme-card-border)]">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                        <input
                          type="text"
                          value={filtroProc}
                          onChange={(e) => setFiltroProc(e.target.value)}
                          placeholder="Buscar procedimento..."
                          className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Lista de procedimentos */}
                    <div className="max-h-48 overflow-y-auto">
                      {procedimentos.length === 0 ? (
                        <p className="text-sm text-[var(--theme-text-muted)] p-4 text-center">Nenhum procedimento cadastrado</p>
                      ) : (
                        <>
                          {procedimentos
                            .filter(proc => !procedimentosSelecionados.includes(proc.id))
                            .filter(proc => proc.nome.toLowerCase().includes(filtroProc.toLowerCase()))
                            .map((proc) => (
                              <button
                                key={proc.id}
                                type="button"
                                onClick={() => {
                                  toggleProcedimento(proc.id);
                                  setFiltroProc('');
                                }}
                                className="w-full text-left px-4 py-2.5 hover:bg-[var(--theme-bg-tertiary)] transition-colors text-sm flex items-center gap-2"
                              >
                                <Plus size={14} className="text-primary" />
                                {proc.nome}
                              </button>
                            ))}
                          {procedimentos
                            .filter(proc => !procedimentosSelecionados.includes(proc.id))
                            .filter(proc => proc.nome.toLowerCase().includes(filtroProc.toLowerCase()))
                            .length === 0 && (
                              <p className="text-sm text-[var(--theme-text-muted)] p-4 text-center">
                                {filtroProc ? 'Nenhum resultado encontrado' : 'Todos os procedimentos já foram selecionados'}
                              </p>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linha 2: Horários e Bloqueios (full width, empilhados) */}
          <div className="space-y-6">
            {/* Horários Semanais */}
            <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Clock size={20} className="text-primary" />
                  Horários Semanais
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopiarHorariosClinica}
                    className="px-3 py-1.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <Copy size={14} />
                    Copiar da Clínica
                  </button>
                  <button
                    onClick={limparTodosHorarios}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Limpar
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={usarHorariosClinica}
                  onChange={(e) => {
                    setUsarHorariosClinica(e.target.checked);
                    if (e.target.checked) carregarHorariosClinica();
                  }}
                  className="w-4 h-4 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary focus:ring-[#10b981]"
                />
                <span className="text-sm">Usar horários padrão da clínica</span>
              </label>

              {usarHorariosClinica ? (
                <div className="text-center py-4 text-[var(--theme-text-muted)] bg-[var(--theme-input)] rounded-lg">
                  <p className="text-sm">Usando horários da clínica</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {horarios.map((h) => (
                    <div key={h.dia_semana} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg ${h.ativo ? 'bg-[var(--theme-input)]' : 'bg-[var(--theme-input)]/50'}`}>
                      <label className="flex items-center gap-2 cursor-pointer w-28">
                        <input
                          type="checkbox"
                          checked={h.ativo}
                          onChange={(e) => handleHorarioChange(h.dia_semana, 'ativo', e.target.checked)}
                          className="w-3 h-3 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary"
                        />
                        <span className={`text-xs ${h.ativo ? '' : 'text-[var(--theme-text-muted)]'}`}>
                          {diasSemana[h.dia_semana].substring(0, 3)}
                        </span>
                      </label>
                      {h.ativo ? (
                        <>
                          <input
                            type="time"
                            value={h.abertura}
                            onChange={(e) => handleHorarioChange(h.dia_semana, 'abertura', e.target.value)}
                            className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-primary w-20"
                          />
                          <span className="text-xs text-[var(--theme-text-muted)]">-</span>
                          <input
                            type="time"
                            value={h.fechamento}
                            onChange={(e) => handleHorarioChange(h.dia_semana, 'fechamento', e.target.value)}
                            className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-2 py-1 text-xs focus:outline-none focus:border-primary w-20"
                          />
                          <span className="text-xs text-[var(--theme-text-muted)] ml-1">Int:</span>
                          <input
                            type="time"
                            value={h.intervalo_inicio}
                            onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_inicio', e.target.value)}
                            className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-1 py-1 text-xs focus:outline-none focus:border-primary w-16"
                          />
                          <span className="text-xs text-[var(--theme-text-muted)]">-</span>
                          <input
                            type="time"
                            value={h.intervalo_fim}
                            onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_fim', e.target.value)}
                            className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-1 py-1 text-xs focus:outline-none focus:border-primary w-16"
                          />
                        </>
                      ) : (
                        <span className="text-xs text-[var(--theme-text-muted)]">Não atende</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloqueios */}
            {editando.id && (
              <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Ban size={20} className="text-red-400" />
                    Bloqueios
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAplicarFeriados}
                      disabled={loadingFeriados}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {loadingFeriados ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                      Feriados
                    </button>
                    <button
                      onClick={() => setShowBloqueioModal(true)}
                      className="px-3 py-1.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} />
                      Adicionar
                    </button>
                  </div>
                </div>

                {bloqueios.length === 0 ? (
                  <p className="text-[var(--theme-text-muted)] text-center py-4 text-sm">Nenhum bloqueio</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bloqueios.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-2 bg-[var(--theme-input)] rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{b.descricao}</p>
                            {b.tipo === 'feriado' && (
                              <span className="px-1.5 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Feriado</span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--theme-text-muted)]">
                            {new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {b.hora_inicio} - {b.hora_fim}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteBloqueio(b.id)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de novo bloqueio */}
        {showBloqueioModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBloqueioModal(false)}>
            <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Novo Bloqueio</h2>
                <button onClick={() => setShowBloqueioModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Descrição</label>
                  <input
                    type="text"
                    value={novoBloqueio.descricao}
                    onChange={(e) => setNovoBloqueio(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    placeholder="Ex: Férias, Consulta médica..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Data</label>
                  <input
                    type="date"
                    value={novoBloqueio.data}
                    onChange={(e) => setNovoBloqueio(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Início</label>
                    <input
                      type="time"
                      value={novoBloqueio.hora_inicio}
                      onChange={(e) => setNovoBloqueio(prev => ({ ...prev, hora_inicio: e.target.value }))}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Fim</label>
                    <input
                      type="time"
                      value={novoBloqueio.hora_fim}
                      onChange={(e) => setNovoBloqueio(prev => ({ ...prev, hora_fim: e.target.value }))}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowBloqueioModal(false)}
                  className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddBloqueio}
                  disabled={!novoBloqueio.descricao || !novoBloqueio.data}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lista de profissionais
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Profissionais</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Gerencie sua equipe de profissionais</p>
        </div>
        <button
          onClick={handleNovo}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Profissional
        </button>
      </div>

      {profissionais.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <Upload size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum profissional cadastrado</p>
          <p className="text-sm">Clique em "Novo Profissional" para adicionar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profissionais.map((prof) => (
            <div
              key={prof.id}
              onClick={() => handleEditar(prof)}
              className={`bg-[var(--theme-card)] rounded-xl border ${prof.ativo ? 'border-[var(--theme-card-border)]' : 'border-red-500/30'} p-5 cursor-pointer hover:border-primary transition-colors`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0 overflow-hidden">
                  {prof.avatar ? (
                    <img src={prof.avatar} alt={prof.nome} className="w-full h-full object-cover" />
                  ) : (
                    prof.nome.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{prof.nome}</h3>
                    {!prof.ativo && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 flex-shrink-0">Inativo</span>
                    )}
                  </div>
                  <p className="text-primary text-sm">{prof.cargo}</p>
                  {prof.descricao && (
                    <p className="text-xs text-[var(--theme-text-muted)] mt-1 line-clamp-2">{prof.descricao}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-3 border-t border-[var(--theme-card-border)]">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(prof.id); }}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
