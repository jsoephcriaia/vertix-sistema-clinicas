'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Clock, Ban, Loader2, X, Calendar, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigHorariosProfissionalProps {
  onBack: () => void;
}

interface Profissional {
  id: string;
  nome: string;
  avatar?: string | null;
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

export default function ConfigHorariosProfissional({ onBack }: ConfigHorariosProfissionalProps) {
  const { clinica } = useAuth();
  const { showToast, showConfirm } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<string>('');
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
    }
  }, [CLINICA_ID]);

  useEffect(() => {
    if (profissionalSelecionado) {
      fetchHorariosProfissional();
      fetchBloqueiosProfissional();
    }
  }, [profissionalSelecionado]);

  const fetchProfissionais = async () => {
    const { data, error } = await supabase
      .from('equipe')
      .select('id, nome, avatar')
      .eq('clinica_id', CLINICA_ID)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar profissionais:', error);
    } else {
      setProfissionais(data || []);
      if (data && data.length > 0 && !profissionalSelecionado) {
        setProfissionalSelecionado(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchHorariosProfissional = async () => {
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
      // Carregar horários padrão da clínica
      await carregarHorariosClinica();
    }
  };

  const carregarHorariosClinica = async () => {
    const { data, error } = await supabase
      .from('horarios')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('dia_semana');

    if (error) {
      console.error('Erro ao buscar horários da clínica:', error);
      // Usar padrão
      setHorarios([0, 1, 2, 3, 4, 5, 6].map(dia => ({
        dia_semana: dia,
        ativo: dia >= 1 && dia <= 5,
        abertura: '08:00',
        fechamento: '18:00',
        intervalo_inicio: '12:00',
        intervalo_fim: '13:00',
      })));
    } else if (data && data.length > 0) {
      setHorarios(data.map(h => ({
        dia_semana: h.dia_semana,
        ativo: h.ativo,
        abertura: h.abertura || '08:00',
        fechamento: h.fechamento || '18:00',
        intervalo_inicio: h.intervalo_inicio || '12:00',
        intervalo_fim: h.intervalo_fim || '13:00',
      })));
    } else {
      setHorarios([0, 1, 2, 3, 4, 5, 6].map(dia => ({
        dia_semana: dia,
        ativo: dia >= 1 && dia <= 5,
        abertura: '08:00',
        fechamento: '18:00',
        intervalo_inicio: '12:00',
        intervalo_fim: '13:00',
      })));
    }
  };

  const fetchBloqueiosProfissional = async () => {
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

  const handleHorarioChange = (diaSemana: number, field: keyof Horario, value: string | boolean) => {
    setHorarios(prev => prev.map(h =>
      h.dia_semana === diaSemana ? { ...h, [field]: value } : h
    ));
  };

  const handleSave = async () => {
    if (!profissionalSelecionado) return;

    setSaving(true);

    if (usarHorariosClinica) {
      // Deletar horários personalizados
      await supabase
        .from('horarios_profissional')
        .delete()
        .eq('profissional_id', profissionalSelecionado);
    } else {
      // Deletar existentes e inserir novos
      await supabase
        .from('horarios_profissional')
        .delete()
        .eq('profissional_id', profissionalSelecionado);

      const horariosInsert = horarios.map(h => ({
        profissional_id: profissionalSelecionado,
        clinica_id: CLINICA_ID,
        dia_semana: h.dia_semana,
        ativo: h.ativo,
        abertura: h.ativo ? h.abertura : null,
        fechamento: h.ativo ? h.fechamento : null,
        intervalo_inicio: h.ativo && h.intervalo_inicio ? h.intervalo_inicio : null,
        intervalo_fim: h.ativo && h.intervalo_fim ? h.intervalo_fim : null,
      }));

      const { error } = await supabase
        .from('horarios_profissional')
        .insert(horariosInsert);

      if (error) {
        console.error('Erro ao salvar horários:', error);
        showToast('Erro ao salvar horários', 'error');
        setSaving(false);
        return;
      }
    }

    showToast('Horários salvos com sucesso!', 'success');
    setSaving(false);
  };

  const handleCopiarHorariosClinica = async () => {
    await carregarHorariosClinica();
    setUsarHorariosClinica(false);
    showToast('Horários da clínica copiados!', 'success');
  };

  const handleAddBloqueio = async () => {
    if (!novoBloqueio.descricao || !novoBloqueio.data || !profissionalSelecionado) return;

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
      console.error('Erro ao criar bloqueio:', error);
      showToast('Erro ao criar bloqueio', 'error');
    } else {
      setShowBloqueioModal(false);
      setNovoBloqueio({
        descricao: '',
        data: '',
        hora_inicio: '00:00',
        hora_fim: '23:59',
      });
      fetchBloqueiosProfissional();
      showToast('Bloqueio adicionado!', 'success');
    }
  };

  const handleDeleteBloqueio = async (id: string) => {
    showConfirm('Excluir este bloqueio?', async () => {
      const { error } = await supabase
        .from('bloqueios_profissional')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir bloqueio:', error);
        showToast('Erro ao excluir bloqueio', 'error');
      } else {
        fetchBloqueiosProfissional();
        showToast('Bloqueio excluído!', 'success');
      }
    }, 'Excluir bloqueio');
  };

  const handleAplicarFeriados = async () => {
    if (!profissionalSelecionado) return;

    setLoadingFeriados(true);

    try {
      const ano = new Date().getFullYear();
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
      const feriados: Feriado[] = await response.json();

      if (!Array.isArray(feriados)) {
        throw new Error('Resposta inválida da API');
      }

      // Filtrar feriados futuros
      const hoje = new Date().toISOString().split('T')[0];
      const feriadosFuturos = feriados.filter(f => f.date >= hoje);

      // Buscar bloqueios existentes de feriados
      const { data: bloqueiosExistentes } = await supabase
        .from('bloqueios_profissional')
        .select('data')
        .eq('profissional_id', profissionalSelecionado)
        .eq('tipo', 'feriado');

      const datasExistentes = bloqueiosExistentes?.map(b => b.data) || [];

      // Criar bloqueios para feriados que ainda não existem
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
        const { error } = await supabase
          .from('bloqueios_profissional')
          .insert(novosBloqueios);

        if (error) {
          throw error;
        }

        showToast(`${novosBloqueios.length} feriados adicionados!`, 'success');
        fetchBloqueiosProfissional();
      } else {
        showToast('Todos os feriados já estão cadastrados', 'info');
      }
    } catch (error) {
      console.error('Erro ao buscar feriados:', error);
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

  if (profissionais.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Horários dos Profissionais</h1>
            <p className="text-[var(--theme-text-muted)] text-sm">Configure a disponibilidade de cada profissional</p>
          </div>
        </div>
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum profissional cadastrado</p>
          <p className="text-sm">Cadastre profissionais em Configurações &gt; Equipe</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Horários dos Profissionais</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Configure a disponibilidade de cada profissional</p>
        </div>
      </div>

      {/* Seletor de profissional */}
      <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-4 mb-6">
        <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Selecione o Profissional</label>
        <select
          value={profissionalSelecionado}
          onChange={(e) => setProfissionalSelecionado(e.target.value)}
          className="w-full max-w-md bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
        >
          {profissionais.map((prof) => (
            <option key={prof.id} value={prof.id}>{prof.nome}</option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {/* Horários semanais */}
        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Horários Semanais
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopiarHorariosClinica}
                className="px-3 py-1.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Copy size={16} />
                Copiar da Clínica
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarHorariosClinica}
                  onChange={(e) => {
                    setUsarHorariosClinica(e.target.checked);
                    if (e.target.checked) {
                      carregarHorariosClinica();
                    }
                  }}
                  className="w-4 h-4 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary focus:ring-[#10b981]"
                />
                <span className="text-sm">Usar horários da clínica</span>
              </label>
            </div>
          </div>

          {usarHorariosClinica ? (
            <div className="text-center py-8 text-[var(--theme-text-muted)] bg-[var(--theme-input)] rounded-lg">
              <p>Este profissional usa os horários padrão da clínica.</p>
              <p className="text-sm">Desmarque a opção acima para personalizar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {horarios.map((h) => (
                <div key={h.dia_semana} className={`flex flex-wrap items-center gap-4 p-4 rounded-lg ${h.ativo ? 'bg-[var(--theme-input)]' : 'bg-[var(--theme-input)]/50'}`}>
                  <div className="w-36">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.ativo}
                        onChange={(e) => handleHorarioChange(h.dia_semana, 'ativo', e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--theme-card-border)] bg-[var(--theme-input)] text-primary focus:ring-[#10b981]"
                      />
                      <span className={h.ativo ? '' : 'text-[var(--theme-text-muted)]'}>{diasSemana[h.dia_semana]}</span>
                    </label>
                  </div>
                  {h.ativo && (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={h.abertura}
                          onChange={(e) => handleHorarioChange(h.dia_semana, 'abertura', e.target.value)}
                          className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                        />
                        <span className="text-[var(--theme-text-muted)]">às</span>
                        <input
                          type="time"
                          value={h.fechamento}
                          onChange={(e) => handleHorarioChange(h.dia_semana, 'fechamento', e.target.value)}
                          className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--theme-text-muted)]">Intervalo:</span>
                        <input
                          type="time"
                          value={h.intervalo_inicio}
                          onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_inicio', e.target.value)}
                          className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-primary w-24"
                        />
                        <span className="text-[var(--theme-text-muted)]">-</span>
                        <input
                          type="time"
                          value={h.intervalo_fim}
                          onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_fim', e.target.value)}
                          className="bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-primary w-24"
                        />
                      </div>
                    </>
                  )}
                  {!h.ativo && (
                    <span className="text-[var(--theme-text-muted)] text-sm">Não atende</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloqueios */}
        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Ban size={20} className="text-red-400" />
              Bloqueios de Horário
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleAplicarFeriados}
                disabled={loadingFeriados}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {loadingFeriados ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Calendar size={16} />
                )}
                Aplicar Feriados
              </button>
              <button
                onClick={() => setShowBloqueioModal(true)}
                className="px-3 py-1.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Adicionar Bloqueio
              </button>
            </div>
          </div>

          {bloqueios.length === 0 ? (
            <p className="text-[var(--theme-text-muted)] text-center py-8">Nenhum bloqueio configurado</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {bloqueios.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-[var(--theme-input)] rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{b.descricao}</p>
                      {b.tipo === 'feriado' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Feriado</span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--theme-text-muted)]">
                      {new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {b.hora_inicio} - {b.hora_fim}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteBloqueio(b.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
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
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Hora Início</label>
                  <input
                    type="time"
                    value={novoBloqueio.hora_inicio}
                    onChange={(e) => setNovoBloqueio(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Hora Fim</label>
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
