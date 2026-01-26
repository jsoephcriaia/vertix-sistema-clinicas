'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, DollarSign, Calendar, Star, X, Save, Loader2, User, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
  total_gasto: number;
  total_procedimentos: number;
  ultimo_atendimento: string | null;
  proximo_retorno: string | null;
  observacoes: string;
}

interface ClientesProps {
  onAbrirConversa?: (telefone: string, nome: string) => void;
}

export default function Clientes({ onAbrirConversa }: ClientesProps) {
  const { clinica } = useAuth();
  const { showConfirm, showSuccess, showError } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);

  const novoCliente: Cliente = {
    id: '',
    nome: '',
    telefone: '',
    email: '',
    status: 'ativo',
    total_gasto: 0,
    total_procedimentos: 0,
    ultimo_atendimento: null,
    proximo_retorno: null,
    observacoes: '',
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchClientes();
    }
  }, [CLINICA_ID]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
    } else {
      setClientes(data || []);
    }
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
          proximo_retorno: editando.proximo_retorno || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        showError('Erro ao salvar cliente');
      } else {
        showSuccess('Cliente atualizado com sucesso!');
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
          proximo_retorno: editando.proximo_retorno || null,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        showError('Erro ao criar cliente');
      } else {
        showSuccess('Cliente criado com sucesso!');
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
          showError('Erro ao excluir cliente');
        } else {
          showSuccess('Cliente excluído com sucesso!');
          fetchClientes();
        }
      },
      'Excluir cliente'
    );
  };

  const handleEnviarMensagem = (cliente: Cliente) => {
    if (!cliente.telefone) {
      showError('Este cliente não possui telefone cadastrado');
      return;
    }

    if (onAbrirConversa) {
      onAbrirConversa(cliente.telefone, cliente.nome);
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
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
                  <div className="w-14 h-14 rounded-full bg-[#10b981] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {cliente.nome.charAt(0)}
                  </div>
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
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                    placeholder="(11) 99999-9999"
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

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm text-[#64748b] mb-2">Próximo Retorno</label>
                  <input
                    type="date"
                    value={editando.proximo_retorno || ''}
                    onChange={(e) => setEditando({ ...editando, proximo_retorno: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  />
                </div>
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
    </div>
  );
}
