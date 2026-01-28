'use client';

import { useState, useEffect } from 'react';
import { Building2, Search, Plus, CheckCircle, AlertCircle, Clock, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClinicasListProps {
  onNavigate: (page: string, clinicaId?: string) => void;
}

interface Clinica {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  status: string;
  chatwoot_setup_status: string;
  chatwoot_account_id?: string;
  created_at: string;
}

export default function ClinicasList({ onNavigate }: ClinicasListProps) {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [filteredClinicas, setFilteredClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  useEffect(() => {
    loadClinicas();
  }, []);

  useEffect(() => {
    filterClinicas();
  }, [searchTerm, statusFilter, clinicas]);

  const loadClinicas = async () => {
    try {
      const { data } = await supabase
        .from('clinicas')
        .select('id, nome, email, telefone, status, chatwoot_setup_status, chatwoot_account_id, created_at')
        .order('created_at', { ascending: false });

      if (data) {
        setClinicas(data);
      }
    } catch (error) {
      console.error('Erro ao carregar clínicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClinicas = () => {
    let filtered = [...clinicas];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.nome?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.telefone?.includes(term)
      );
    }

    if (statusFilter !== 'todos') {
      if (statusFilter === 'setup-pendente') {
        filtered = filtered.filter(c => c.chatwoot_setup_status === 'pending' || c.chatwoot_setup_status === 'in_progress');
      } else if (statusFilter === 'setup-falho') {
        filtered = filtered.filter(c => c.chatwoot_setup_status === 'failed');
      } else if (statusFilter === 'setup-completo') {
        filtered = filtered.filter(c => c.chatwoot_setup_status === 'completed');
      } else if (statusFilter === 'ativo') {
        filtered = filtered.filter(c => c.status === 'ativo' || !c.status);
      } else if (statusFilter === 'inativo') {
        filtered = filtered.filter(c => c.status === 'inativo');
      }
    }

    setFilteredClinicas(filtered);
  };

  const getStatusBadge = (setupStatus: string) => {
    switch (setupStatus) {
      case 'completed':
        return <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Completo</span>;
      case 'failed':
        return <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Falhou</span>;
      case 'in_progress':
        return <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Em Progresso</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 flex items-center gap-1"><Clock size={12} /> Pendente</span>;
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">Clínicas</h1>
          <p className="text-[var(--theme-text-muted)] text-sm mt-1">Gerencie todas as clínicas do sistema</p>
        </div>
        <button
          onClick={() => onNavigate('criar-clinica')}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Clínica
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg focus:outline-none focus:border-primary text-[var(--theme-text)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg focus:outline-none focus:border-primary text-[var(--theme-text)]"
          >
            <option value="todos">Todos os status</option>
            <option value="setup-completo">Setup Completo</option>
            <option value="setup-pendente">Setup Pendente</option>
            <option value="setup-falho">Setup com Falha</option>
            <option value="ativo">Ativas</option>
            <option value="inativo">Inativas</option>
          </select>
        </div>
      </div>

      {/* Lista de Clínicas */}
      <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)]">
        {filteredClinicas.length === 0 ? (
          <div className="p-8 text-center text-[var(--theme-text-muted)]">
            {searchTerm || statusFilter !== 'todos' ? 'Nenhuma clínica encontrada com os filtros aplicados' : 'Nenhuma clínica cadastrada ainda'}
          </div>
        ) : (
          <div className="divide-y divide-[var(--theme-card-border)]">
            {filteredClinicas.map((clinica) => (
              <div
                key={clinica.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
                onClick={() => onNavigate('clinica-detalhe', clinica.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--theme-text)]">{clinica.nome || 'Sem nome'}</p>
                    <div className="flex items-center gap-3 text-sm text-[var(--theme-text-muted)]">
                      {clinica.email && <span>{clinica.email}</span>}
                      {clinica.telefone && <span>{clinica.telefone}</span>}
                    </div>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-1">
                      Criada em {new Date(clinica.created_at).toLocaleDateString('pt-BR')}
                      {clinica.chatwoot_account_id && <span className="ml-2">| Chatwoot ID: {clinica.chatwoot_account_id}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(clinica.chatwoot_setup_status)}
                  <ChevronRight size={20} className="text-[var(--theme-text-muted)]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contador */}
      <p className="text-sm text-[var(--theme-text-muted)] mt-4">
        Mostrando {filteredClinicas.length} de {clinicas.length} clínicas
      </p>
    </div>
  );
}
