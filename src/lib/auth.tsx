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
  logout: () => void;
  refreshUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [clinica, setClinica] = useState<Clinica | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar sessão ao carregar
  useEffect(() => {
    const sessao = localStorage.getItem('vertix_sessao');
    if (sessao) {
      const dados = JSON.parse(sessao);
      setUsuario(dados.usuario);
      setClinica(dados.clinica);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Buscar usuário pelo email
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('ativo', true)
        .single();

      if (usuarioError || !usuarioData) {
        return { success: false, error: 'Email não encontrado' };
      }

      // Por enquanto, senha fixa para teste (depois integramos com Supabase Auth)
      if (senha !== '123456') {
        return { success: false, error: 'Senha incorreta' };
      }

      // Buscar dados da clínica
      const { data: clinicaData, error: clinicaError } = await supabase
        .from('clinicas')
        .select('id, nome')
        .eq('id', usuarioData.clinica_id)
        .single();

      if (clinicaError || !clinicaData) {
        return { success: false, error: 'Clínica não encontrada' };
      }

      // Salvar sessão
      const sessao = {
        usuario: usuarioData,
        clinica: clinicaData,
      };
      localStorage.setItem('vertix_sessao', JSON.stringify(sessao));
      
      setUsuario(usuarioData);
      setClinica(clinicaData);

      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  };

  const logout = () => {
    localStorage.removeItem('vertix_sessao');
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
        // Atualizar localStorage
        const sessao = localStorage.getItem('vertix_sessao');
        if (sessao) {
          const dados = JSON.parse(sessao);
          dados.usuario = data;
          localStorage.setItem('vertix_sessao', JSON.stringify(dados));
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, clinica, loading, login, logout, refreshUsuario }}>
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