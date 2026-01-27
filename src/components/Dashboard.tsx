'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Metricas {
  totalClientes: number;
  clientesAtivos: number;
  clientesVip: number;
  totalLeads: number;
  leadsNovos: number;
  leadsConvertidos: number;
  valorEmNegociacao: number;
  agendamentosEstaSemana: number;
  agendamentosHoje: number;
  agendamentosPendentes: number;
  totalProcedimentos: number;
  faturamentoRealizado: number;
}

interface LeadRecente {
  id: string;
  nome: string;
  procedimento_interesse: string | null;
  etapa: string;
  valor_total: number;
  created_at: string;
}

interface AgendamentoProximo {
  id: string;
  data_hora: string;
  valor: number;
  status: string;
  lead_nome: string;
  lead_telefone: string;
  procedimento_nome: string;
}

export default function Dashboard() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadsRecentes, setLeadsRecentes] = useState<LeadRecente[]>([]);
  const [agendamentosProximos, setAgendamentosProximos] = useState<AgendamentoProximo[]>([]);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchMetricas();
    }
  }, [CLINICA_ID]);

  const fetchMetricas = async () => {
    setLoading(true);

    try {
      // Buscar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('clinica_id', CLINICA_ID);

      // Buscar leads da tabela leads_ia
      const { data: leads } = await supabase
        .from('leads_ia')
        .select('*')
        .eq('clinica_id', CLINICA_ID);

      // Buscar procedimentos ativos
      const { data: procedimentos } = await supabase
        .from('procedimentos')
        .select('*')
        .eq('clinica_id', CLINICA_ID)
        .eq('ativo', true);

      // Buscar lead_procedimentos com valores
      const { data: leadProcedimentos } = await supabase
        .from('lead_procedimentos')
        .select(`
          *,
          lead:leads_ia!inner(id, clinica_id, etapa),
          procedimento:procedimentos(preco)
        `)
        .eq('lead.clinica_id', CLINICA_ID);

      // Buscar agendamentos
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select(`
          *,
          lead:leads_ia(nome, telefone),
          procedimento:procedimentos(nome)
        `)
        .eq('clinica_id', CLINICA_ID)
        .order('data_hora', { ascending: true });

      // Datas para cálculos
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const fimDeHoje = new Date(hoje);
      fimDeHoje.setHours(23, 59, 59, 999);

      const proximaSemana = new Date(hoje);
      proximaSemana.setDate(proximaSemana.getDate() + 7);

      // Processar dados
      const clientesData = clientes || [];
      const leadsData = leads || [];
      const agendamentosData = agendamentos || [];
      const leadProcedimentosData = leadProcedimentos || [];

      // Métricas de clientes
      const totalClientes = clientesData.length;
      const clientesAtivos = clientesData.filter(c => c.status === 'ativo').length;
      const clientesVip = clientesData.filter(c => c.status === 'vip').length;

      // Métricas de leads
      const totalLeads = leadsData.length;
      const leadsNovos = leadsData.filter(l => l.etapa === 'novo').length;
      const leadsConvertidos = leadsData.filter(l => l.etapa === 'convertido').length;

      // Valor em negociação (leads não convertidos/perdidos com procedimentos vinculados)
      const valorEmNegociacao = leadProcedimentosData
        .filter(lp => lp.lead && !['convertido', 'perdido'].includes(lp.lead.etapa))
        .reduce((acc, lp) => {
          const valor = lp.valor_personalizado || lp.procedimento?.preco || 0;
          return acc + Number(valor);
        }, 0);

      // Métricas de agendamentos
      const agendamentosEstaSemana = agendamentosData.filter(a => {
        const dataAgendamento = new Date(a.data_hora);
        return dataAgendamento >= hoje && dataAgendamento <= proximaSemana && a.status !== 'cancelado';
      }).length;

      const agendamentosHoje = agendamentosData.filter(a => {
        const dataAgendamento = new Date(a.data_hora);
        return dataAgendamento >= hoje && dataAgendamento <= fimDeHoje && a.status !== 'cancelado';
      }).length;

      const agendamentosPendentes = agendamentosData.filter(a => 
        a.status === 'agendado'
      ).length;

      // Faturamento realizado (agendamentos com status 'realizado')
      const faturamentoRealizado = agendamentosData
        .filter(a => a.status === 'realizado')
        .reduce((acc, a) => acc + Number(a.valor || 0), 0);

      setMetricas({
        totalClientes,
        clientesAtivos,
        clientesVip,
        totalLeads,
        leadsNovos,
        leadsConvertidos,
        valorEmNegociacao,
        agendamentosEstaSemana,
        agendamentosHoje,
        agendamentosPendentes,
        totalProcedimentos: procedimentos?.length || 0,
        faturamentoRealizado,
      });

      // Leads recentes com valor dos procedimentos vinculados
      const leadsComValor = await Promise.all(
        leadsData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(async (lead) => {
            // Buscar procedimentos vinculados a este lead
            const procedimentosLead = leadProcedimentosData.filter(lp => lp.lead_id === lead.id);
            const valorTotal = procedimentosLead.reduce((acc, lp) => {
              const valor = lp.valor_personalizado || lp.procedimento?.preco || 0;
              return acc + Number(valor);
            }, 0);

            return {
              id: lead.id,
              nome: lead.nome || 'Sem nome',
              procedimento_interesse: lead.procedimento_interesse,
              etapa: lead.etapa,
              valor_total: valorTotal,
              created_at: lead.created_at,
            };
          })
      );
      setLeadsRecentes(leadsComValor);

      // Próximos agendamentos (futuros, não cancelados)
      const proximosAgendamentos = agendamentosData
        .filter(a => {
          const dataAgendamento = new Date(a.data_hora);
          return dataAgendamento >= hoje && a.status !== 'cancelado';
        })
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          data_hora: a.data_hora,
          valor: a.valor || 0,
          status: a.status,
          lead_nome: a.lead?.nome || 'Sem nome',
          lead_telefone: a.lead?.telefone || '',
          procedimento_nome: a.procedimento?.nome || 'Procedimento não especificado',
        }));
      setAgendamentosProximos(proximosAgendamentos);

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarDataHora = (dataHora: string) => {
    const data = new Date(dataHora);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getEtapaLabel = (etapa: string) => {
    const etapas: Record<string, { label: string; cor: string }> = {
      novo: { label: 'Novo', cor: 'bg-blue-500/20 text-blue-500' },
      atendimento: { label: 'Em Atendimento', cor: 'bg-yellow-500/20 text-yellow-500' },
      agendado: { label: 'Agendado', cor: 'bg-purple-500/20 text-purple-500' },
      convertido: { label: 'Convertido', cor: 'bg-green-500/20 text-green-500' },
      perdido: { label: 'Perdido', cor: 'bg-red-500/20 text-red-500' },
    };
    return etapas[etapa] || { label: etapa, cor: 'bg-gray-500/20 text-gray-500' };
  };

  const getStatusAgendamento = (status: string) => {
    const statusMap: Record<string, { label: string; cor: string }> = {
      agendado: { label: 'Agendado', cor: 'bg-blue-500/20 text-blue-500' },
      confirmado: { label: 'Confirmado', cor: 'bg-green-500/20 text-green-500' },
      realizado: { label: 'Realizado', cor: 'bg-emerald-500/20 text-emerald-500' },
      cancelado: { label: 'Cancelado', cor: 'bg-red-500/20 text-red-500' },
      nao_compareceu: { label: 'Não compareceu', cor: 'bg-orange-500/20 text-orange-500' },
    };
    return statusMap[status] || { label: status, cor: 'bg-gray-500/20 text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!metricas) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--theme-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--theme-text-secondary)]">Visão geral da sua clínica</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Clientes */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users size={24} className="text-blue-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Total</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">{metricas.totalClientes}</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Clientes cadastrados</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">{metricas.clientesAtivos} ativos</span>
            <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">{metricas.clientesVip} VIP</span>
          </div>
        </div>

        {/* Em negociação */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign size={24} className="text-green-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">R$ {metricas.valorEmNegociacao.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Em negociação</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">{metricas.leadsNovos} novos</span>
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">{metricas.leadsConvertidos} convertidos</span>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar size={24} className="text-purple-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Agendamentos</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">{metricas.agendamentosEstaSemana}</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Esta semana</p>
          <div className="flex gap-2 mt-2">
            {metricas.agendamentosHoje > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">{metricas.agendamentosHoje} hoje</span>
            )}
            {metricas.agendamentosPendentes > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">{metricas.agendamentosPendentes} pendentes</span>
            )}
          </div>
        </div>

        {/* Faturamento */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <TrendingUp size={24} className="text-cyan-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Faturamento</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">R$ {metricas.faturamentoRealizado.toLocaleString('pt-BR')}</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Total realizado</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-purple-500/20 text-purple-600 px-2 py-0.5 rounded">{metricas.totalProcedimentos} procedimentos</span>
          </div>
        </div>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads Recentes */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[var(--theme-text)]">
            <TrendingUp size={20} className="text-primary" />
            Leads Recentes
          </h2>
          {leadsRecentes.length === 0 ? (
            <p className="text-sm text-center py-4 text-[var(--theme-text-secondary)]">Nenhum lead ainda</p>
          ) : (
            <div className="space-y-3">
              {leadsRecentes.map((lead) => {
                const etapaInfo = getEtapaLabel(lead.etapa);
                return (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--theme-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {lead.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--theme-text)]">{lead.nome}</p>
                        <p className="text-xs text-[var(--theme-text-secondary)]">
                          {lead.procedimento_interesse || 'Interesse não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded ${etapaInfo.cor}`}>
                        {etapaInfo.label}
                      </span>
                      {lead.valor_total > 0 && (
                        <p className="text-sm font-medium text-primary mt-1">
                          R$ {lead.valor_total.toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximos Agendamentos */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[var(--theme-text)]">
            <Calendar size={20} className="text-primary" />
            Próximos Agendamentos
          </h2>
          {agendamentosProximos.length === 0 ? (
            <p className="text-sm text-center py-4 text-[var(--theme-text-secondary)]">Nenhum agendamento próximo</p>
          ) : (
            <div className="space-y-3">
              {agendamentosProximos.map((agendamento) => {
                const { data, hora } = formatarDataHora(agendamento.data_hora);
                const statusInfo = getStatusAgendamento(agendamento.status);
                
                return (
                  <div key={agendamento.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--theme-bg-tertiary)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                        {agendamento.lead_nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--theme-text)]">{agendamento.lead_nome}</p>
                        <p className="text-xs text-[var(--theme-text-secondary)]">{agendamento.procedimento_nome}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--theme-text)]">{data}</p>
                      <p className="text-xs text-[var(--theme-text-secondary)]">{hora}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.cor} mt-1 inline-block`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de agendamentos pendentes */}
      {metricas.agendamentosPendentes > 0 && (
        <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">{metricas.agendamentosPendentes} agendamentos aguardando confirmação</p>
              <p className="text-sm text-[var(--theme-text-secondary)]">Confirme os agendamentos para evitar faltas.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
