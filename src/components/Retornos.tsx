'use client';

import { useState, useEffect } from 'react';
import { Calendar, Phone, Clock, AlertTriangle, CheckCircle, Loader2, Search, MessageSquare, RefreshCw, Package, Edit, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Retorno {
  id: string;
  data_hora: string;
  valor: number | null;
  status: string;
  tipo: string;
  observacoes: string | null;
  lead_id: string | null;
  cliente_id: string | null;
  procedimento_id: string | null;
  lead_nome: string;
  lead_telefone: string;
  lead_avatar: string | null;
  procedimento_nome: string | null;
}

interface RetornosProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

export default function Retornos({ onAbrirConversa }: RetornosProps) {
  const { clinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');

  // Estado para edição
  const [editandoRetorno, setEditandoRetorno] = useState<Retorno | null>(null);
  const [editData, setEditData] = useState('');
  const [editHora, setEditHora] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchRetornos();
    }
  }, [CLINICA_ID]);

  const fetchRetornos = async () => {
    setLoading(true);
    
    // Buscar agendamentos pendentes
    const { data: agendamentosData, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        valor,
        status,
        tipo,
        observacoes,
        lead_id,
        cliente_id,
        procedimento_id
      `)
      .eq('clinica_id', CLINICA_ID)
      .in('status', ['agendado', 'confirmado'])
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('Erro ao buscar retornos:', error);
      setLoading(false);
      return;
    }

    // Buscar dados dos leads, clientes e procedimentos separadamente
    const leadIds = [...new Set(agendamentosData?.filter(a => a.lead_id).map(a => a.lead_id) || [])];
    const clienteIds = [...new Set(agendamentosData?.filter(a => a.cliente_id).map(a => a.cliente_id) || [])];
    const procedimentoIds = [...new Set(agendamentosData?.filter(a => a.procedimento_id).map(a => a.procedimento_id) || [])];

    // Buscar leads (incluindo avatar)
    let leadsMap: Record<string, { id: string; nome: string; telefone: string; avatar: string | null }> = {};
    if (leadIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads_ia')
        .select('id, nome, telefone, avatar')
        .in('id', leadIds);
      
      if (leadsData) {
        leadsData.forEach(l => { leadsMap[l.id] = l; });
      }
    }

    // Buscar clientes
    let clientesMap: Record<string, { id: string; nome: string; telefone: string }> = {};
    if (clienteIds.length > 0) {
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone')
        .in('id', clienteIds);
      
      if (clientesData) {
        clientesData.forEach(c => { clientesMap[c.id] = c; });
      }
    }

    // Buscar procedimentos
    let procedimentosMap: Record<string, { id: string; nome: string }> = {};
    if (procedimentoIds.length > 0) {
      const { data: procedimentosData } = await supabase
        .from('procedimentos')
        .select('id, nome')
        .in('id', procedimentoIds);
      
      if (procedimentosData) {
        procedimentosData.forEach(p => { procedimentosMap[p.id] = p; });
      }
    }

    // Montar dados completos
    const retornosCompletos = agendamentosData?.map(a => {
      const lead = a.lead_id ? leadsMap[a.lead_id] : null;
      const cliente = a.cliente_id ? clientesMap[a.cliente_id] : null;
      const procedimento = a.procedimento_id ? procedimentosMap[a.procedimento_id] : null;

      return {
        ...a,
        lead_nome: lead?.nome || cliente?.nome || 'Sem nome',
        lead_telefone: lead?.telefone || cliente?.telefone || '',
        lead_avatar: lead?.avatar || null,
        procedimento_nome: procedimento?.nome || null,
      };
    }) || [];

    setRetornos(retornosCompletos);
    setLoading(false);
  };

  const confirmarAgendamento = async (retornoId: string) => {
    const { error } = await supabase
      .from('agendamentos')
      .update({ 
        status: 'confirmado',
        updated_at: new Date().toISOString()
      })
      .eq('id', retornoId);

    if (error) {
      console.error('Erro ao confirmar:', error);
      showToast('Erro ao confirmar agendamento', 'error');
    } else {
      showToast('Agendamento confirmado!', 'success');
      fetchRetornos();
    }
  };

  const handleEnviarMensagem = (retorno: Retorno) => {
    if (!retorno.lead_telefone) {
      showToast('Este cliente não possui telefone cadastrado', 'warning');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(retorno.lead_telefone, retorno.lead_nome);
    }
  };

  const abrirEdicao = (retorno: Retorno) => {
    const dataHora = new Date(retorno.data_hora);
    setEditData(dataHora.toISOString().split('T')[0]);
    setEditHora(dataHora.toTimeString().slice(0, 5));
    setEditandoRetorno(retorno);
  };

  const salvarEdicao = async () => {
    if (!editandoRetorno || !editData || !editHora) return;

    setSalvandoEdicao(true);

    try {
      const novaDataHora = new Date(`${editData}T${editHora}:00`).toISOString();

      // Atualizar no Supabase
      const { error } = await supabase
        .from('agendamentos')
        .update({
          data_hora: novaDataHora,
          updated_at: new Date().toISOString()
        })
        .eq('id', editandoRetorno.id);

      if (error) throw error;

      // Buscar o google_event_id para atualizar no Calendar
      const { data: agendamentoData } = await supabase
        .from('agendamentos')
        .select('google_event_id')
        .eq('id', editandoRetorno.id)
        .single();

      // Se tiver evento no Google Calendar, atualizar
      if (agendamentoData?.google_event_id) {
        try {
          await fetch('/api/google/calendar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clinicaId: CLINICA_ID,
              eventId: agendamentoData.google_event_id,
              title: `${editandoRetorno.procedimento_nome || 'Agendamento'} - ${editandoRetorno.lead_nome}`,
              startTime: novaDataHora,
              endTime: new Date(new Date(novaDataHora).getTime() + 60 * 60 * 1000).toISOString(),
            }),
          });
        } catch (calendarError) {
          console.error('Erro ao atualizar Google Calendar:', calendarError);
          // Não falhar a operação se o Calendar falhar
        }
      }

      showToast('Agendamento atualizado!', 'success');
      setEditandoRetorno(null);
      fetchRetornos();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar agendamento', 'error');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const formatarData = (dataHora: string) => {
    const data = new Date(dataHora);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getDiasAtraso = (dataHora: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataRetorno = new Date(dataHora);
    dataRetorno.setHours(0, 0, 0, 0);
    const diffTime = hoje.getTime() - dataRetorno.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDiasParaRetorno = (dataHora: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataRetorno = new Date(dataHora);
    dataRetorno.setHours(0, 0, 0, 0);
    const diffTime = dataRetorno.getTime() - hoje.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Componente de Avatar
  const Avatar = ({ src, nome, isRetorno = false }: { src?: string | null; nome: string; isRetorno?: boolean }) => {
    if (src) {
      return (
        <img 
          src={src} 
          alt={nome}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
      );
    }
    return (
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[var(--theme-text)] font-bold flex-shrink-0 ${isRetorno ? 'bg-blue-500' : 'bg-primary'}`}>
        {isRetorno ? <RefreshCw size={20} /> : nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Filtros por período
  const retornosAtrasados = retornos.filter(r => getDiasAtraso(r.data_hora) > 0);
  const retornosEstaSemana = retornos.filter(r => {
    const dias = getDiasParaRetorno(r.data_hora);
    return dias >= 0 && dias <= 7;
  });
  const retornosProximaSemana = retornos.filter(r => {
    const dias = getDiasParaRetorno(r.data_hora);
    return dias > 7 && dias <= 14;
  });
  const retornosEsteMes = retornos.filter(r => {
    const dias = getDiasParaRetorno(r.data_hora);
    return dias > 14 && dias <= 30;
  });

  // Gerar lista de meses disponíveis
  const mesesDisponiveis = Array.from(new Set(retornos.map(r => {
    const data = new Date(r.data_hora);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }))).sort();

  const getNomeMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getRetornosFiltrados = () => {
    let lista: Retorno[] = [];
    
    if (filtro === 'atrasados') lista = retornosAtrasados;
    else if (filtro === 'esta-semana') lista = retornosEstaSemana;
    else if (filtro === 'proxima-semana') lista = retornosProximaSemana;
    else if (filtro === 'este-mes') lista = retornosEsteMes;
    else lista = retornos;

    // Filtro por mês específico
    if (mesSelecionado) {
      lista = lista.filter(r => {
        const data = new Date(r.data_hora);
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        return mesAno === mesSelecionado;
      });
    }

    // Filtro por busca
    if (busca) {
      lista = lista.filter(r => {
        return r.lead_nome.toLowerCase().includes(busca.toLowerCase()) ||
               r.lead_telefone.includes(busca) ||
               (r.procedimento_nome?.toLowerCase().includes(busca.toLowerCase()) || false);
      });
    }

    return lista;
  };

  const retornosFiltrados = getRetornosFiltrados();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Retornos e Agendamentos</h1>
        <p className="text-[var(--theme-text-muted)] text-sm">Agendamentos pendentes e retornos programados</p>
      </div>

      {/* Cards de filtro rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setFiltro('atrasados'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'atrasados' && !mesSelecionado ? 'bg-red-500/20 border-red-500' : 'bg-[var(--theme-card)] border-[var(--theme-card-border)] hover:border-red-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-sm text-[var(--theme-text-muted)]">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{retornosAtrasados.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('esta-semana'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'esta-semana' && !mesSelecionado ? 'bg-yellow-500/20 border-yellow-500' : 'bg-[var(--theme-card)] border-[var(--theme-card-border)] hover:border-yellow-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-yellow-400" />
            <span className="text-sm text-[var(--theme-text-muted)]">Esta Semana</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{retornosEstaSemana.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('proxima-semana'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'proxima-semana' && !mesSelecionado ? 'bg-blue-500/20 border-blue-500' : 'bg-[var(--theme-card)] border-[var(--theme-card-border)] hover:border-blue-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-blue-400" />
            <span className="text-sm text-[var(--theme-text-muted)]">Próx. Semana</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{retornosProximaSemana.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('este-mes'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'este-mes' && !mesSelecionado ? 'bg-green-500/20 border-green-500' : 'bg-[var(--theme-card)] border-[var(--theme-card-border)] hover:border-green-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-sm text-[var(--theme-text-muted)]">Este Mês</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{retornosEsteMes.length}</p>
        </button>
      </div>

      {/* Filtros adicionais */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou procedimento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={mesSelecionado}
          onChange={(e) => { setMesSelecionado(e.target.value); if (e.target.value) setFiltro('todos'); }}
          className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary min-w-[200px]"
        >
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map(mes => (
            <option key={mes} value={mes}>{getNomeMes(mes)}</option>
          ))}
        </select>

        <button
          onClick={() => { setFiltro('todos'); setMesSelecionado(''); setBusca(''); }}
          className="px-4 py-2.5 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Lista de retornos */}
      {retornosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum agendamento nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {retornosFiltrados.map((retorno) => {
            const diasAtraso = getDiasAtraso(retorno.data_hora);
            const diasPara = getDiasParaRetorno(retorno.data_hora);
            const atrasado = diasAtraso > 0;

            return (
              <div key={retorno.id} className={`bg-[var(--theme-card)] rounded-xl border p-5 ${atrasado ? 'border-red-500/50' : retorno.status === 'confirmado' ? 'border-green-500/30' : 'border-[var(--theme-card-border)]'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar 
                      src={retorno.lead_avatar} 
                      nome={retorno.lead_nome} 
                      isRetorno={retorno.tipo === 'retorno' && !retorno.lead_avatar}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{retorno.lead_nome}</h3>
                        {retorno.tipo === 'retorno' && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            Retorno
                          </span>
                        )}
                        {retorno.status === 'confirmado' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            Confirmado
                          </span>
                        )}
                        {retorno.status === 'agendado' && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                            Aguardando Confirmação
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[var(--theme-text-muted)] mt-1">
                        <div className="flex items-center gap-1">
                          <Phone size={14} />
                          <span>{retorno.lead_telefone || 'Sem telefone'}</span>
                        </div>
                        {retorno.procedimento_nome && (
                          <div className="flex items-center gap-1">
                            <Package size={14} />
                            <span>{retorno.procedimento_nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-xs text-[var(--theme-text-muted)] mb-1">Data/Hora</p>
                    <p className={`font-semibold ${atrasado ? 'text-red-400' : 'text-[var(--theme-text)]'}`}>
                      {formatarData(retorno.data_hora)} às {formatarHora(retorno.data_hora)}
                    </p>
                    {atrasado && <p className="text-xs text-red-400">{diasAtraso} dia{diasAtraso > 1 ? 's' : ''} atrasado</p>}
                    {!atrasado && diasPara === 0 && <p className="text-xs text-yellow-400">Hoje!</p>}
                    {!atrasado && diasPara > 0 && <p className="text-xs text-[var(--theme-text-muted)]">em {diasPara} dia{diasPara > 1 ? 's' : ''}</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEnviarMensagem(retorno)}
                      disabled={!retorno.lead_telefone}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-card-border)] disabled:text-[var(--theme-text-muted)] text-[var(--theme-text)] rounded-lg text-sm flex items-center gap-2 transition-colors"
                      title={retorno.lead_telefone ? 'Enviar mensagem' : 'Sem telefone'}
                    >
                      <MessageSquare size={16} />
                      Mensagem
                    </button>
                    <button
                      onClick={() => abrirEdicao(retorno)}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      title="Editar data/hora"
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    {retorno.status === 'agendado' && (
                      <button
                        onClick={() => confirmarAgendamento(retorno.id)}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      >
                        <CheckCircle size={16} />
                        Confirmar
                      </button>
                    )}
                  </div>
                </div>

                {retorno.observacoes && (
                  <div className="mt-4 pt-4 border-t border-[var(--theme-card-border)]">
                    <p className="text-sm text-[var(--theme-text-secondary)]">{retorno.observacoes}</p>
                  </div>
                )}

                {retorno.valor && (
                  <div className="mt-2">
                    <span className="text-sm text-primary">R$ {retorno.valor.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição */}
      {editandoRetorno && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditandoRetorno(null)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar Agendamento</h2>
              <button onClick={() => setEditandoRetorno(null)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[var(--theme-bg-tertiary)] rounded-lg p-3 mb-4">
                <p className="font-medium">{editandoRetorno.lead_nome}</p>
                <p className="text-sm text-[var(--theme-text-muted)]">
                  {editandoRetorno.procedimento_nome || 'Agendamento'}
                </p>
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Data</label>
                <input
                  type="date"
                  value={editData}
                  onChange={(e) => setEditData(e.target.value)}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Horário</label>
                <input
                  type="time"
                  value={editHora}
                  onChange={(e) => setEditHora(e.target.value)}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                />
              </div>

              <p className="text-xs text-[var(--theme-text-muted)]">
                A alteração será sincronizada automaticamente com o Google Calendar.
              </p>
            </div>

            <div className="p-6 border-t border-[var(--theme-card-border)] flex justify-end gap-3">
              <button
                onClick={() => setEditandoRetorno(null)}
                className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !editData || !editHora}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg transition-colors flex items-center gap-2"
              >
                {salvandoEdicao ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {salvandoEdicao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
