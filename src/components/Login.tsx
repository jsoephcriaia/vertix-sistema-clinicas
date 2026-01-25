'use client';

import { useState } from 'react';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#10b981] mb-2">VERTIX</h1>
          <p className="text-[#64748b]">Painel da Clínica</p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#1e293b] rounded-2xl border border-[#334155] p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#64748b] mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-[#10b981]"
                  placeholder="••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white"
                >
                  {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
          <div className="mt-6 pt-6 border-t border-[#334155]">
            <p className="text-xs text-[#64748b] text-center mb-2">Credenciais de teste:</p>
            <div className="bg-[#0f172a] rounded-lg p-3 text-xs text-[#94a3b8]">
              <p><strong>Email:</strong> admin@clinicabella.com.br</p>
              <p><strong>Senha:</strong> 123456</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#64748b] text-sm mt-6">
          © 2026 Vertix - Automação Inteligente
        </p>
      </div>
    </div>
  );
}