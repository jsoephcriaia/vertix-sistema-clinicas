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

  // Loading inicial
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  // Não autenticado - mostra login
  if (!usuario || !clinica) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  // Autenticado - mostra painel
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
    <div className="flex h-screen">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {renderPage()}
      </main>
    </div>
  );
}