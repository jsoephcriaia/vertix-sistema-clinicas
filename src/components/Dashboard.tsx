'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Metricas {
  totalClientes: number;
  clientesAtivos: number;
  clientesVip: number;
  totalLeads: number;
  leadsNovos: number;
  leadsConvertidos: number;
  valorPipeline: number;
  retornosAtrasados: number;
  retornosHoje: number;
  retornosSemana: number;
  totalProcedimentos: number;
  faturamentoTotal: number;
}

export default function Dashboard() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadsRecentes, setLeadsRecentes] = useState<any[]>([]);
  const [retornosProximos, setRetornosProximos] = useState<any[]>([]);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchMetricas();
    }
  }, [CLINICA_ID]);

  const fetchMetricas = async () => {
    setLoading(true);

    // Buscar clientes
    const { data: clientes } = await supabase
      .from('clientes')
      .select('*')
      .eq('clinica_id', CLINICA_ID);

    // Buscar pipeline
    const { data: pipeline } = await supabase
      .from('pipeline')
      .select('*')
      .eq('clinica_id', CLINICA_ID);

    // Buscar procedimentos
    const { data: procedimentos } = await supabase
      .from('procedimentos')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .eq('ativo', true);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximaSemana = new Date(hoje);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    // Calcular métricas
    const clientesData = clientes || [];
    const pipelineData = pipeline || [];

    const totalClientes = clientesData.length;
    const clientesAtivos = clientesData.filter(c => c.status === 'ativo').length;
    const clientesVip = clientesData.filter(c => c.status === 'vip').length;

    const totalLeads = pipelineData.length;
    const leadsNovos = pipelineData.filter(l => l.etapa === 'novo').length;
    const leadsConvertidos = pipelineData.filter(l => l.etapa === 'convertido').length;
    const valorPipeline = pipelineData
      .filter(l => l.etapa !== 'convertido')
      .reduce((acc, l) => acc + Number(l.valor_estimado || 0), 0);

    // Retornos
    const clientesComRetorno = clientesData.filter(c => c.proximo_retorno);
    const retornosAtrasados = clientesComRetorno.filter(c => {
      const dataRetorno = new Date(c.proximo_retorno + 'T00:00:00');
      return dataRetorno < hoje;
    }).length;

    const retornosHoje = clientesComRetorno.filter(c => {
      const dataRetorno = new Date(c.proximo_retorno + 'T00:00:00');
      return dataRetorno.toDateString() === hoje.toDateString();
    }).length;

    const retornosSemana = clientesComRetorno.filter(c => {
      const dataRetorno = new Date(c.proximo_retorno + 'T00:00:00');
      return dataRetorno >= hoje && dataRetorno <= proximaSemana;
    }).length;

    const faturamentoTotal = clientesData.reduce((acc, c) => acc + Number(c.total_gasto || 0), 0);
    const totalProcedimentosRealizados = clientesData.reduce((acc, c) => acc + Number(c.total_procedimentos || 0), 0);

    setMetricas({
      totalClientes,
      clientesAtivos,
      clientesVip,
      totalLeads,
      leadsNovos,
      leadsConvertidos,
      valorPipeline,
      retornosAtrasados,
      retornosHoje,
      retornosSemana,
      totalProcedimentos: procedimentos?.length || 0,
      faturamentoTotal,
    });

    // Leads recentes (últimos 5)
    const leadsOrdenados = [...pipelineData]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    setLeadsRecentes(leadsOrdenados);

    // Retornos próximos (próximos 5)
    const retornosOrdenados = clientesComRetorno
      .filter(c => new Date(c.proximo_retorno + 'T00:00:00') >= hoje)
      .sort((a, b) => new Date(a.proximo_retorno).getTime() - new Date(b.proximo_retorno).getTime())
      .slice(0, 5);
    setRetornosProximos(retornosOrdenados);

    setLoading(false);
  };

  const formatarData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getEtapaLabel = (etapa: string) => {
    const etapas: Record<string, string> = {
      novo: 'Novo',
      atendimento: 'Em Atendimento',
      agendado: 'Agendado',
      convertido: 'Convertido',
    };
    return etapas[etapa] || etapa;
  };

  const getEtapaCor = (etapa: string) => {
    const cores: Record<string, string> = {
      novo: 'bg-blue-500',
      atendimento: 'bg-yellow-500',
      agendado: 'bg-purple-500',
      convertido: 'bg-green-500',
    };
    return cores[etapa] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!metricas) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)] text-sm">Visão geral da sua clínica</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users size={24} className="text-blue-500" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Total</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{metricas.totalClientes}</p>
          <p className="text-sm text-[var(--text-secondary)]">Clientes cadastrados</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">{metricas.clientesAtivos} ativos</span>
            <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">{metricas.clientesVip} VIP</span>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign size={24} className="text-green-500" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">R$ {metricas.valorPipeline.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-[var(--text-secondary)]">Em negociação</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">{metricas.leadsNovos} novos</span>
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">{metricas.leadsConvertidos} convertidos</span>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar size={24} className="text-purple-500" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Retornos</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{metricas.retornosSemana}</p>
          <p className="text-sm text-[var(--text-secondary)]">Esta semana</p>
          <div className="flex gap-2 mt-2">
            {metricas.retornosAtrasados > 0 && (
              <span className="text-xs bg-red-500/20 text-red-600 px-2 py-0.5 rounded">{metricas.retornosAtrasados} atrasados</span>
            )}
            {metricas.retornosHoje > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">{metricas.retornosHoje} hoje</span>
            )}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <TrendingUp size={24} className="text-cyan-500" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">Faturamento</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">R$ {metricas.faturamentoTotal.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-[var(--text-secondary)]">Total acumulado</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-purple-500/20 text-purple-600 px-2 py-0.5 rounded">{metricas.totalProcedimentos} procedimentos</span>
          </div>
        </div>
      </div>

      {/* Seções inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Recentes */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <TrendingUp size={20} className="text-[var(--primary)]" />
            Leads Recentes
          </h2>
          {leadsRecentes.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm text-center py-4">Nenhum lead no pipeline</p>
          ) : (
            <div className="space-y-3">
              {leadsRecentes.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold">
                      {lead.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{lead.nome}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{lead.interesse}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${getEtapaCor(lead.etapa)} bg-opacity-20`}>
                      {getEtapaLabel(lead.etapa)}
                    </span>
                    <p className="text-sm font-medium text-[var(--primary)] mt-1">
                      R$ {Number(lead.valor_estimado || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos Retornos */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
            <Calendar size={20} className="text-[var(--primary)]" />
            Próximos Retornos
          </h2>
          {retornosProximos.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-sm text-center py-4">Nenhum retorno agendado</p>
          ) : (
            <div className="space-y-3">
              {retornosProximos.map((cliente) => {
                const dataRetorno = new Date(cliente.proximo_retorno + 'T00:00:00');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diffDias = Math.ceil((dataRetorno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <div key={cliente.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold">
                        {cliente.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{cliente.nome}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{cliente.telefone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{formatarData(cliente.proximo_retorno)}</p>
                      <p className={`text-xs ${diffDias === 0 ? 'text-yellow-600' : 'text-[var(--text-secondary)]'}`}>
                        {diffDias === 0 ? 'Hoje!' : `em ${diffDias} dias`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de retornos atrasados */}
      {metricas.retornosAtrasados > 0 && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-500" />
            <div>
              <p className="font-medium text-red-500">Atenção: {metricas.retornosAtrasados} retornos atrasados!</p>
              <p className="text-sm text-[var(--text-secondary)]">Acesse a tela de Retornos para entrar em contato com esses clientes.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}