'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

const VALID_PAGES = ['dashboard', 'conversas', 'pipeline', 'clientes', 'retornos', 'configuracoes'];

export default function Home() {
  const { usuario, clinica, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Pegar página da URL ou usar dashboard como padrão
  const pageFromUrl = searchParams.get('page') || 'dashboard';
  const [currentPage, setCurrentPage] = useState(
    VALID_PAGES.includes(pageFromUrl) ? pageFromUrl : 'dashboard'
  );
  
  // Dados para iniciar conversa a partir de outras telas
  const conversaInicialRef = useRef<{ telefone: string; nome: string } | null>(null);

  // Atualizar página quando URL mudar
  useEffect(() => {
    const pageFromUrl = searchParams.get('page') || 'dashboard';
    if (VALID_PAGES.includes(pageFromUrl) && pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [searchParams]);

  // Função para mudar de página (atualiza URL também)
  const handleSetCurrentPage = (page: string) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page);
    router.push(`?${params.toString()}`, { scroll: false });
  };

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

  // Função para navegar para Conversas e iniciar conversa
  const handleAbrirConversa = (telefone: string, nome: string) => {
    conversaInicialRef.current = { telefone, nome };
    handleSetCurrentPage('conversas');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'conversas':
        return <Conversas conversaInicial={conversaInicialRef.current} onConversaIniciada={() => { conversaInicialRef.current = null; }} />;
      case 'pipeline':
        return <Pipeline onAbrirConversa={handleAbrirConversa} />;
      case 'clientes':
        return <Clientes onAbrirConversa={handleAbrirConversa} />;
      case 'retornos':
        return <Retornos onAbrirConversa={handleAbrirConversa} />;
      case 'configuracoes':
        return <Configuracoes />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--theme-bg)]">
      <Sidebar currentPage={currentPage} setCurrentPage={handleSetCurrentPage} />
      <main className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {renderPage()}
      </main>
    </div>
  );
}