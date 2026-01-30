'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, RefreshCw, Loader2 } from 'lucide-react';

interface Conversa {
  id: number;
  nome: string;
  telefone: string;
  ultima: string;
  tempo: string;
  naoLida: boolean;
  humano: boolean;
  avatar?: string;
  status: 'open' | 'resolved' | 'pending';
}

type Aba = 'abertas' | 'resolvidas';

interface ConversasListProps {
  conversas: Conversa[];
  loading: boolean;
  conversaSelecionada: Conversa | null;
  onSelectConversa: (conversa: Conversa) => void;
  onNovaConversa: () => void;
  onRefresh: () => void;
}

export function ConversasList({
  conversas,
  loading,
  conversaSelecionada,
  onSelectConversa,
  onNovaConversa,
  onRefresh,
}: ConversasListProps) {
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('abertas');

  const conversasFiltradas = useMemo(() => {
    return conversas
      .filter(c => aba === 'abertas' ? c.status === 'open' : c.status === 'resolved')
      .filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.telefone.includes(busca)
      );
  }, [conversas, aba, busca]);

  return (
    <div className="w-80 border-r border-[var(--theme-border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--theme-border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onNovaConversa}
              className="p-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors"
              title="Nova conversa"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--theme-input)] border border-[var(--theme-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Abas */}
        <div className="flex mt-4 bg-[var(--theme-input)] rounded-lg p-1">
          <button
            onClick={() => setAba('abertas')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              aba === 'abertas'
                ? 'bg-primary text-white'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
            }`}
          >
            Abertas
          </button>
          <button
            onClick={() => setAba('resolvidas')}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              aba === 'resolvidas'
                ? 'bg-primary text-white'
                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
            }`}
          >
            Resolvidas
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversas.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin text-[var(--theme-text-muted)]" />
          </div>
        ) : conversasFiltradas.length === 0 ? (
          <div className="text-center text-[var(--theme-text-muted)] py-8">
            Nenhuma conversa encontrada
          </div>
        ) : (
          conversasFiltradas.map(conversa => (
            <button
              key={conversa.id}
              onClick={() => onSelectConversa(conversa)}
              className={`w-full p-4 text-left border-b border-[var(--theme-border)] hover:bg-[var(--theme-hover)] transition-colors ${
                conversaSelecionada?.id === conversa.id ? 'bg-[var(--theme-hover)]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {conversa.avatar ? (
                    <img src={conversa.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-medium">
                      {conversa.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{conversa.nome}</span>
                    <span className="text-xs text-[var(--theme-text-muted)]">{conversa.tempo}</span>
                  </div>
                  <p className="text-sm text-[var(--theme-text-muted)] truncate">{conversa.ultima}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {conversa.naoLida && (
                      <span className="w-2 h-2 bg-primary rounded-full" />
                    )}
                    {conversa.humano && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                        Humano
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
