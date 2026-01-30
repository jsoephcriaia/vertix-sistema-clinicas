'use client';

import { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Edit3, Check, X, StickyNote, Package, CalendarPlus, Phone } from 'lucide-react';

const ETAPAS = [
  { id: 'novo', label: 'Novo', cor: 'bg-blue-500', textCor: 'text-blue-400' },
  { id: 'atendimento', label: 'Em Atendimento', cor: 'bg-yellow-500', textCor: 'text-yellow-400' },
  { id: 'agendado', label: 'Agendado', cor: 'bg-purple-500', textCor: 'text-purple-400' },
  { id: 'convertido', label: 'Convertido', cor: 'bg-green-500', textCor: 'text-green-400' },
  { id: 'perdido', label: 'Perdido', cor: 'bg-red-500', textCor: 'text-red-400' },
];

interface ConversaHeaderProps {
  nome: string;
  telefone: string;
  avatar?: string;
  etapa: string;
  humano: boolean;
  onUpdateNome: (nome: string) => Promise<boolean>;
  onUpdateEtapa: (etapa: string) => Promise<boolean>;
  onToggleHumano: () => void;
  onOpenInteresse: () => void;
  onOpenAgendamentos: () => void;
  onOpenAnotacoes: () => void;
}

export function ConversaHeader({
  nome,
  telefone,
  avatar,
  etapa,
  humano,
  onUpdateNome,
  onUpdateEtapa,
  onToggleHumano,
  onOpenInteresse,
  onOpenAgendamentos,
  onOpenAnotacoes,
}: ConversaHeaderProps) {
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(nome);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [showEtapaDropdown, setShowEtapaDropdown] = useState(false);
  const [atualizandoEtapa, setAtualizandoEtapa] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const etapaAtual = ETAPAS.find(e => e.id === etapa) || ETAPAS[0];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEtapaDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSalvarNome = async () => {
    if (!nomeTemp.trim() || nomeTemp === nome) {
      setEditandoNome(false);
      setNomeTemp(nome);
      return;
    }

    setSalvandoNome(true);
    const sucesso = await onUpdateNome(nomeTemp.trim());
    setSalvandoNome(false);

    if (sucesso) {
      setEditandoNome(false);
    } else {
      setNomeTemp(nome);
    }
  };

  const handleMudarEtapa = async (novaEtapa: string) => {
    if (novaEtapa === etapa) {
      setShowEtapaDropdown(false);
      return;
    }

    setAtualizandoEtapa(true);
    await onUpdateEtapa(novaEtapa);
    setAtualizandoEtapa(false);
    setShowEtapaDropdown(false);
  };

  return (
    <div className="border-b border-[var(--theme-border)] p-4">
      <div className="flex items-center justify-between">
        {/* Info do contato */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-primary" />
            )}
          </div>

          <div>
            {/* Nome editável */}
            {editandoNome ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nomeTemp}
                  onChange={e => setNomeTemp(e.target.value)}
                  className="bg-[var(--theme-input)] border border-[var(--theme-border)] rounded px-2 py-1 text-sm"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSalvarNome()}
                />
                <button
                  onClick={handleSalvarNome}
                  disabled={salvandoNome}
                  className="text-green-400 hover:text-green-300"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditandoNome(false);
                    setNomeTemp(nome);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">{nome}</span>
                <button
                  onClick={() => setEditandoNome(true)}
                  className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-[var(--theme-text-muted)]">
              <Phone size={12} />
              <span>{telefone}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* Etapa dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowEtapaDropdown(!showEtapaDropdown)}
              disabled={atualizandoEtapa}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${etapaAtual.cor}/20 ${etapaAtual.textCor}`}
            >
              <span className={`w-2 h-2 rounded-full ${etapaAtual.cor}`} />
              <span className="text-sm">{etapaAtual.label}</span>
              <ChevronDown size={14} />
            </button>

            {showEtapaDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                {ETAPAS.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleMudarEtapa(e.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--theme-hover)] text-left ${
                      e.id === etapa ? 'bg-[var(--theme-hover)]' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${e.cor}`} />
                    <span className={e.textCor}>{e.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Humano */}
          <button
            onClick={onToggleHumano}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              humano
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-[var(--theme-input)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
            }`}
          >
            {humano ? 'Modo Humano' : 'IA Ativa'}
          </button>

          {/* Botões de ação */}
          <button
            onClick={onOpenInteresse}
            className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
            title="Interesse"
          >
            <Package size={18} />
          </button>
          <button
            onClick={onOpenAgendamentos}
            className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
            title="Agendamentos"
          >
            <CalendarPlus size={18} />
          </button>
          <button
            onClick={onOpenAnotacoes}
            className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
            title="Anotações"
          >
            <StickyNote size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
