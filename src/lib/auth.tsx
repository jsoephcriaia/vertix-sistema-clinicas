'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

interface Usuario {
  id: string;
  clinica_id: string;
  email: string;
  nome: string;
  cargo: string;
  avatar?: string | null;
}

interface Clinica {
  id: string;
  nome: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  clinica: Clinica | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
  refreshClinica: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sessão ao carregar (via API que lê o cookie httpOnly)
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (data.usuario && data.clinica) {
          setUsuario(data.usuario);
          setClinica(data.clinica);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      // Cookie já foi setado pelo backend, apenas atualizar estado
      setUsuario(data.usuario);
      setClinica(data.clinica);

      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    setUsuario(null);
    setClinica(null);
  };

  const refreshUsuario = async () => {
    if (!usuario?.id) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', usuario.id)
        .single();

      if (data && !error) {
        setUsuario(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  const refreshClinica = async () => {
    if (!clinica?.id) return;

    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('id, nome')
        .eq('id', clinica.id)
        .single();

      if (data && !error) {
        setClinica(data);
      }
    } catch (error) {
      console.error('Erro ao atualizar clínica:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, clinica, loading, login, logout, refreshUsuario, refreshClinica }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
