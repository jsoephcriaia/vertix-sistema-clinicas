'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, User, CheckCircle, AlertCircle, Clock, Loader2, RefreshCw, MessageSquare, Calendar, Power, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/adminAuth';

interface ClinicaDetailProps {
  clinicaId: string | null;
  onNavigate: (page: string) => void;
}

interface Clinica {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  status: string;
  chatwoot_setup_status: string;
  chatwoot_setup_error?: string;
  chatwoot_url?: string;
  chatwoot_account_id?: string;
  chatwoot_inbox_id?: string;
  uazapi_instance_token?: string;
  google_calendar_connected?: boolean;
  created_at: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
}

export default function ClinicaDetail({ clinicaId, onNavigate }: ClinicaDetailProps) {
  const { admin } = useAdminAuth();
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (clinicaId) {
      loadClinica();
    }
  }, [clinicaId]);

  const loadClinica = async () => {
    if (!clinicaId) return;

    try {
      // Carregar clínica
      const { data: clinicaData } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', clinicaId)
        .single();

      if (clinicaData) {
        setClinica(clinicaData);
      }

      // Carregar usuários
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo, ativo')
        .eq('clinica_id', clinicaId);

      if (usuariosData) {
        setUsuarios(usuariosData);
      }
    } catch (error) {
      console.error('Erro ao carregar clínica:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!clinica) return;

    const isActive = clinica.status === 'ativo' || !clinica.status;
    const action = isActive ? 'desativar' : 'ativar';
    const confirmMessage = isActive
      ? 'Tem certeza que deseja DESATIVAR esta clínica? Os usuários perderão acesso e o WhatsApp será desconectado.'
      : 'Tem certeza que deseja ATIVAR esta clínica?';

    if (!confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clinicas/${clinicaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminId: admin?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar clínica');
      }

      alert(data.message);
      loadClinica();
    } catch (error) {
      console.error('Erro ao atualizar clínica:', error);
      alert(error instanceof Error ? error.message : 'Erro ao atualizar clínica');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!clinica || deleteConfirmText !== clinica.nome) {
      alert('Digite o nome da clínica corretamente para confirmar a exclusão');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/clinicas/${clinicaId}?adminId=${admin?.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir clínica');
      }

      alert(data.message);
      onNavigate('clinicas');
    } catch (error) {
      console.error('Erro ao excluir clínica:', error);
      alert(error instanceof Error ? error.message : 'Erro ao excluir clínica');
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadge = (setupStatus: string) => {
    switch (setupStatus) {
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400 flex items-center gap-1"><CheckCircle size={14} /> Completo</span>;
      case 'failed':
        return <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-400 flex items-center gap-1"><AlertCircle size={14} /> Falhou</span>;
      case 'in_progress':
        return <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Loader2 size={14} className="animate-spin" /> Em Progresso</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 flex items-center gap-1"><Clock size={14} /> Pendente</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!clinica) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--theme-text-muted)]">Clínica não encontrada</p>
        <button
          onClick={() => onNavigate('clinicas')}
          className="mt-4 text-primary hover:underline"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => onNavigate('clinicas')}
          className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">{clinica.nome || 'Sem nome'}</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Detalhes da clínica</p>
        </div>
        <button
          onClick={loadClinica}
          className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <h2 className="font-semibold text-[var(--theme-text)]">Informações da Clínica</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Nome</p>
                <p className="text-[var(--theme-text)]">{clinica.nome || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Email</p>
                <p className="text-[var(--theme-text)]">{clinica.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Telefone</p>
                <p className="text-[var(--theme-text)]">{clinica.telefone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Cidade/Estado</p>
                <p className="text-[var(--theme-text)]">
                  {clinica.cidade && clinica.estado ? `${clinica.cidade}/${clinica.estado}` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Data de Criação</p>
                <p className="text-[var(--theme-text)]">
                  {new Date(clinica.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--theme-text-muted)]">Status</p>
                <span className={`px-2 py-1 rounded text-xs ${
                  clinica.status === 'ativo' || !clinica.status
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {clinica.status === 'ativo' || !clinica.status ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>

          {/* Usuários */}
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <User size={20} className="text-blue-400" />
              </div>
              <h2 className="font-semibold text-[var(--theme-text)]">Usuários ({usuarios.length})</h2>
            </div>

            {usuarios.length === 0 ? (
              <p className="text-[var(--theme-text-muted)] text-center py-4">Nenhum usuário cadastrado</p>
            ) : (
              <div className="space-y-3">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-3 bg-[var(--theme-bg-tertiary)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                        {usuario.nome?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--theme-text)]">{usuario.nome}</p>
                        <p className="text-xs text-[var(--theme-text-muted)]">{usuario.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--theme-text-muted)]">{usuario.cargo}</span>
                      <span className={`w-2 h-2 rounded-full ${usuario.ativo ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Status Chatwoot */}
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare size={20} className="text-purple-400" />
              </div>
              <h2 className="font-semibold text-[var(--theme-text)]">Chatwoot</h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--theme-text-muted)]">Status:</span>
                {getStatusBadge(clinica.chatwoot_setup_status)}
              </div>

              {clinica.chatwoot_setup_error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm">
                  <strong>Erro:</strong> {clinica.chatwoot_setup_error}
                </div>
              )}

              {clinica.chatwoot_account_id && (
                <div>
                  <p className="text-sm text-[var(--theme-text-muted)]">Account ID:</p>
                  <p className="text-[var(--theme-text)]">{clinica.chatwoot_account_id}</p>
                </div>
              )}

              {clinica.chatwoot_inbox_id && (
                <div>
                  <p className="text-sm text-[var(--theme-text-muted)]">Inbox ID:</p>
                  <p className="text-[var(--theme-text)]">{clinica.chatwoot_inbox_id}</p>
                </div>
              )}

              {clinica.chatwoot_url && (
                <div>
                  <p className="text-sm text-[var(--theme-text-muted)]">URL:</p>
                  <p className="text-[var(--theme-text)] text-sm truncate">{clinica.chatwoot_url}</p>
                </div>
              )}
            </div>
          </div>

          {/* Integrações */}
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
            <h2 className="font-semibold text-[var(--theme-text)] mb-4">Integrações</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--theme-bg-tertiary)] rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-green-400" />
                  <span className="text-sm text-[var(--theme-text)]">WhatsApp</span>
                </div>
                {clinica.uazapi_instance_token ? (
                  <CheckCircle size={18} className="text-green-400" />
                ) : (
                  <Clock size={18} className="text-[var(--theme-text-muted)]" />
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-[var(--theme-bg-tertiary)] rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-blue-400" />
                  <span className="text-sm text-[var(--theme-text)]">Google Calendar</span>
                </div>
                {clinica.google_calendar_connected ? (
                  <CheckCircle size={18} className="text-green-400" />
                ) : (
                  <Clock size={18} className="text-[var(--theme-text-muted)]" />
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
            <h2 className="font-semibold text-[var(--theme-text)] mb-4">Ações</h2>

            <div className="space-y-3">
              {/* Botão Ativar/Desativar */}
              <button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  clinica.status === 'ativo' || !clinica.status
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                }`}
              >
                {actionLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Power size={18} />
                )}
                {clinica.status === 'ativo' || !clinica.status ? 'Desativar Clínica' : 'Ativar Clínica'}
              </button>

              {/* Botão Excluir */}
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
              >
                <Trash2 size={18} />
                Excluir Clínica
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--theme-text)]">Excluir Clínica</h3>
                <p className="text-sm text-[var(--theme-text-muted)]">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">
                <strong>Atenção:</strong> Ao excluir esta clínica, todos os dados serão removidos permanentemente:
              </p>
              <ul className="text-sm text-red-400 mt-2 list-disc list-inside">
                <li>Usuários e acessos</li>
                <li>Leads e contatos</li>
                <li>Agendamentos</li>
                <li>Procedimentos e configurações</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                Digite <strong className="text-[var(--theme-text)]">{clinica.nome}</strong> para confirmar:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Nome da clínica"
                className="w-full px-4 py-2 bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg focus:outline-none focus:border-red-500 text-[var(--theme-text)]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--theme-bg-tertiary)] text-[var(--theme-text)] hover:bg-[var(--theme-input)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading || deleteConfirmText !== clinica.nome}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
