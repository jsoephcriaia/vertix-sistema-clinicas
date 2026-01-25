'use client';

import { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Kanban, 
  Users, 
  Calendar,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversas', label: 'Conversas', icon: MessageSquare },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'retornos', label: 'Retornos', icon: Calendar },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  const { usuario, clinica, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      window.location.reload();
    }
  };

  return (
    <>
      {/* Botão hamburguer mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1e293b] rounded-lg border border-[#334155]"
      >
        <Menu size={24} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-56 bg-[#1e293b] border-r border-[#334155] flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header com logo e botão fechar */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#10b981]">VERTIX</h1>
            <p className="text-xs text-[#64748b] truncate" title={clinica?.nome}>
              {clinica?.nome || 'Painel da Clínica'}
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-[#334155] rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || currentPage.startsWith(item.id);
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#10b981] text-white' 
                        : 'text-[#94a3b8] hover:bg-[#334155] hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Usuário */}
        <div className="p-3 border-t border-[#334155]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold">
              {usuario?.nome?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{usuario?.nome || 'Usuário'}</p>
              <p className="text-xs text-[#64748b] truncate">{usuario?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-[#64748b] hover:text-red-400 hover:bg-[#334155] rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}