'use client';

import { useState } from 'react';
import { Loader2, LogIn, Eye, EyeOff, Sun, Moon, Shield } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuth';
import { useTheme } from '@/lib/theme';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const { login } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    const result = await login(email, senha);

    if (result.success) {
      onSuccess();
    } else {
      setErro(result.error || 'Erro ao fazer login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-[var(--theme-bg)]">
      {/* Toggle de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 rounded-xl transition-colors bg-[var(--theme-card)] border border-[var(--theme-card-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text)]"
        title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="text-primary" size={32} />
            <h1 className="text-4xl font-bold text-primary">VERTIX</h1>
          </div>
          <p className="text-[var(--theme-text-secondary)]">Painel Administrativo</p>
        </div>

        <div className="rounded-2xl p-8 shadow-lg bg-[var(--theme-card)] border border-[var(--theme-card-border)]">
          <h2 className="text-xl font-semibold mb-6 text-center text-[var(--theme-text)]">Acesso Restrito</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-[var(--theme-text-secondary)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-3 focus:outline-none focus:border-primary bg-[var(--theme-input)] border border-[var(--theme-input-border)] text-[var(--theme-text)]"
                placeholder="admin@vertix.com.br"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-[var(--theme-text-secondary)]">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary bg-[var(--theme-input)] border border-[var(--theme-input-border)] text-[var(--theme-text)]"
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
                >
                  {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6 text-[var(--theme-text-muted)]">
          © 2026 Vertix - Automação Inteligente
        </p>
      </div>
    </div>
  );
}
