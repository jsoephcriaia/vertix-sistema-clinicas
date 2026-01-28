'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, Calendar, TrendingUp, AlertTriangle, Loader2, Percent, UserX, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Metricas {
  totalClientes: number;
  clientesAtivos: number;
  clientesVip: number;
  totalLeads: number;
  leadsNovos: number;
  leadsConvertidos: number;
  leadsPerdidos: number;
  leadsAtendimento: number;
  leadsAgendados: number;
  valorEmNegociacao: number;
  agendamentosEstaSemana: number;
  agendamentosHoje: number;
  agendamentosPendentes: number;
  totalProcedimentos: number;
  faturamentoRealizado: number;
  taxaConversao: number;
  taxaNoShow: number;
  ticketMedio: number;
}

interface LeadRecente {
  id: string;
  nome: string;
  procedimento_interesse: string | null;
  etapa: string;
  valor_total: number;
  created_at: string;
  avatar: string | null;
}

interface AgendamentoProximo {
  id: string;
  data_hora: string;
  valor: number;
  status: string;
  lead_nome: string;
  lead_telefone: string;
  lead_avatar: string | null;
  procedimento_nome: string;
}

interface FaturamentoMensal {
  mes: string;
  valor: number;
}

interface ProcedimentoRanking {
  nome: string;
  quantidade: number;
}

export default function Dashboard() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadsRecentes, setLeadsRecentes] = useState<LeadRecente[]>([]);
  const [agendamentosProximos, setAgendamentosProximos] = useState<AgendamentoProximo[]>([]);
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([]);
  const [procedimentosRanking, setProcedimentosRanking] = useState<ProcedimentoRanking[]>([]);

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

      // Buscar leads da tabela leads_ia (incluindo avatar)
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
        .select('*')
        .eq('clinica_id', CLINICA_ID)
        .order('data_hora', { ascending: true });

      // Buscar procedimentos para nomes
      const { data: procedimentosNomes } = await supabase
        .from('procedimentos')
        .select('id, nome')
        .eq('clinica_id', CLINICA_ID);

      const procedimentosMap: Record<string, string> = {};
      procedimentosNomes?.forEach(p => { procedimentosMap[p.id] = p.nome; });

      // Criar mapa de leads para avatar
      const leadsMap: Record<string, { nome: string; telefone: string; avatar: string | null }> = {};
      leads?.forEach(l => {
        leadsMap[l.id] = { nome: l.nome, telefone: l.telefone, avatar: l.avatar };
      });

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
      const leadsPerdidos = leadsData.filter(l => l.etapa === 'perdido').length;
      const leadsAtendimento = leadsData.filter(l => l.etapa === 'atendimento').length;
      const leadsAgendados = leadsData.filter(l => l.etapa === 'agendado').length;

      // Taxa de conversão
      const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0;

      // Valor em negociação (leads não convertidos/perdidos com procedimentos vinculados)
      const valorEmNegociacao = leadProcedimentosData
        .filter(lp => lp.lead && !['convertido', 'perdido'].includes(lp.lead.etapa))
        .reduce((acc, lp) => {
          const valor = lp.valor_personalizado || lp.procedimento?.preco || 0;
          return acc + Number(valor);
        }, 0);

      // Métricas de agendamentos
      const agendamentosAtivos = agendamentosData.filter(a => a.status !== 'cancelado');

      const agendamentosEstaSemana = agendamentosAtivos.filter(a => {
        const dataAgendamento = new Date(a.data_hora);
        return dataAgendamento >= hoje && dataAgendamento <= proximaSemana;
      }).length;

      const agendamentosHoje = agendamentosAtivos.filter(a => {
        const dataAgendamento = new Date(a.data_hora);
        return dataAgendamento >= hoje && dataAgendamento <= fimDeHoje;
      }).length;

      const agendamentosPendentes = agendamentosData.filter(a =>
        a.status === 'agendado'
      ).length;

      // Taxa de no-show (não compareceu / total que deveria comparecer)
      const agendamentosPassados = agendamentosData.filter(a => {
        const dataAgendamento = new Date(a.data_hora);
        return dataAgendamento < hoje && ['realizado', 'nao_compareceu'].includes(a.status);
      });
      const noShows = agendamentosPassados.filter(a => a.status === 'nao_compareceu').length;
      const taxaNoShow = agendamentosPassados.length > 0 ? (noShows / agendamentosPassados.length) * 100 : 0;

      // Faturamento realizado (agendamentos com status 'realizado')
      const agendamentosRealizados = agendamentosData.filter(a => a.status === 'realizado');
      const faturamentoRealizado = agendamentosRealizados.reduce((acc, a) => acc + Number(a.valor || 0), 0);

      // Ticket médio
      const ticketMedio = agendamentosRealizados.length > 0
        ? faturamentoRealizado / agendamentosRealizados.length
        : 0;

      setMetricas({
        totalClientes,
        clientesAtivos,
        clientesVip,
        totalLeads,
        leadsNovos,
        leadsConvertidos,
        leadsPerdidos,
        leadsAtendimento,
        leadsAgendados,
        valorEmNegociacao,
        agendamentosEstaSemana,
        agendamentosHoje,
        agendamentosPendentes,
        totalProcedimentos: procedimentos?.length || 0,
        faturamentoRealizado,
        taxaConversao,
        taxaNoShow,
        ticketMedio,
      });

      // Faturamento mensal (últimos 6 meses)
      const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const faturamentoPorMes: Record<string, number> = {};

      for (let i = 5; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        faturamentoPorMes[chave] = 0;
      }

      agendamentosRealizados.forEach(a => {
        const data = new Date(a.data_hora);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (faturamentoPorMes[chave] !== undefined) {
          faturamentoPorMes[chave] += Number(a.valor || 0);
        }
      });

      const faturamentoMensalData = Object.entries(faturamentoPorMes).map(([chave, valor]) => {
        const [ano, mes] = chave.split('-');
        return { mes: mesesNomes[parseInt(mes) - 1], valor };
      });
      setFaturamentoMensal(faturamentoMensalData);

      // Ranking de procedimentos
      const procedimentoCount: Record<string, number> = {};
      agendamentosData.forEach(a => {
        if (a.procedimento_id && a.status !== 'cancelado') {
          const nome = procedimentosMap[a.procedimento_id] || 'Outros';
          procedimentoCount[nome] = (procedimentoCount[nome] || 0) + 1;
        }
      });

      const rankingData = Object.entries(procedimentoCount)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
      setProcedimentosRanking(rankingData);

      // Leads recentes com valor dos procedimentos vinculados
      const leadsComValor = await Promise.all(
        leadsData
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(async (lead) => {
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
              avatar: lead.avatar || null,
            };
          })
      );
      setLeadsRecentes(leadsComValor);

      // Próximos agendamentos (futuros, não cancelados)
      const proximosAgendamentos = agendamentosAtivos
        .filter(a => new Date(a.data_hora) >= hoje)
        .slice(0, 5)
        .map(a => {
          const leadInfo = a.lead_id ? leadsMap[a.lead_id] : null;
          return {
            id: a.id,
            data_hora: a.data_hora,
            valor: a.valor || 0,
            status: a.status,
            lead_nome: leadInfo?.nome || 'Sem nome',
            lead_telefone: leadInfo?.telefone || '',
            lead_avatar: leadInfo?.avatar || null,
            procedimento_nome: a.procedimento_id ? procedimentosMap[a.procedimento_id] : 'Procedimento não especificado',
          };
        });
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

  const Avatar = ({ src, nome, corFundo = 'bg-primary' }: { src?: string | null; nome: string; corFundo?: string }) => {
    if (src) {
      return <img src={src} alt={nome} className="w-10 h-10 rounded-full object-cover" />;
    }
    return (
      <div className={`w-10 h-10 rounded-full ${corFundo} flex items-center justify-center text-white font-bold`}>
        {nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Cores para gráfico de leads por etapa
  const CORES_ETAPAS = ['#3b82f6', '#eab308', '#a855f7', '#22c55e', '#ef4444'];

  // Dados para PieChart de leads
  const dadosLeadsPorEtapa = metricas ? [
    { name: 'Novos', value: metricas.leadsNovos, color: '#3b82f6' },
    { name: 'Em Atendimento', value: metricas.leadsAtendimento, color: '#eab308' },
    { name: 'Agendados', value: metricas.leadsAgendados, color: '#a855f7' },
    { name: 'Convertidos', value: metricas.leadsConvertidos, color: '#22c55e' },
    { name: 'Perdidos', value: metricas.leadsPerdidos, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

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

      {/* Cards de métricas - Linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
            <span className="text-xs bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded">{metricas.totalLeads} leads</span>
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

      {/* Cards de métricas - Linha 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Taxa de Conversão */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Percent size={24} className="text-emerald-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Conversão</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">{metricas.taxaConversao.toFixed(1)}%</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Taxa de conversão</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs bg-green-500/20 text-green-600 px-2 py-0.5 rounded">{metricas.leadsConvertidos} convertidos</span>
            <span className="text-xs bg-gray-500/20 text-gray-500 px-2 py-0.5 rounded">{metricas.totalLeads} total</span>
          </div>
        </div>

        {/* Taxa de No-Show */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <UserX size={24} className="text-orange-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">No-Show</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">{metricas.taxaNoShow.toFixed(1)}%</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Não compareceram</p>
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded ${metricas.taxaNoShow <= 10 ? 'bg-green-500/20 text-green-600' : 'bg-orange-500/20 text-orange-600'}`}>
              {metricas.taxaNoShow <= 10 ? 'Bom' : 'Atenção'}
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Receipt size={24} className="text-pink-500" />
            </div>
            <span className="text-xs text-[var(--theme-text-muted)]">Ticket Médio</span>
          </div>
          <p className="text-2xl font-bold text-[var(--theme-text)]">R$ {metricas.ticketMedio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
          <p className="text-sm text-[var(--theme-text-secondary)]">Por atendimento</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Faturamento Mensal */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <h2 className="font-semibold mb-4 text-[var(--theme-text)]">Faturamento Mensal</h2>
          {faturamentoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={faturamentoMensal}>
                <XAxis dataKey="mes" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
                  contentStyle={{ backgroundColor: 'var(--theme-card)', border: '1px solid var(--theme-card-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--theme-text)' }}
                />
                <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8 text-[var(--theme-text-secondary)]">Sem dados de faturamento</p>
          )}
        </div>

        {/* Leads por Etapa */}
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <h2 className="font-semibold mb-4 text-[var(--theme-text)]">Leads por Etapa</h2>
          {dadosLeadsPorEtapa.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={dadosLeadsPorEtapa}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {dadosLeadsPorEtapa.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ backgroundColor: 'var(--theme-card)', border: '1px solid var(--theme-card-border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-[40%] space-y-2">
                {dadosLeadsPorEtapa.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-[var(--theme-text-secondary)]">{item.name}</span>
                    <span className="text-xs font-medium text-[var(--theme-text)] ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-8 text-[var(--theme-text-secondary)]">Sem leads cadastrados</p>
          )}
        </div>
      </div>

      {/* Procedimentos mais agendados */}
      {procedimentosRanking.length > 0 && (
        <div className="rounded-xl p-5 shadow-sm bg-[var(--theme-card)] border border-[var(--theme-card-border)] mb-6">
          <h2 className="font-semibold mb-4 text-[var(--theme-text)]">Procedimentos Mais Agendados</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={procedimentosRanking} layout="vertical">
              <XAxis type="number" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="nome" tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(value: number) => [value, 'Agendamentos']}
                contentStyle={{ backgroundColor: 'var(--theme-card)', border: '1px solid var(--theme-card-border)', borderRadius: '8px' }}
              />
              <Bar dataKey="quantidade" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
                      <Avatar src={lead.avatar} nome={lead.nome} />
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
                      <Avatar src={agendamento.lead_avatar} nome={agendamento.lead_nome} corFundo="bg-purple-500" />
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
