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
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useAlert } from '@/components/Alert';

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
  const { theme, toggleTheme } = useTheme();
  const { showConfirm } = useAlert();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    showConfirm('Tem certeza que deseja sair?', () => {
      logout();
      window.location.reload();
    }, 'Sair do sistema');
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-lg border border-sidebar-hover text-white"
      >
        <Menu size={24} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-56 bg-sidebar border-r border-sidebar-hover flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-sidebar-hover flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">VERTIX</h1>
            <p className="text-xs text-white/70 truncate" title={clinica?.nome}>
              {clinica?.nome || 'Painel da Clínica'}
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-sidebar-hover rounded text-white"
          >
            <X size={20} />
          </button>
        </div>

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
                        ? 'bg-primary text-white' 
                        : 'text-white/80 hover:bg-sidebar-hover hover:text-white'
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

        {/* Toggle de tema */}
        <div className="px-3 pb-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 text-white/80 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-white/30'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        <div className="p-3 border-t border-sidebar-hover">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {usuario?.nome?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{usuario?.nome || 'Usuário'}</p>
              <p className="text-xs text-white/60 truncate">{usuario?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-white/70 hover:text-red-400 hover:bg-sidebar-hover rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}