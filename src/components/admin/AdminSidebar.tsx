'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Shield
} from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuth';
import { useTheme } from '@/lib/theme';
import { useAlert } from '@/components/Alert';

interface AdminSidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clinicas', label: 'Clínicas', icon: Building2 },
];

export default function AdminSidebar({ currentPage, setCurrentPage }: AdminSidebarProps) {
  const { admin, logout } = useAdminAuth();
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border bg-[var(--theme-sidebar)] border-[var(--theme-sidebar-border)] text-[var(--theme-sidebar-text)]"
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
        w-56 bg-[var(--theme-sidebar)] border-r border-[var(--theme-sidebar-border)] flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-[var(--theme-sidebar-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <div>
              <h1 className="text-xl font-bold text-primary">VERTIX</h1>
              <p className="text-xs text-[var(--theme-sidebar-text-muted)]">
                Painel Admin
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-[var(--theme-sidebar-hover)] rounded text-[var(--theme-sidebar-text)]"
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
                        : 'text-[var(--theme-sidebar-text-muted)] hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-sidebar-text)]'
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
            className="w-full flex items-center justify-between px-3 py-2 text-[var(--theme-sidebar-text-muted)] hover:bg-[var(--theme-sidebar-hover)] hover:text-[var(--theme-sidebar-text)] rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
              <span className="text-sm">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-[var(--theme-sidebar-border)]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        <div className="p-3 border-t border-[var(--theme-sidebar-border)]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {admin?.nome?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-[var(--theme-sidebar-text)] truncate">{admin?.nome || 'Admin'}</p>
              <p className="text-xs text-[var(--theme-sidebar-text-muted)] truncate">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-[var(--theme-sidebar-text-muted)] hover:text-red-400 hover:bg-[var(--theme-sidebar-hover)] rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
