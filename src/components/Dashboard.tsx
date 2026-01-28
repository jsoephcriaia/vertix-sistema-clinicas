'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, Users, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Metricas {
  faturamentoRealizado: number;
  faturamentoMesAnterior: number;
  totalAgendamentos: number;
  agendamentosMesAnterior: number;
  totalLeads: number;
  leadsMesAnterior: number;
  taxaConversao: number;
  taxaConversaoMesAnterior: number;
}

interface LeadRecente {
  id: string;
  nome: string;
  procedimento: string;
  etapa: string;
  valor: number;
  data: string;
  avatar: string | null;
}

interface FaturamentoMensal {
  mes: string;
  valor: number;
}

export default function Dashboard() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadsRecentes, setLeadsRecentes] = useState<LeadRecente[]>([]);
  const [faturamentoMensal, setFaturamentoMensal] = useState<FaturamentoMensal[]>([]);
  const [leadsPorEtapa, setLeadsPorEtapa] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    if (CLINICA_ID) {
      fetchMetricas();
    }
  }, [CLINICA_ID]);

  const fetchMetricas = async () => {
    setLoading(true);

    try {
      const hoje = new Date();
      const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      // Buscar leads
      const { data: leads } = await supabase
        .from('leads_ia')
        .select('*')
        .eq('clinica_id', CLINICA_ID);

      // Buscar agendamentos
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('clinica_id', CLINICA_ID);

      // Buscar lead_procedimentos
      const { data: leadProcedimentos } = await supabase
        .from('lead_procedimentos')
        .select(`*, procedimento:procedimentos(nome, preco)`)
        .eq('clinica_id', CLINICA_ID);

      const leadsData = leads || [];
      const agendamentosData = agendamentos || [];

      // Faturamento
      const agendamentosRealizados = agendamentosData.filter(a => a.status === 'realizado');
      const faturamentoRealizado = agendamentosRealizados.reduce((acc, a) => acc + Number(a.valor || 0), 0);

      const faturamentoMesAnterior = agendamentosRealizados
        .filter(a => {
          const data = new Date(a.data_hora);
          return data >= inicioMesAnterior && data <= fimMesAnterior;
        })
        .reduce((acc, a) => acc + Number(a.valor || 0), 0);

      // Agendamentos
      const totalAgendamentos = agendamentosData.filter(a => a.status !== 'cancelado').length;
      const agendamentosMesAnterior = agendamentosData.filter(a => {
        const data = new Date(a.data_hora);
        return data >= inicioMesAnterior && data <= fimMesAnterior && a.status !== 'cancelado';
      }).length;

      // Leads
      const totalLeads = leadsData.length;
      const leadsMesAnterior = leadsData.filter(l => {
        const data = new Date(l.created_at);
        return data >= inicioMesAnterior && data <= fimMesAnterior;
      }).length;

      const leadsConvertidos = leadsData.filter(l => l.etapa === 'convertido').length;
      const leadsConvertidosMesAnterior = leadsData.filter(l => {
        const data = new Date(l.updated_at);
        return l.etapa === 'convertido' && data >= inicioMesAnterior && data <= fimMesAnterior;
      }).length;

      const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0;
      const taxaConversaoMesAnterior = leadsMesAnterior > 0 ? (leadsConvertidosMesAnterior / leadsMesAnterior) * 100 : 0;

      setMetricas({
        faturamentoRealizado,
        faturamentoMesAnterior,
        totalAgendamentos,
        agendamentosMesAnterior,
        totalLeads,
        leadsMesAnterior,
        taxaConversao,
        taxaConversaoMesAnterior,
      });

      // Leads por etapa para PieChart
      const etapasCount: Record<string, number> = {
        novo: 0,
        atendimento: 0,
        agendado: 0,
        convertido: 0,
        perdido: 0,
      };
      leadsData.forEach(l => {
        if (etapasCount[l.etapa] !== undefined) {
          etapasCount[l.etapa]++;
        }
      });

      const etapasData = [
        { name: 'Novos', value: etapasCount.novo, color: '#3b82f6' },
        { name: 'Atendimento', value: etapasCount.atendimento, color: '#f59e0b' },
        { name: 'Agendados', value: etapasCount.agendado, color: '#8b5cf6' },
        { name: 'Convertidos', value: etapasCount.convertido, color: '#10b981' },
        { name: 'Perdidos', value: etapasCount.perdido, color: '#ef4444' },
      ].filter(d => d.value > 0);
      setLeadsPorEtapa(etapasData);

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
        const [, mes] = chave.split('-');
        return { mes: mesesNomes[parseInt(mes) - 1], valor };
      });
      setFaturamentoMensal(faturamentoMensalData);

      // Leads recentes
      const leadsRecentesData = leadsData
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6)
        .map(lead => {
          const procedimentosLead = (leadProcedimentos || []).filter(lp => lp.lead_id === lead.id);
          const valorTotal = procedimentosLead.reduce((acc, lp) => {
            return acc + Number(lp.valor_personalizado || lp.procedimento?.preco || 0);
          }, 0);
          const procedimentoNome = procedimentosLead[0]?.procedimento?.nome || lead.procedimento_interesse || '-';

          return {
            id: lead.id,
            nome: lead.nome || 'Sem nome',
            procedimento: procedimentoNome,
            etapa: lead.etapa,
            valor: valorTotal,
            data: new Date(lead.created_at).toLocaleDateString('pt-BR'),
            avatar: lead.avatar,
          };
        });
      setLeadsRecentes(leadsRecentesData);

    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const getEtapaBadge = (etapa: string) => {
    const etapas: Record<string, { label: string; cor: string }> = {
      novo: { label: 'Novo', cor: 'bg-blue-500/10 text-blue-500' },
      atendimento: { label: 'Atendimento', cor: 'bg-amber-500/10 text-amber-500' },
      agendado: { label: 'Agendado', cor: 'bg-purple-500/10 text-purple-500' },
      convertido: { label: 'Convertido', cor: 'bg-emerald-500/10 text-emerald-500' },
      perdido: { label: 'Perdido', cor: 'bg-red-500/10 text-red-500' },
    };
    return etapas[etapa] || { label: etapa, cor: 'bg-gray-500/10 text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!metricas) return null;

  const variacaoFaturamento = calcularVariacao(metricas.faturamentoRealizado, metricas.faturamentoMesAnterior);
  const variacaoAgendamentos = calcularVariacao(metricas.totalAgendamentos, metricas.agendamentosMesAnterior);
  const variacaoLeads = calcularVariacao(metricas.totalLeads, metricas.leadsMesAnterior);
  const variacaoConversao = metricas.taxaConversao - metricas.taxaConversaoMesAnterior;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--theme-text)]">Dashboard</h1>
        <p className="text-[var(--theme-text-secondary)]">Visão geral da sua clínica</p>
      </div>

      {/* KPIs - 4 cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[var(--theme-text-secondary)] text-sm font-medium">Faturamento</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <DollarSign size={20} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--theme-text)] mb-1">
            R$ {metricas.faturamentoRealizado.toLocaleString('pt-BR')}
          </p>
          <div className="flex items-center gap-1">
            {variacaoFaturamento >= 0 ? (
              <ArrowUpRight size={16} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={16} className="text-red-500" />
            )}
            <span className={`text-sm ${variacaoFaturamento >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variacaoFaturamento >= 0 ? '+' : ''}{variacaoFaturamento.toFixed(1)}%
            </span>
            <span className="text-[var(--theme-text-muted)] text-sm">vs mês anterior</span>
          </div>
        </div>

        {/* Agendamentos */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[var(--theme-text-secondary)] text-sm font-medium">Agendamentos</span>
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Calendar size={20} className="text-purple-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--theme-text)] mb-1">
            {metricas.totalAgendamentos}
          </p>
          <div className="flex items-center gap-1">
            {variacaoAgendamentos >= 0 ? (
              <ArrowUpRight size={16} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={16} className="text-red-500" />
            )}
            <span className={`text-sm ${variacaoAgendamentos >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variacaoAgendamentos >= 0 ? '+' : ''}{variacaoAgendamentos.toFixed(1)}%
            </span>
            <span className="text-[var(--theme-text-muted)] text-sm">vs mês anterior</span>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[var(--theme-text-secondary)] text-sm font-medium">Total de Leads</span>
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Users size={20} className="text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--theme-text)] mb-1">
            {metricas.totalLeads}
          </p>
          <div className="flex items-center gap-1">
            {variacaoLeads >= 0 ? (
              <ArrowUpRight size={16} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={16} className="text-red-500" />
            )}
            <span className={`text-sm ${variacaoLeads >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variacaoLeads >= 0 ? '+' : ''}{variacaoLeads.toFixed(1)}%
            </span>
            <span className="text-[var(--theme-text-muted)] text-sm">vs mês anterior</span>
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[var(--theme-text-secondary)] text-sm font-medium">Conversão</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <TrendingUp size={20} className="text-cyan-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--theme-text)] mb-1">
            {metricas.taxaConversao.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1">
            {variacaoConversao >= 0 ? (
              <ArrowUpRight size={16} className="text-emerald-500" />
            ) : (
              <ArrowDownRight size={16} className="text-red-500" />
            )}
            <span className={`text-sm ${variacaoConversao >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variacaoConversao >= 0 ? '+' : ''}{variacaoConversao.toFixed(1)}pp
            </span>
            <span className="text-[var(--theme-text-muted)] text-sm">vs mês anterior</span>
          </div>
        </div>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Faturamento Mensal - ocupa 3 colunas */}
        <div className="lg:col-span-3 bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-[var(--theme-text)]">Faturamento Mensal</h2>
            <span className="text-sm text-[var(--theme-text-muted)]">Últimos 6 meses</span>
          </div>
          {faturamentoMensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={faturamentoMensal} barSize={40}>
                <XAxis
                  dataKey="mes"
                  tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--theme-text-secondary)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
                  contentStyle={{
                    backgroundColor: 'var(--theme-card)',
                    border: '1px solid var(--theme-card-border)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  cursor={{ fill: 'var(--theme-card-border)', opacity: 0.3 }}
                />
                <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-[var(--theme-text-muted)]">
              Sem dados de faturamento
            </div>
          )}
        </div>

        {/* Leads por Etapa - ocupa 2 colunas */}
        <div className="lg:col-span-2 bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl p-6">
          <h2 className="font-semibold text-[var(--theme-text)] mb-6">Leads por Etapa</h2>
          {leadsPorEtapa.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={leadsPorEtapa}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leadsPorEtapa.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'var(--theme-card)',
                      border: '1px solid var(--theme-card-border)',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full">
                {leadsPorEtapa.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[var(--theme-text-secondary)] truncate">{item.name}</span>
                    <span className="text-sm font-medium text-[var(--theme-text)] ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-[var(--theme-text-muted)]">
              Sem leads cadastrados
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Leads Recentes */}
      <div className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[var(--theme-card-border)]">
          <h2 className="font-semibold text-[var(--theme-text)]">Leads Recentes</h2>
        </div>

        {leadsRecentes.length === 0 ? (
          <div className="p-8 text-center text-[var(--theme-text-muted)]">
            Nenhum lead cadastrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)]">
                  <th className="text-left py-4 px-6 text-sm font-medium text-[var(--theme-text-muted)]">Cliente</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[var(--theme-text-muted)]">Procedimento</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[var(--theme-text-muted)]">Data</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-[var(--theme-text-muted)]">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-[var(--theme-text-muted)]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {leadsRecentes.map((lead) => {
                  const etapaInfo = getEtapaBadge(lead.etapa);
                  return (
                    <tr key={lead.id} className="border-b border-[var(--theme-card-border)] last:border-0 hover:bg-[var(--theme-bg-tertiary)] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {lead.avatar ? (
                            <img src={lead.avatar} alt={lead.nome} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                              {lead.nome.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-[var(--theme-text)]">{lead.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[var(--theme-text-secondary)]">{lead.procedimento}</td>
                      <td className="py-4 px-6 text-[var(--theme-text-secondary)]">{lead.data}</td>
                      <td className="py-4 px-6">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${etapaInfo.cor}`}>
                          {etapaInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-[var(--theme-text)]">
                        {lead.valor > 0 ? `R$ ${lead.valor.toLocaleString('pt-BR')}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
