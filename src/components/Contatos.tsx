'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, X, Save, Loader2, User, MessageSquare, History, Users, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  como_conheceu: string;
  avatar: string | null;
  tipo: 'lead' | 'cliente';
  status?: string;
  created_at: string;
  // Dados calculados
  total_procedimentos: number;
  ultimo_contato: string | null;
}

interface ContatosProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

const opcoesComoConheceu = [
  'Instagram',
  'Facebook',
  'Google',
  'Indicação de amigo',
  'Indicação de cliente',
  'Passou na frente',
  'WhatsApp',
  'Outro',
];

export default function Contatos({ onAbrirConversa }: ContatosProps) {
  const { clinica } = useAuth();
  const { showConfirm, showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Contato | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const [contatoHistorico, setContatoHistorico] = useState<Contato | null>(null);
  const [historicoProcedimentos, setHistoricoProcedimentos] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const novoContato: Contato = {
    id: '',
    nome: '',
    telefone: '',
    email: '',
    observacoes: '',
    como_conheceu: '',
    avatar: null,
    tipo: 'lead',
    created_at: '',
    total_procedimentos: 0,
    ultimo_contato: null,
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchContatos();
    }
  }, [CLINICA_ID]);

  const fetchContatos = async () => {
    setLoading(true);

    // Buscar leads
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads_ia')
      .select('id, nome, telefone, avatar, created_at, como_conheceu')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    // Buscar clientes
    const { data: clientesData, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome, telefone, email, status, observacoes, created_at, como_conheceu')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (leadsError) console.error('Erro ao buscar leads:', leadsError);
    if (clientesError) console.error('Erro ao buscar clientes:', clientesError);

    // Buscar agendamentos para métricas
    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('lead_id, cliente_id, data_hora, status')
      .eq('clinica_id', CLINICA_ID);

    // Criar mapa de telefone de clientes para evitar duplicatas
    const telefonesClientes = new Set(clientesData?.map(c => c.telefone).filter(Boolean) || []);

    // Processar leads (excluindo os que já são clientes pelo telefone)
    const leadsProcessados: Contato[] = (leadsData || [])
      .filter(lead => !telefonesClientes.has(lead.telefone))
      .map(lead => {
        const agLead = agendamentos?.filter(a => a.lead_id === lead.id) || [];
        const ultimoAg = agLead.sort((a, b) =>
          new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
        )[0];

        return {
          id: lead.id,
          nome: lead.nome || 'Sem nome',
          telefone: lead.telefone || '',
          email: '',
          observacoes: '',
          como_conheceu: lead.como_conheceu || '',
          avatar: lead.avatar,
          tipo: 'lead' as const,
          created_at: lead.created_at,
          total_procedimentos: agLead.filter(a => a.status === 'realizado').length,
          ultimo_contato: ultimoAg?.data_hora || lead.created_at,
        };
      });

    // Processar clientes
    const clientesProcessados: Contato[] = (clientesData || []).map(cliente => {
      const agCliente = agendamentos?.filter(a => a.cliente_id === cliente.id) || [];
      const ultimoAg = agCliente.sort((a, b) =>
        new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
      )[0];

      return {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        observacoes: cliente.observacoes || '',
        como_conheceu: cliente.como_conheceu || '',
        avatar: null,
        tipo: 'cliente' as const,
        status: cliente.status,
        created_at: cliente.created_at,
        total_procedimentos: agCliente.filter(a => a.status === 'realizado').length,
        ultimo_contato: ultimoAg?.data_hora || cliente.created_at,
      };
    });

    // Combinar e ordenar por nome
    const todosContatos = [...leadsProcessados, ...clientesProcessados]
      .sort((a, b) => a.nome.localeCompare(b.nome));

    setContatos(todosContatos);
    setLoading(false);
  };

  const handleNew = () => {
    setEditando({ ...novoContato });
    setShowModal(true);
  };

  const handleEdit = (contato: Contato) => {
    setEditando({ ...contato });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    try {
      if (editando.tipo === 'cliente') {
        // Salvar como cliente
        if (editando.id) {
          const { error } = await supabase
            .from('clientes')
            .update({
              nome: editando.nome,
              telefone: editando.telefone,
              email: editando.email,
              observacoes: editando.observacoes,
              como_conheceu: editando.como_conheceu,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editando.id);

          if (error) throw error;
          showToast('Contato atualizado!', 'success');
        } else {
          const { error } = await supabase
            .from('clientes')
            .insert({
              clinica_id: CLINICA_ID,
              nome: editando.nome,
              telefone: editando.telefone,
              email: editando.email,
              observacoes: editando.observacoes,
              como_conheceu: editando.como_conheceu,
              status: 'ativo',
            });

          if (error) throw error;
          showToast('Contato criado como cliente!', 'success');
        }
      } else {
        // Salvar como lead
        if (editando.id) {
          const { error } = await supabase
            .from('leads_ia')
            .update({
              nome: editando.nome,
              telefone: editando.telefone,
              como_conheceu: editando.como_conheceu,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editando.id);

          if (error) throw error;
          showToast('Contato atualizado!', 'success');
        } else {
          const { error } = await supabase
            .from('leads_ia')
            .insert({
              clinica_id: CLINICA_ID,
              nome: editando.nome,
              telefone: editando.telefone,
              como_conheceu: editando.como_conheceu,
              etapa: 'novo',
            });

          if (error) throw error;
          showToast('Contato criado como lead!', 'success');
        }
      }

      setShowModal(false);
      setEditando(null);
      fetchContatos();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar contato', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contato: Contato) => {
    showConfirm(
      `Excluir o contato "${contato.nome}"?`,
      async () => {
        try {
          const tabela = contato.tipo === 'cliente' ? 'clientes' : 'leads_ia';
          const { error } = await supabase
            .from(tabela)
            .delete()
            .eq('id', contato.id);

          if (error) throw error;

          showToast('Contato excluído!', 'success');
          fetchContatos();
        } catch (error) {
          console.error('Erro ao excluir:', error);
          showToast('Erro ao excluir contato', 'error');
        }
      },
      'Excluir contato'
    );
  };

  const handlePromoverParaCliente = async (contato: Contato) => {
    if (contato.tipo === 'cliente') return;

    showConfirm(
      `Transformar "${contato.nome}" em cliente?`,
      async () => {
        try {
          // Criar cliente
          const { error: createError } = await supabase
            .from('clientes')
            .insert({
              clinica_id: CLINICA_ID,
              nome: contato.nome,
              telefone: contato.telefone,
              como_conheceu: contato.como_conheceu,
              status: 'ativo',
            });

          if (createError) throw createError;

          showToast(`${contato.nome} agora é cliente!`, 'success');
          fetchContatos();
        } catch (error) {
          console.error('Erro ao promover:', error);
          showToast('Erro ao transformar em cliente', 'error');
        }
      },
      'Promover para cliente'
    );
  };

  const handleEnviarMensagem = (contato: Contato) => {
    if (!contato.telefone) {
      showToast('Este contato não possui telefone cadastrado', 'warning');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(contato.telefone, contato.nome);
    }
  };

  const handleVerHistorico = async (contato: Contato) => {
    setContatoHistorico(contato);
    setShowHistorico(true);
    setLoadingHistorico(true);

    let query = supabase
      .from('agendamentos')
      .select('id, data_hora, valor, status, tipo, procedimento_id')
      .eq('clinica_id', CLINICA_ID);

    if (contato.tipo === 'cliente') {
      query = query.eq('cliente_id', contato.id);
    } else {
      query = query.eq('lead_id', contato.id);
    }

    const { data: agendamentos } = await query.order('data_hora', { ascending: false });

    if (agendamentos && agendamentos.length > 0) {
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

  const contatosFiltrados = contatos.filter(contato => {
    const matchBusca = contato.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       contato.telefone.includes(busca) ||
                       contato.email.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || contato.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'cliente') {
      return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1"><UserCheck size={10} /> Cliente</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1"><User size={10} /> Lead</span>;
  };

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
      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
        {nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">
            {contatos.length} contatos ({contatos.filter(c => c.tipo === 'lead').length} leads, {contatos.filter(c => c.tipo === 'cliente').length} clientes)
          </p>
        </div>
        <button
          onClick={handleNew}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Contato
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary"
        >
          <option value="todos">Todos</option>
          <option value="lead">Apenas Leads</option>
          <option value="cliente">Apenas Clientes</option>
        </select>
      </div>

      {/* Lista de Contatos */}
      {contatosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-text-muted)]">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum contato encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contatosFiltrados.map((contato) => (
            <div
              key={`${contato.tipo}-${contato.id}`}
              className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5 hover:border-primary transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Avatar e Info Principal */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar src={contato.avatar} nome={contato.nome} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold truncate">{contato.nome}</h3>
                      {getTipoBadge(contato.tipo)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--theme-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Phone size={14} />
                        {contato.telefone || 'Sem telefone'}
                      </span>
                      {contato.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {contato.email}
                        </span>
                      )}
                    </div>
                    {contato.como_conheceu && (
                      <p className="text-xs text-[var(--theme-text-muted)] mt-1">
                        Conheceu por: {contato.como_conheceu}
                      </p>
                    )}
                  </div>
                </div>

                {/* Métricas */}
                <div className="flex flex-wrap gap-6 lg:gap-8">
                  <div className="text-center">
                    <p className="text-xs text-[var(--theme-text-muted)]">Procedimentos</p>
                    <p className="font-semibold">{contato.total_procedimentos}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--theme-text-muted)]">Último Contato</p>
                    <p className="font-semibold">{formatarData(contato.ultimo_contato)}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  {contato.tipo === 'lead' && (
                    <button
                      onClick={() => handlePromoverParaCliente(contato)}
                      className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Transformar em cliente"
                    >
                      <UserCheck size={18} className="text-green-400" />
                    </button>
                  )}
                  <button
                    onClick={() => handleVerHistorico(contato)}
                    className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                    title="Ver histórico"
                  >
                    <History size={18} className="text-purple-400" />
                  </button>
                  <button
                    onClick={() => handleEnviarMensagem(contato)}
                    disabled={!contato.telefone}
                    className="p-2 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                    title={contato.telefone ? 'Enviar mensagem' : 'Sem telefone'}
                  >
                    <MessageSquare size={18} className="text-primary" />
                  </button>
                  <button
                    onClick={() => handleEdit(contato)}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} className="text-[var(--theme-text-muted)]" />
                  </button>
                  <button
                    onClick={() => handleDelete(contato)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} className="text-red-400" />
                  </button>
                </div>
              </div>

              {contato.observacoes && (
                <div className="mt-4 pt-4 border-t border-[var(--theme-card-border)]">
                  <p className="text-sm text-[var(--theme-text-secondary)]">{contato.observacoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editando.id ? 'Editar Contato' : 'Novo Contato'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Telefone</label>
                  <input
                    type="text"
                    value={editando.telefone}
                    onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Email</label>
                  <input
                    type="email"
                    value={editando.email}
                    onChange={(e) => setEditando({ ...editando, email: e.target.value })}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Tipo</label>
                <select
                  value={editando.tipo}
                  onChange={(e) => setEditando({ ...editando, tipo: e.target.value as 'lead' | 'cliente' })}
                  disabled={!!editando.id}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary disabled:opacity-50"
                >
                  <option value="lead">Lead (interessado)</option>
                  <option value="cliente">Cliente</option>
                </select>
                {editando.id && (
                  <p className="text-xs text-[var(--theme-text-muted)] mt-1">
                    Para mudar o tipo, use o botão "Promover para cliente"
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Como conheceu a clínica</label>
                <select
                  value={editando.como_conheceu}
                  onChange={(e) => setEditando({ ...editando, como_conheceu: e.target.value })}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione...</option>
                  {opcoesComoConheceu.map(opcao => (
                    <option key={opcao} value={opcao}>{opcao}</option>
                  ))}
                </select>
              </div>

              {editando.tipo === 'cliente' && (
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Observações</label>
                  <textarea
                    value={editando.observacoes}
                    onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })}
                    rows={3}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    placeholder="Observações sobre o contato..."
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--theme-card-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editando.nome}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistorico && contatoHistorico && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowHistorico(false); setContatoHistorico(null); }}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Histórico</h2>
                <p className="text-sm text-[var(--theme-text-muted)]">{contatoHistorico.nome}</p>
              </div>
              <button
                onClick={() => { setShowHistorico(false); setContatoHistorico(null); }}
                className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg"
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
                <div className="text-center py-12 text-[var(--theme-text-muted)]">
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
                        className="flex items-center justify-between p-4 bg-[var(--theme-input)] rounded-lg border border-[var(--theme-card-border)]"
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
                          <p className="text-sm text-[var(--theme-text-muted)]">
                            {data.toLocaleDateString('pt-BR')} às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded ${statusColors[item.status] || 'bg-gray-500/20 text-gray-400'}`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                          {item.valor && (
                            <p className="text-sm text-primary mt-1">
                              R$ {item.valor.toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Resumo */}
                  <div className="mt-6 pt-4 border-t border-[var(--theme-card-border)]">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {historicoProcedimentos.filter(h => h.status === 'realizado').length}
                        </p>
                        <p className="text-xs text-[var(--theme-text-muted)]">Realizados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">
                          {historicoProcedimentos.filter(h => ['agendado', 'confirmado'].includes(h.status)).length}
                        </p>
                        <p className="text-xs text-[var(--theme-text-muted)]">Pendentes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          R$ {historicoProcedimentos
                            .filter(h => h.status === 'realizado')
                            .reduce((sum, h) => sum + (h.valor || 0), 0)
                            .toLocaleString('pt-BR')}
                        </p>
                        <p className="text-xs text-[var(--theme-text-muted)]">Total Gasto</p>
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
