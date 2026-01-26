'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Login from '@/components/Login';
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import Conversas from '@/components/Conversas';
import Pipeline from '@/components/Pipeline';
import Clientes from '@/components/Clientes';
import Retornos from '@/components/Retornos';
import Configuracoes from '@/components/Configuracoes';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { usuario, clinica, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!usuario || !clinica) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'conversas':
        return <Conversas />;
      case 'pipeline':
        return <Pipeline />;
      case 'clientes':
        return <Clientes />;
      case 'retornos':
        return <Retornos />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--theme-bg)]">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {renderPage()}
      </main>
    </div>
  );
}