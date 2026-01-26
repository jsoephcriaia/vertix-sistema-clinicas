'use client';

import { useState, useEffect } from 'react';
import { Loader2, LogIn, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative">
      {/* Toggle de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
        title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--primary)] mb-2">VERTIX</h1>
          <p className="text-[var(--text-secondary)]">Painel da Clínica</p>
        </div>

        {/* Card de Login */}
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 text-center text-[var(--text-primary)]">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Credenciais de teste */}
          <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
            <p className="text-xs text-[var(--text-muted)] text-center mb-2">Credenciais de teste:</p>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 text-xs text-[var(--text-secondary)]">
              <p><strong>Email:</strong> admin@clinicabella.com.br</p>
              <p><strong>Senha:</strong> 123456</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--text-muted)] text-sm mt-6">
          © 2026 Vertix - Automação Inteligente
        </p>
      </div>
    </div>
  );
}