'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Clock, Ban, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface ConfigHorariosProps {
  onBack: () => void;
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
  recorrente: boolean;
}

const diasSemana = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export default function ConfigHorarios({ onBack }: ConfigHorariosProps) {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [showBloqueioModal, setShowBloqueioModal] = useState(false);
  const [novoBloqueio, setNovoBloqueio] = useState({
    descricao: '',
    data: '',
    hora_inicio: '08:00',
    hora_fim: '18:00',
    recorrente: false,
  });

  useEffect(() => {
    if (CLINICA_ID) {
      fetchData();
    }
  }, [CLINICA_ID]);

  const fetchData = async () => {
    setLoading(true);
    
    const { data: horariosData, error: horariosError } = await supabase
      .from('horarios')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('dia_semana');

    if (horariosError) {
      console.error('Erro ao buscar horários:', horariosError);
    } else if (horariosData && horariosData.length > 0) {
      setHorarios(horariosData.map(h => ({
        id: h.id,
        dia_semana: h.dia_semana,
        ativo: h.ativo,
        abertura: h.abertura || '',
        fechamento: h.fechamento || '',
        intervalo_inicio: h.intervalo_inicio || '',
        intervalo_fim: h.intervalo_fim || '',
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

    const { data: bloqueiosData, error: bloqueiosError } = await supabase
      .from('bloqueios')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('data');

    if (bloqueiosError) {
      console.error('Erro ao buscar bloqueios:', bloqueiosError);
    } else {
      setBloqueios(bloqueiosData || []);
    }

    setLoading(false);
  };

  const handleHorarioChange = (diaSemana: number, field: keyof Horario, value: string | boolean) => {
    setHorarios(prev => prev.map(h => 
      h.dia_semana === diaSemana ? { ...h, [field]: value } : h
    ));
  };

  const handleSave = async () => {
    setSaving(true);

    for (const horario of horarios) {
      if (horario.id) {
        await supabase
          .from('horarios')
          .update({
            ativo: horario.ativo,
            abertura: horario.ativo ? horario.abertura : null,
            fechamento: horario.ativo ? horario.fechamento : null,
            intervalo_inicio: horario.ativo && horario.intervalo_inicio ? horario.intervalo_inicio : null,
            intervalo_fim: horario.ativo && horario.intervalo_fim ? horario.intervalo_fim : null,
          })
          .eq('id', horario.id);
      } else {
        await supabase
          .from('horarios')
          .insert({
            clinica_id: CLINICA_ID,
            dia_semana: horario.dia_semana,
            ativo: horario.ativo,
            abertura: horario.ativo ? horario.abertura : null,
            fechamento: horario.ativo ? horario.fechamento : null,
            intervalo_inicio: horario.ativo && horario.intervalo_inicio ? horario.intervalo_inicio : null,
            intervalo_fim: horario.ativo && horario.intervalo_fim ? horario.intervalo_fim : null,
          });
      }
    }

    alert('Horários salvos com sucesso!');
    setSaving(false);
    fetchData();
  };

  const handleAddBloqueio = async () => {
    if (!novoBloqueio.descricao || !novoBloqueio.data) return;

    const { error } = await supabase
      .from('bloqueios')
      .insert({
        clinica_id: CLINICA_ID,
        descricao: novoBloqueio.descricao,
        data: novoBloqueio.data,
        hora_inicio: novoBloqueio.hora_inicio,
        hora_fim: novoBloqueio.hora_fim,
        recorrente: novoBloqueio.recorrente,
      });

    if (error) {
      console.error('Erro ao criar bloqueio:', error);
      alert('Erro ao criar bloqueio');
    } else {
      setShowBloqueioModal(false);
      setNovoBloqueio({
        descricao: '',
        data: '',
        hora_inicio: '08:00',
        hora_fim: '18:00',
        recorrente: false,
      });
      fetchData();
    }
  };

  const handleDeleteBloqueio = async (id: string) => {
    if (!confirm('Excluir este bloqueio?')) return;

    const { error } = await supabase
      .from('bloqueios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir bloqueio:', error);
    } else {
      fetchData();
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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#334155] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Horários de Atendimento</h1>
          <p className="text-[#64748b] text-sm">Configure os dias e horários de funcionamento</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[#10b981]" />
            Horários por Dia da Semana
          </h2>
          <div className="space-y-4">
            {horarios.map((h) => (
              <div key={h.dia_semana} className={`flex flex-wrap items-center gap-4 p-4 rounded-lg ${h.ativo ? 'bg-[#0f172a]' : 'bg-[#0f172a]/50'}`}>
                <div className="w-36">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.ativo}
                      onChange={(e) => handleHorarioChange(h.dia_semana, 'ativo', e.target.checked)}
                      className="w-4 h-4 rounded border-[#334155] bg-[#0f172a] text-[#10b981] focus:ring-[#10b981]"
                    />
                    <span className={h.ativo ? 'text-white' : 'text-[#64748b]'}>{diasSemana[h.dia_semana]}</span>
                  </label>
                </div>
                {h.ativo && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={h.abertura}
                        onChange={(e) => handleHorarioChange(h.dia_semana, 'abertura', e.target.value)}
                        className="bg-[#334155] border border-[#475569] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#10b981]"
                      />
                      <span className="text-[#64748b]">às</span>
                      <input
                        type="time"
                        value={h.fechamento}
                        onChange={(e) => handleHorarioChange(h.dia_semana, 'fechamento', e.target.value)}
                        className="bg-[#334155] border border-[#475569] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#64748b]">Intervalo:</span>
                      <input
                        type="time"
                        value={h.intervalo_inicio}
                        onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_inicio', e.target.value)}
                        className="bg-[#334155] border border-[#475569] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#10b981] w-24"
                      />
                      <span className="text-[#64748b]">-</span>
                      <input
                        type="time"
                        value={h.intervalo_fim}
                        onChange={(e) => handleHorarioChange(h.dia_semana, 'intervalo_fim', e.target.value)}
                        className="bg-[#334155] border border-[#475569] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#10b981] w-24"
                      />
                    </div>
                  </>
                )}
                {!h.ativo && (
                  <span className="text-[#64748b] text-sm">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Ban size={20} className="text-red-400" />
              Bloqueios de Horário
            </h2>
            <button
              onClick={() => setShowBloqueioModal(true)}
              className="px-3 py-1.5 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={16} />
              Adicionar Bloqueio
            </button>
          </div>
          
          {bloqueios.length === 0 ? (
            <p className="text-[#64748b] text-center py-8">Nenhum bloqueio configurado</p>
          ) : (
            <div className="space-y-3">
              {bloqueios.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg">
                  <div>
                    <p className="font-medium">{b.descricao}</p>
                    <p className="text-sm text-[#64748b]">
                      {new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')} • {b.hora_inicio} - {b.hora_fim}
                      {b.recorrente && <span className="ml-2 text-blue-400">(Semanal)</span>}
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
            className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {showBloqueioModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBloqueioModal(false)}>
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Novo Bloqueio</h2>
              <button onClick={() => setShowBloqueioModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#64748b] mb-2">Descrição</label>
                <input
                  type="text"
                  value={novoBloqueio.descricao}
                  onChange={(e) => setNovoBloqueio(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Feriado, Reunião..."
                />
              </div>
              <div>
                <label className="block text-sm text-[#64748b] mb-2">Data</label>
                <input
                  type="date"
                  value={novoBloqueio.data}
                  onChange={(e) => setNovoBloqueio(prev => ({ ...prev, data: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 focus:outline-none focus:border-[#10b981]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Hora Início</label>
                  <input
                    type="time"
                    value={novoBloqueio.hora_inicio}
                    onChange={(e) => setNovoBloqueio(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Hora Fim</label>
                  <input
                    type="time"
                    value={novoBloqueio.hora_fim}
                    onChange={(e) => setNovoBloqueio(prev => ({ ...prev, hora_fim: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={novoBloqueio.recorrente}
                  onChange={(e) => setNovoBloqueio(prev => ({ ...prev, recorrente: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#334155] bg-[#0f172a] text-[#10b981] focus:ring-[#10b981]"
                />
                <span className="text-sm">Repetir semanalmente</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBloqueioModal(false)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBloqueio}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors"
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