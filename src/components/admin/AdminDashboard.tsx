'use client';

import { useState, useEffect } from 'react';
import { Building2, CheckCircle, AlertCircle, Clock, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AdminDashboardProps {
  onNavigate: (page: string, clinicaId?: string) => void;
}

interface DashboardStats {
  total: number;
  ativas: number;
  setupPendente: number;
  setupFalho: number;
}

interface ClinicaRecente {
  id: string;
  nome: string;
  status: string;
  chatwoot_setup_status: string;
  created_at: string;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({ total: 0, ativas: 0, setupPendente: 0, setupFalho: 0 });
  const [clinicasRecentes, setClinicasRecentes] = useState<ClinicaRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Carregar estatísticas
      const { data: clinicas } = await supabase
        .from('clinicas')
        .select('id, nome, status, chatwoot_setup_status, created_at')
        .order('created_at', { ascending: false });

      if (clinicas) {
        const total = clinicas.length;
        const ativas = clinicas.filter(c => c.status === 'ativo' || !c.status).length;
        const setupPendente = clinicas.filter(c => c.chatwoot_setup_status === 'pending' || c.chatwoot_setup_status === 'in_progress').length;
        const setupFalho = clinicas.filter(c => c.chatwoot_setup_status === 'failed').length;

        setStats({ total, ativas, setupPendente, setupFalho });
        setClinicasRecentes(clinicas.slice(0, 5));
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">Dashboard</h1>
          <p className="text-[var(--theme-text-muted)] text-sm mt-1">Visão geral do sistema</p>
        </div>
        <button
          onClick={() => onNavigate('criar-clinica')}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Nova Clínica
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{stats.total}</p>
              <p className="text-sm text-[var(--theme-text-muted)]">Total de Clínicas</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{stats.ativas}</p>
              <p className="text-sm text-[var(--theme-text-muted)]">Clínicas Ativas</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Clock size={24} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{stats.setupPendente}</p>
              <p className="text-sm text-[var(--theme-text-muted)]">Setup Pendente</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--theme-text)]">{stats.setupFalho}</p>
              <p className="text-sm text-[var(--theme-text-muted)]">Setup com Falha</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clínicas Recentes */}
      <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)]">
        <div className="p-5 border-b border-[var(--theme-card-border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--theme-text)]">Clínicas Recentes</h2>
          <button
            onClick={() => onNavigate('clinicas')}
            className="text-sm text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>

        {clinicasRecentes.length === 0 ? (
          <div className="p-8 text-center text-[var(--theme-text-muted)]">
            Nenhuma clínica cadastrada ainda
          </div>
        ) : (
          <div className="divide-y divide-[var(--theme-card-border)]">
            {clinicasRecentes.map((clinica) => (
              <div
                key={clinica.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--theme-bg-tertiary)] cursor-pointer transition-colors"
                onClick={() => onNavigate('clinica-detalhe', clinica.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--theme-text)]">{clinica.nome || 'Sem nome'}</p>
                    <p className="text-xs text-[var(--theme-text-muted)]">
                      Criada em {new Date(clinica.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(clinica.chatwoot_setup_status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
