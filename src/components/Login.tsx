'use client';

import { useState } from 'react';
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
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Toggle de tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 rounded-xl hover:opacity-80 transition-colors"
        style={{ 
          backgroundColor: 'var(--card-bg)', 
          border: '1px solid var(--card-border)',
          color: 'var(--text-secondary)'
        }}
        title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--primary)' }}>VERTIX</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Painel da Clínica</p>
        </div>

        {/* Card de Login */}
        <div 
          className="rounded-2xl p-8 shadow-lg"
          style={{ 
            backgroundColor: 'var(--card-bg)', 
            border: '1px solid var(--card-border)' 
          }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>
            Entrar na sua conta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-3 focus:outline-none transition-colors"
                style={{ 
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-primary)'
                }}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 pr-12 focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
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
              className="w-full text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
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
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--card-border)' }}>
            <p className="text-xs text-center mb-2" style={{ color: 'var(--text-muted)' }}>Credenciais de teste:</p>
            <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              <p><strong>Email:</strong> admin@clinicabella.com.br</p>
              <p><strong>Senha:</strong> 123456</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          © 2026 Vertix - Automação Inteligente
        </p>
      </div>
    </div>
  );
}