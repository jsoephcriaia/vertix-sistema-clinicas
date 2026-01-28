'use client';

import { useState, useRef } from 'react';
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
  Moon,
  Edit,
  Save,
  Upload,
  Loader2,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useAlert } from '@/components/Alert';
import { supabase } from '@/lib/supabase';

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
  const { usuario, clinica, logout, refreshUsuario } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showConfirm, showToast } = useAlert();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Estado do perfil
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const inputAvatarRef = useRef<HTMLInputElement>(null);

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

  const abrirPerfilModal = () => {
    setEditNome(usuario?.nome || '');
    setShowPerfilModal(true);
  };

  const salvarPerfil = async () => {
    if (!usuario?.id || !editNome.trim()) return;

    setSalvandoPerfil(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome: editNome.trim(), updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      if (error) throw error;

      showToast('Perfil atualizado!', 'success');
      setShowPerfilModal(false);
      if (refreshUsuario) refreshUsuario();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showToast('Erro ao salvar perfil', 'error');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (!usuario?.id || !clinica?.id) return;

    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicaId', clinica.id);
      formData.append('tipo', 'avatar');
      formData.append('usuarioId', usuario.id);

      const response = await fetch('/api/google/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      // Atualizar avatar no banco
      await supabase
        .from('usuarios')
        .update({ avatar: result.imageUrl, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      showToast('Avatar atualizado!', 'success');
      if (refreshUsuario) refreshUsuario();
    } catch (error) {
      console.error('Erro ao enviar avatar:', error);
      showToast('Erro ao enviar avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removerAvatar = async () => {
    if (!usuario?.id) return;

    try {
      await supabase
        .from('usuarios')
        .update({ avatar: null, updated_at: new Date().toISOString() })
        .eq('id', usuario.id);

      showToast('Avatar removido!', 'success');
      if (refreshUsuario) refreshUsuario();
    } catch (error) {
      console.error('Erro ao remover avatar:', error);
      showToast('Erro ao remover avatar', 'error');
    }
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
          <div>
            <h1 className="text-xl font-bold text-primary">VERTIX</h1>
            <p className="text-xs text-[var(--theme-sidebar-text-muted)] truncate" title={clinica?.nome}>
              {clinica?.nome || 'Painel da Clínica'}
            </p>
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
          <button
            onClick={abrirPerfilModal}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--theme-sidebar-hover)] rounded-lg transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold overflow-hidden relative">
              {usuario?.avatar ? (
                <img src={usuario.avatar} alt={usuario.nome} className="w-full h-full object-cover" />
              ) : (
                usuario?.nome?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-[var(--theme-sidebar-text)] truncate">{usuario?.nome || 'Usuário'}</p>
              <p className="text-xs text-[var(--theme-sidebar-text-muted)] truncate">{usuario?.email}</p>
            </div>
            <Edit size={14} className="text-[var(--theme-sidebar-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-[var(--theme-sidebar-text-muted)] hover:text-red-400 hover:bg-[var(--theme-sidebar-hover)] rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Modal de Edição de Perfil */}
      {showPerfilModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPerfilModal(false)}>
          <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar Perfil</h2>
              <button onClick={() => setShowPerfilModal(false)} className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden relative group">
                  {usuario?.avatar ? (
                    <>
                      <img src={usuario.avatar} alt={usuario?.nome} className="w-full h-full object-cover" />
                      <button
                        onClick={removerAvatar}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover avatar"
                      >
                        <Trash2 size={24} className="text-red-400" />
                      </button>
                    </>
                  ) : (
                    usuario?.nome?.charAt(0) || 'U'
                  )}
                </div>
                <input
                  ref={inputAvatarRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadAvatar(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => inputAvatarRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload size={16} /> Alterar Foto</>
                  )}
                </button>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  placeholder="Seu nome"
                />
              </div>

              {/* Email (somente leitura) */}
              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Email</label>
                <input
                  type="email"
                  value={usuario?.email || ''}
                  disabled
                  className="w-full bg-[var(--theme-bg-tertiary)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 text-[var(--theme-text-muted)] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--theme-card-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowPerfilModal(false)}
                className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPerfil}
                disabled={salvandoPerfil || !editNome.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] rounded-lg transition-colors flex items-center gap-2"
              >
                {salvandoPerfil ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {salvandoPerfil ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}