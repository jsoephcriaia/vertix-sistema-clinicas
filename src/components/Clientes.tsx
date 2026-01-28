'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, DollarSign, Calendar, Star, X, Save, Loader2, User, MessageSquare, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
  observacoes: string;
  avatar: string | null;
  // Dados calculados
  total_gasto: number;
  total_procedimentos: number;
  ultimo_atendimento: string | null;
  proximo_retorno: string | null;
  proximo_procedimento: string | null;
}

interface ClientesProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

export default function Clientes({ onAbrirConversa }: ClientesProps) {
  const { clinica } = useAuth();
  const { showConfirm, showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const [clienteHistorico, setClienteHistorico] = useState<Cliente | null>(null);
  const [historicoProcedimentos, setHistoricoProcedimentos] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const novoCliente: Cliente = {
    id: '',
    nome: '',
    telefone: '',
    email: '',
    status: 'ativo',
    observacoes: '',
    avatar: null,
    total_gasto: 0,
    total_procedimentos: 0,
    ultimo_atendimento: null,
    proximo_retorno: null,
    proximo_procedimento: null,
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchClientes();
    }
  }, [CLINICA_ID]);

  const fetchClientes = async () => {
    setLoading(true);
    
    // Buscar clientes
    const { data: clientesData, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, email, status, observacoes')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
      setLoading(false);
      return;
    }

    if (!clientesData || clientesData.length === 0) {
      setClientes([]);
      setLoading(false);
      return;
    }

    // Buscar agendamentos REALIZADOS para calcular total_gasto, total_procedimentos e ultimo_atendimento
    const { data: agendamentosRealizados } = await supabase
      .from('agendamentos')
      .select('cliente_id, lead_id, valor, data_hora')
      .eq('clinica_id', CLINICA_ID)
      .eq('status', 'realizado');

    // Buscar agendamentos PENDENTES para próximo retorno
    const { data: agendamentosPendentes } = await supabase
      .from('agendamentos')
      .select('cliente_id, lead_id, data_hora, procedimento_id')
      .eq('clinica_id', CLINICA_ID)
      .in('status', ['agendado', 'confirmado'])
      .gte('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true });

    // Buscar leads para mapear lead_id -> cliente (pelo telefone) e pegar avatar
    const { data: leadsData } = await supabase
      .from('leads_ia')
      .select('id, telefone, avatar')
      .eq('clinica_id', CLINICA_ID);

    // Criar mapa de telefone -> lead info (id + avatar)
    const telefoneToLead: Record<string, { id: string; avatar: string | null }> = {};
    leadsData?.forEach(lead => {
      if (lead.telefone) {
        telefoneToLead[lead.telefone] = { id: lead.id, avatar: lead.avatar };
      }
    });

    // Buscar procedimentos para nome
    const procedimentoIds = [...new Set(agendamentosPendentes?.filter(a => a.procedimento_id).map(a => a.procedimento_id) || [])];
    let procedimentosMap: Record<string, string> = {};
    if (procedimentoIds.length > 0) {
      const { data: procsData } = await supabase
        .from('procedimentos')
        .select('id, nome')
        .in('id', procedimentoIds);
      
      if (procsData) {
        procsData.forEach(p => { procedimentosMap[p.id] = p.nome; });
      }
    }

    // Calcular métricas para cada cliente
    const clientesComMetricas = clientesData.map(cliente => {
      // Pegar lead info do cliente pelo telefone
      const leadInfo = cliente.telefone ? telefoneToLead[cliente.telefone] : null;
      const leadId = leadInfo?.id || null;
      const avatar = leadInfo?.avatar || null;

      // Filtrar agendamentos realizados deste cliente (por cliente_id OU lead_id)
      const agRealizados = agendamentosRealizados?.filter(a => 
        a.cliente_id === cliente.id || (leadId && a.lead_id === leadId)
      ) || [];

      // Calcular total gasto e procedimentos
      const total_gasto = agRealizados.reduce((sum, a) => sum + (a.valor || 0), 0);
      const total_procedimentos = agRealizados.length;

      // Último atendimento (mais recente)
      const ultimoAg = agRealizados.sort((a, b) => 
        new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
      )[0];
      const ultimo_atendimento = ultimoAg?.data_hora || null;

      // Próximo retorno (primeiro pendente)
      const proximoAg = agendamentosPendentes?.find(a => 
        a.cliente_id === cliente.id || (leadId && a.lead_id === leadId)
      );
      const proximo_retorno = proximoAg?.data_hora || null;
      const proximo_procedimento = proximoAg?.procedimento_id ? procedimentosMap[proximoAg.procedimento_id] : null;

      return {
        ...cliente,
        avatar,
        total_gasto,
        total_procedimentos,
        ultimo_atendimento,
        proximo_retorno,
        proximo_procedimento,
      };
    });

    setClientes(clientesComMetricas);
    setLoading(false);
  };

  const handleNew = () => {
    setEditando({ ...novoCliente });
    setShowModal(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditando({ ...cliente });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('clientes')
        .update({
          nome: editando.nome,
          telefone: editando.telefone,
          email: editando.email,
          status: editando.status,
          observacoes: editando.observacoes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showToast('Erro ao salvar cliente', 'error');
      } else {
        showToast('Cliente atualizado com sucesso!', 'success');
      }
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          telefone: editando.telefone,
          email: editando.email,
          status: editando.status,
          observacoes: editando.observacoes,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showToast('Erro ao criar cliente', 'error');
      } else {
        showToast('Cliente criado com sucesso!', 'success');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchClientes();
  };

  const handleDelete = async (id: string, nome: string) => {
    showConfirm(
      `Tem certeza que deseja excluir o cliente "${nome}"?`,
      async () => {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir cliente', 'error');
        } else {
          showToast('Cliente excluído com sucesso!', 'success');
          fetchClientes();
        }
      },
      'Excluir cliente'
    );
  };

  const handleEnviarMensagem = (cliente: Cliente) => {
    if (!cliente.telefone) {
      showToast('Este cliente não possui telefone cadastrado', 'warning');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(cliente.telefone, cliente.nome);
    }
  };

  const handleVerHistorico = async (cliente: Cliente) => {
    setClienteHistorico(cliente);
    setShowHistorico(true);
    setLoadingHistorico(true);

    // Pegar lead_id do cliente pelo telefone
    let leadId = null;
    if (cliente.telefone) {
      const { data: leadData } = await supabase
        .from('leads_ia')
        .select('id')
        .eq('telefone', cliente.telefone)
        .eq('clinica_id', CLINICA_ID)
        .single();
      
      leadId = leadData?.id;
    }

    // Buscar todos os agendamentos do cliente
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('id, data_hora, valor, status, tipo, procedimento_id')
      .eq('clinica_id', CLINICA_ID)
      .or(`cliente_id.eq.${cliente.id}${leadId ? `,lead_id.eq.${leadId}` : ''}`)
      .order('data_hora', { ascending: false });

    if (agendamentos && agendamentos.length > 0) {
      // Buscar nomes dos procedimentos
      const procedimentoIds = [...new Set(agendamentos.filter(a => a.procedimento_id).map(a => a.procedimento_id))];
      
      let procedimentosMap: Record<string, string> = {};
      if (procedimentoIds.length > 0) {
        const { data: procsData } = await supabase
          .from('procedimentos')
          .select('id, nome')
          .in('id', procedimentoIds);
        
        if (procsData) {
          procsData.forEach(p => { procedimentosMap[p.id] = p.nome; });
        }
      }

      // Montar lista com nome do procedimento
      const historicoCompleto = agendamentos.map(a => ({
        ...a,
        procedimento_nome: a.procedimento_id ? procedimentosMap[a.procedimento_id] : 'Consulta',
      }));

      setHistoricoProcedimentos(historicoCompleto);
    } else {
      setHistoricoProcedimentos([]);
    }

    setLoadingHistorico(false);
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const clientesFiltrados = clientes.filter(cliente => {
    const matchBusca = cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       cliente.telefone.includes(busca) ||
                       cliente.email.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || cliente.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'vip':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Star size={10} /> VIP</span>;
      case 'ativo':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">Ativo</span>;
      case 'inativo':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Inativo</span>;
      default:
        return null;
    }
  };

  // Componente de Avatar
  const Avatar = ({ src, nome }: { src?: string | null; nome: string }) => {
    if (src) {
      return (
        <img 
          src={src} 
          alt={nome}
          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
        />
      );
    }
    return (
      <div className="w-14 h-14 rounded-full bg-[#10b981] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
        {nome.charAt(0).toUpperCase()}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-[#64748b] text-sm">{clientes.length} clientes cadastrados</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#10b981]"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981]"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="vip">VIP</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Lista de Clientes */}
      {clientesFiltrados.length === 0 ? (
        <div className="text-center py-12 text-[#64748b]">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-[#1e293b] rounded-xl border border-[#334155] p-5 hover:border-[#10b981] transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Avatar e Info Principal */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar src={cliente.avatar} nome={cliente.nome} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{cliente.nome}</h3>
                      {getStatusBadge(cliente.status)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#64748b]">
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {cliente.telefone || 'Sem telefone'}
                      </span>
                      {cliente.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {cliente.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="flex flex-wrap gap-6 lg:gap-8">
                  <div className="text-center">
                    <p className="text-xs text-[#64748b]">Total Gasto</p>
                    <p className="font-semibold text-[#10b981]">
                      R$ {Number(cliente.total_gasto || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748b]">Procedimentos</p>
                    <p className="font-semibold">{cliente.total_procedimentos || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748b]">Último Atend.</p>
                    <p className="font-semibold">{formatarData(cliente.ultimo_atendimento)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748b]">Próx. Retorno</p>
                    <p className={`font-semibold ${cliente.proximo_retorno && new Date(cliente.proximo_retorno) < new Date() ? 'text-red-400' : ''}`}>
                      {formatarData(cliente.proximo_retorno)}
                    </p>
                    {cliente.proximo_procedimento && (
                      <p className="text-xs text-[#64748b]">{cliente.proximo_procedimento}</p>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerHistorico(cliente)}
                    className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                    title="Ver histórico"
                  >
                    <History size={18} className="text-purple-400" />
                  </button>
                  <button
                    onClick={() => handleEnviarMensagem(cliente)}
                    disabled={!cliente.telefone}
                    className="p-2 hover:bg-[#10b981]/20 rounded-lg transition-colors disabled:opacity-50"
                    title={cliente.telefone ? 'Enviar mensagem' : 'Sem telefone'}
                  >
                    <MessageSquare size={18} className="text-[#10b981]" />
                  </button>
                  <button
                    onClick={() => handleEdit(cliente)}
                    className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} className="text-[#64748b]" />
                  </button>
                  <button
                    onClick={() => handleDelete(cliente.id, cliente.nome)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
              </div>

              {cliente.observacoes && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <p className="text-sm text-[#94a3b8]">{cliente.observacoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#64748b] mb-2">Nome *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Telefone</label>
                  <input
                    type="text"
                    value={editando.telefone}
                    onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                    placeholder="+5511999999999"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#64748b] mb-2">Email</label>
                  <input
                    type="email"
                    value={editando.email}
                    onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Status</label>
                <select
                  value={editando.status}
                  onChange={(e) => setEditando({ ...editando, status: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                >
                  <option value="ativo">Ativo</option>
                  <option value="vip">VIP</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Observações</label>
                <textarea
                  value={editando.observacoes}
                  onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Observações sobre o cliente..."
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
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistorico && clienteHistorico && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowHistorico(false); setClienteHistorico(null); }}>
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Histórico de Procedimentos</h2>
                <p className="text-sm text-[#64748b]">{clienteHistorico.nome}</p>
              </div>
              <button
                onClick={() => { setShowHistorico(false); setClienteHistorico(null); }}
                className="p-2 hover:bg-[#334155] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistorico ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-purple-400" />
                </div>
              ) : historicoProcedimentos.length === 0 ? (
                <div className="text-center py-12 text-[#64748b]">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhum procedimento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicoProcedimentos.map((item) => {
                    const data = new Date(item.data_hora);
                    const statusColors: Record<string, string> = {
                      realizado: 'bg-green-500/20 text-green-400',
                      confirmado: 'bg-blue-500/20 text-blue-400',
                      agendado: 'bg-yellow-500/20 text-yellow-400',
                      cancelado: 'bg-red-500/20 text-red-400',
                      nao_compareceu: 'bg-orange-500/20 text-orange-400',
                    };
                    const statusLabels: Record<string, string> = {
                      realizado: 'Realizado',
                      confirmado: 'Confirmado',
                      agendado: 'Agendado',
                      cancelado: 'Cancelado',
                      nao_compareceu: 'Não Compareceu',
                    };

                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-4 bg-[#0f172a] rounded-lg border border-[#334155]"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{item.procedimento_nome}</p>
                            {item.tipo === 'retorno' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                Retorno
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#64748b]">
                            {data.toLocaleDateString('pt-BR')} às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[item.status] || 'bg-gray-500/20 text-gray-400'}`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                          {item.valor && (
                            <p className="text-sm text-[#10b981] mt-1">
                              R$ {item.valor.toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumo */}
                  <div className="mt-6 pt-4 border-t border-[#334155]">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-[#10b981]">
                          {historicoProcedimentos.filter(h => h.status === 'realizado').length}
                        </p>
                        <p className="text-xs text-[#64748b]">Realizados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">
                          {historicoProcedimentos.filter(h => ['agendado', 'confirmado'].includes(h.status)).length}
                        </p>
                        <p className="text-xs text-[#64748b]">Pendentes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[#10b981]">
                          R$ {historicoProcedimentos
                            .filter(h => h.status === 'realizado')
                            .reduce((sum, h) => sum + (h.valor || 0), 0)
                            .toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-[#64748b]">Total Gasto</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
