'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Admin {
  id: string;
  email: string;
  nome: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessao = localStorage.getItem('vertix_admin_sessao');
    if (sessao) {
      try {
        const dados = JSON.parse(sessao);
        setAdmin(dados.admin);
      } catch {
        localStorage.removeItem('vertix_admin_sessao');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      const adminData: Admin = {
        id: data.admin.id,
        email: data.admin.email,
        nome: data.admin.nome,
      };

      setAdmin(adminData);
      localStorage.setItem('vertix_admin_sessao', JSON.stringify({ admin: adminData }));

      return { success: true };
    } catch (error) {
      console.error('Erro no login admin:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = () => {
    setAdmin(null);
    localStorage.removeItem('vertix_admin_sessao');
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }
  return context;
}
