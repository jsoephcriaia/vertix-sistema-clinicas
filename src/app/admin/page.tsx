'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/adminAuth';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import ClinicasList from '@/components/admin/ClinicasList';
import ClinicaCreate from '@/components/admin/ClinicaCreate';
import ClinicaDetail from '@/components/admin/ClinicaDetail';
import { Loader2 } from 'lucide-react';

const VALID_PAGES = ['dashboard', 'clinicas', 'criar-clinica', 'clinica-detalhe'];

export default function AdminPage() {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pageFromUrl = searchParams.get('page') || 'dashboard';
  const clinicaIdFromUrl = searchParams.get('clinica_id') || null;

  const [currentPage, setCurrentPage] = useState(
    VALID_PAGES.includes(pageFromUrl) ? pageFromUrl : 'dashboard'
  );

  useEffect(() => {
    const pageFromUrl = searchParams.get('page') || 'dashboard';
    if (VALID_PAGES.includes(pageFromUrl) && pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [searchParams, currentPage]);

  const handleSetCurrentPage = (page: string, clinicaId?: string) => {
    setCurrentPage(page);
    const params = new URLSearchParams();
    params.set('page', page);
    if (clinicaId) {
      params.set('clinica_id', clinicaId);
    }
    router.push(`/admin?${params.toString()}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) {
    return <AdminLogin onSuccess={() => window.location.reload()} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard onNavigate={handleSetCurrentPage} />;
      case 'clinicas':
        return <ClinicasList onNavigate={handleSetCurrentPage} />;
      case 'criar-clinica':
        return <ClinicaCreate onNavigate={handleSetCurrentPage} />;
      case 'clinica-detalhe':
        return <ClinicaDetail clinicaId={clinicaIdFromUrl} onNavigate={handleSetCurrentPage} />;
      default:
        return <AdminDashboard onNavigate={handleSetCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--theme-bg)]">
      <AdminSidebar currentPage={currentPage} setCurrentPage={handleSetCurrentPage} />
      <main className="flex-1 overflow-auto p-4 lg:p-6 pt-16 lg:pt-6">
        {renderPage()}
      </main>
    </div>
  );
}
