'use client';

import { useState, useEffect } from 'react';
import { Calendar, Phone, Clock, AlertTriangle, CheckCircle, Loader2, Search, MessageSquare, RefreshCw, Package } from 'lucide-react';
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
  lead?: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
  procedimento?: {
    id: string;
    nome: string;
  } | null;
}

interface RetornosProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

export default function Retornos({ onAbrirConversa }: RetornosProps) {
  const { clinica } = useAuth();
  const { showSuccess, showError } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');

  useEffect(() => {
    if (CLINICA_ID) {
      fetchRetornos();
    }
  }, [CLINICA_ID]);

  const fetchRetornos = async () => {
    setLoading(true);
    
    // Buscar agendamentos do tipo retorno OU agendamentos normais pendentes
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        id,
        data_hora,
        valor,
        status,
        tipo,
        observacoes,
        lead:leads_ia(id, nome, telefone),
        cliente:clientes(id, nome, telefone),
        procedimento:procedimentos(id, nome)
      `)
      .eq('clinica_id', CLINICA_ID)
      .in('status', ['agendado', 'confirmado'])
      .order('data_hora', { ascending: true });

    if (error) {
      console.error('Erro ao buscar retornos:', error);
    } else {
      setRetornos(data || []);
    }
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
      showError('Erro ao confirmar agendamento');
    } else {
      showSuccess('Agendamento confirmado!');
      fetchRetornos();
    }
  };

  const marcarContatado = async (retorno: Retorno) => {
    // Apenas marca como confirmado se ainda não estiver
    if (retorno.status === 'agendado') {
      await confirmarAgendamento(retorno.id);
    } else {
      showSuccess('Agendamento já está confirmado!');
    }
  };

  const handleEnviarMensagem = (retorno: Retorno) => {
    const nome = retorno.lead?.nome || retorno.cliente?.nome || 'Cliente';
    const telefone = retorno.lead?.telefone || retorno.cliente?.telefone;
    
    if (!telefone) {
      showError('Este cliente não possui telefone cadastrado');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(telefone, nome);
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
        const nome = r.lead?.nome || r.cliente?.nome || '';
        const telefone = r.lead?.telefone || r.cliente?.telefone || '';
        const procedimento = r.procedimento?.nome || '';
        return nome.toLowerCase().includes(busca.toLowerCase()) ||
               telefone.includes(busca) ||
               procedimento.toLowerCase().includes(busca.toLowerCase());
      });
    }

    return lista;
  };

  const retornosFiltrados = getRetornosFiltrados();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Retornos e Agendamentos</h1>
        <p className="text-[#64748b] text-sm">Agendamentos pendentes e retornos programados</p>
      </div>

      {/* Cards de filtro rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setFiltro('atrasados'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'atrasados' && !mesSelecionado ? 'bg-red-500/20 border-red-500' : 'bg-[#1e293b] border-[#334155] hover:border-red-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-sm text-[#64748b]">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{retornosAtrasados.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('esta-semana'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'esta-semana' && !mesSelecionado ? 'bg-yellow-500/20 border-yellow-500' : 'bg-[#1e293b] border-[#334155] hover:border-yellow-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-yellow-400" />
            <span className="text-sm text-[#64748b]">Esta Semana</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{retornosEstaSemana.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('proxima-semana'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'proxima-semana' && !mesSelecionado ? 'bg-blue-500/20 border-blue-500' : 'bg-[#1e293b] border-[#334155] hover:border-blue-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-blue-400" />
            <span className="text-sm text-[#64748b]">Próx. Semana</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{retornosProximaSemana.length}</p>
        </button>

        <button
          onClick={() => { setFiltro('este-mes'); setMesSelecionado(''); }}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'este-mes' && !mesSelecionado ? 'bg-green-500/20 border-green-500' : 'bg-[#1e293b] border-[#334155] hover:border-green-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-sm text-[#64748b]">Este Mês</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{retornosEsteMes.length}</p>
        </button>
      </div>

      {/* Filtros adicionais */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou procedimento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#10b981]"
          />
        </div>

        <select
          value={mesSelecionado}
          onChange={(e) => { setMesSelecionado(e.target.value); if (e.target.value) setFiltro('todos'); }}
          className="bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981] min-w-[200px]"
        >
          <option value="">Todos os meses</option>
          {mesesDisponiveis.map(mes => (
            <option key={mes} value={mes}>{getNomeMes(mes)}</option>
          ))}
        </select>

        <button
          onClick={() => { setFiltro('todos'); setMesSelecionado(''); setBusca(''); }}
          className="px-4 py-2.5 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm transition-colors"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Lista de retornos */}
      {retornosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-[#64748b]">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum agendamento nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {retornosFiltrados.map((retorno) => {
            const diasAtraso = getDiasAtraso(retorno.data_hora);
            const diasPara = getDiasParaRetorno(retorno.data_hora);
            const atrasado = diasAtraso > 0;
            const nome = retorno.lead?.nome || retorno.cliente?.nome || 'Sem nome';
            const telefone = retorno.lead?.telefone || retorno.cliente?.telefone || '';

            return (
              <div key={retorno.id} className={`bg-[#1e293b] rounded-xl border p-5 ${atrasado ? 'border-red-500/50' : retorno.status === 'confirmado' ? 'border-green-500/30' : 'border-[#334155]'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${retorno.tipo === 'retorno' ? 'bg-blue-500' : 'bg-[#10b981]'}`}>
                      {retorno.tipo === 'retorno' ? <RefreshCw size={20} /> : nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{nome}</h3>
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
                      <div className="flex items-center gap-4 text-sm text-[#64748b] mt-1">
                        <div className="flex items-center gap-1">
                          <Phone size={14} />
                          <span>{telefone || 'Sem telefone'}</span>
                        </div>
                        {retorno.procedimento && (
                          <div className="flex items-center gap-1">
                            <Package size={14} />
                            <span>{retorno.procedimento.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-xs text-[#64748b] mb-1">Data/Hora</p>
                    <p className={`font-semibold ${atrasado ? 'text-red-400' : 'text-white'}`}>
                      {formatarData(retorno.data_hora)} às {formatarHora(retorno.data_hora)}
                    </p>
                    {atrasado && <p className="text-xs text-red-400">{diasAtraso} dia{diasAtraso > 1 ? 's' : ''} atrasado</p>}
                    {!atrasado && diasPara === 0 && <p className="text-xs text-yellow-400">Hoje!</p>}
                    {!atrasado && diasPara > 0 && <p className="text-xs text-[#64748b]">em {diasPara} dia{diasPara > 1 ? 's' : ''}</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEnviarMensagem(retorno)}
                      disabled={!telefone}
                      className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] disabled:text-[#64748b] text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                      title={telefone ? 'Enviar mensagem' : 'Sem telefone'}
                    >
                      <MessageSquare size={16} />
                      Mensagem
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
                  <div className="mt-4 pt-4 border-t border-[#334155]">
                    <p className="text-sm text-[#94a3b8]">{retorno.observacoes}</p>
                  </div>
                )}

                {retorno.valor && (
                  <div className="mt-2">
                    <span className="text-sm text-[#10b981]">R$ {retorno.valor.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
