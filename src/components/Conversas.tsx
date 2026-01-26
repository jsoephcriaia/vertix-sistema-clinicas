'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, User, Tag, StickyNote, X, Check, Trash2, ChevronRight, Settings, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

interface Conversa {
  id: number;
  nome: string;
  telefone: string;
  ultima: string;
  tempo: string;
  naoLida: boolean;
  humano: boolean;
  etiquetas: string[];
  anotacao: string;
  chatwootLabels: string[];
}

interface Mensagem {
  id: number;
  tipo: 'recebida' | 'enviada';
  texto: string;
  hora: string;
}

const coresDisponiveis = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export default function Conversas() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [loadingEtiquetas, setLoadingEtiquetas] = useState(true);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [chatwootConfigurado, setChatwootConfigurado] = useState(true);
  
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  
  const [showEtiquetas, setShowEtiquetas] = useState(false);
  const [showAnotacao, setShowAnotacao] = useState(false);
  const [showGerenciarEtiquetas, setShowGerenciarEtiquetas] = useState(false);
  
  const [anotacaoTemp, setAnotacaoTemp] = useState('');
  
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState('');
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState('bg-green-500');
  const [salvandoEtiqueta, setSalvandoEtiqueta] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega conversas e etiquetas
  useEffect(() => {
    if (CLINICA_ID) {
      fetchConversas();
      fetchEtiquetas();
      const interval = setInterval(fetchConversas, 30000);
      return () => clearInterval(interval);
    }
  }, [CLINICA_ID]);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const fetchConversas = async () => {
    if (!CLINICA_ID) return;
    
    try {
      const response = await fetch(`/api/chatwoot/conversations?clinica_id=${CLINICA_ID}`);
      const data = await response.json();
      
      if (data.error === 'Chatwoot não configurado') {
        setChatwootConfigurado(false);
        setLoadingConversas(false);
        return;
      }
      
      setChatwootConfigurado(true);
      
      if (data.data?.payload) {
        const conversasFormatadas: Conversa[] = data.data.payload.map((conv: any) => {
          const sender = conv.meta?.sender || {};
          const lastMessage = conv.last_non_activity_message;
          const tempoPassado = formatarTempo(conv.timestamp || conv.last_activity_at);
          const labels = conv.labels || [];
          
          return {
            id: conv.id,
            nome: sender.name || 'Cliente',
            telefone: sender.phone_number || '',
            ultima: lastMessage?.content || 'Nova conversa',
            tempo: tempoPassado,
            naoLida: conv.unread_count > 0,
            humano: labels.includes('humano'),
            etiquetas: [],
            anotacao: '',
            chatwootLabels: labels,
          };
        });

        setConversas(conversasFormatadas);
        
        if (!conversaSelecionada && conversasFormatadas.length > 0) {
          selecionarConversa(conversasFormatadas[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoadingConversas(false);
    }
  };

  const fetchMensagens = async (conversaId: number) => {
    if (!CLINICA_ID) return;
    
    setLoadingMensagens(true);
    
    try {
      const response = await fetch(
        `/api/chatwoot/messages?clinica_id=${CLINICA_ID}&conversation_id=${conversaId}`
      );
      const data = await response.json();
      
      if (data.payload) {
        const mensagensFormatadas: Mensagem[] = data.payload
          .filter((msg: any) => msg.content && msg.message_type !== 2)
          .map((msg: any) => ({
            id: msg.id,
            tipo: msg.message_type === 0 ? 'recebida' : 'enviada',
            texto: msg.content,
            hora: formatarHora(msg.created_at),
          }))
          .reverse();

        setMensagens(mensagensFormatadas);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  };

  const enviarMensagem = async () => {
    if (!mensagem.trim() || !conversaSelecionada || !CLINICA_ID) return;
    
    setEnviandoMensagem(true);
    
    try {
      const response = await fetch('/api/chatwoot/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: CLINICA_ID,
          conversation_id: conversaSelecionada.id,
          content: mensagem
        })
      });

      if (response.ok) {
        setMensagem('');
        await fetchMensagens(conversaSelecionada.id);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const formatarTempo = (timestamp: number) => {
    const agora = Date.now() / 1000;
    const diff = agora - timestamp;
    
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const formatarHora = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchEtiquetas = async () => {
    setLoadingEtiquetas(true);
    const { data, error } = await supabase
      .from('etiquetas')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar etiquetas:', error);
    } else {
      setEtiquetas(data || []);
    }
    setLoadingEtiquetas(false);
  };

  const toggleHumano = async () => {
    if (!conversaSelecionada || !CLINICA_ID) return;
    
    const novoEstado = !conversaSelecionada.humano;
    
    try {
      const labelsAtuais = conversaSelecionada.chatwootLabels.filter(l => l !== 'humano');
      const novosLabels = novoEstado ? [...labelsAtuais, 'humano'] : labelsAtuais;
      
      await fetch('/api/chatwoot/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: CLINICA_ID,
          conversation_id: conversaSelecionada.id,
          labels: novosLabels
        })
      });

      setConversaSelecionada(prev => prev ? { ...prev, humano: novoEstado, chatwootLabels: novosLabels } : null);
      setConversas(prev => prev.map(c => 
        c.id === conversaSelecionada.id ? { ...c, humano: novoEstado, chatwootLabels: novosLabels } : c
      ));
    } catch (error) {
      console.error('Erro ao atualizar etiqueta humano:', error);
    }
  };

  const toggleEtiqueta = (etiquetaId: string) => {
    if (!conversaSelecionada) return;
    
    const temEtiqueta = conversaSelecionada.etiquetas.includes(etiquetaId);
    const novasEtiquetas = temEtiqueta
      ? conversaSelecionada.etiquetas.filter(id => id !== etiquetaId)
      : [...conversaSelecionada.etiquetas, etiquetaId];
    
    setConversaSelecionada(prev => prev ? { ...prev, etiquetas: novasEtiquetas } : null);
    setConversas(prev => prev.map(c => 
      c.id === conversaSelecionada.id ? { ...c, etiquetas: novasEtiquetas } : c
    ));
  };

  const criarEtiqueta = async () => {
    if (!novaEtiquetaNome.trim()) return;
    
    setSalvandoEtiqueta(true);
    
    const { data, error } = await supabase
      .from('etiquetas')
      .insert({
        clinica_id: CLINICA_ID,
        nome: novaEtiquetaNome.trim(),
        cor: novaEtiquetaCor,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar etiqueta:', error);
      alert('Erro ao criar etiqueta');
    } else {
      setEtiquetas(prev => [...prev, data]);
      setNovaEtiquetaNome('');
      setNovaEtiquetaCor('bg-green-500');
    }
    
    setSalvandoEtiqueta(false);
  };

  const excluirEtiqueta = async (etiquetaId: string) => {
    if (!confirm('Excluir esta etiqueta? Ela será removida de todas as conversas.')) return;
    
    const { error } = await supabase
      .from('etiquetas')
      .delete()
      .eq('id', etiquetaId);

    if (error) {
      console.error('Erro ao excluir etiqueta:', error);
      alert('Erro ao excluir etiqueta');
    } else {
      setEtiquetas(prev => prev.filter(e => e.id !== etiquetaId));
      
      setConversas(prev => prev.map(c => ({
        ...c,
        etiquetas: c.etiquetas.filter(id => id !== etiquetaId)
      })));
      
      if (conversaSelecionada?.etiquetas.includes(etiquetaId)) {
        setConversaSelecionada(prev => prev ? {
          ...prev,
          etiquetas: prev.etiquetas.filter(id => id !== etiquetaId)
        } : null);
      }
    }
  };

  const abrirAnotacao = () => {
    if (!conversaSelecionada) return;
    setAnotacaoTemp(conversaSelecionada.anotacao);
    setShowAnotacao(true);
  };

  const salvarAnotacao = () => {
    if (!conversaSelecionada) return;
    
    setConversaSelecionada(prev => prev ? { ...prev, anotacao: anotacaoTemp } : null);
    setConversas(prev => prev.map(c => 
      c.id === conversaSelecionada.id ? { ...c, anotacao: anotacaoTemp } : c
    ));
    setShowAnotacao(false);
  };

  const selecionarConversa = (conv: Conversa) => {
    setConversaSelecionada(conv);
    setShowEtiquetas(false);
    setShowAnotacao(false);
    setShowGerenciarEtiquetas(false);
    fetchMensagens(conv.id);
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.ultima.toLowerCase().includes(busca.toLowerCase())
  );

  // Se não tem Chatwoot configurado
  if (!loadingConversas && !chatwootConfigurado) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)] -m-4 lg:-m-6">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-[#334155] rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={40} className="text-[#64748b]" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Chatwoot não configurado</h2>
          <p className="text-[#64748b] mb-4">Configure a integração com o Chatwoot para ver as conversas.</p>
          <p className="text-[#10b981]">
            Vá em Configurações → Integrações
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)] -m-4 lg:-m-6">
      {/* Lista de conversas */}
      <div className="w-80 bg-[#1e293b] border-r border-[#334155] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[#334155]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversas</h2>
            <button 
              onClick={fetchConversas}
              className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={16} className={loadingConversas ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={18} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#10b981]"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loadingConversas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#10b981]" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-[#64748b]">
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            conversasFiltradas.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selecionarConversa(conv)}
                className={`w-full flex items-center gap-3 p-4 border-b border-[#334155] hover:bg-[#334155] transition-colors text-left ${
                  conversaSelecionada?.id === conv.id ? 'bg-[#334155]' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold flex-shrink-0">
                    {conv.nome.charAt(0).toUpperCase()}
                  </div>
                  {conv.humano && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <User size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{conv.nome}</p>
                    <span className="text-xs text-[#64748b]">{conv.tempo}</span>
                  </div>
                  <p className="text-sm text-[#64748b] truncate">{conv.ultima}</p>
                </div>
                {conv.naoLida && (
                  <div className="w-3 h-3 rounded-full bg-[#10b981] flex-shrink-0"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col bg-[#0f172a] min-w-0">
          {/* Header do chat */}
          <div className="bg-[#1e293b] border-b border-[#334155] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {conversaSelecionada.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{conversaSelecionada.nome}</p>
                  <p className="text-xs text-[#64748b]">{conversaSelecionada.telefone}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={abrirAnotacao}
                  className={`p-2 rounded-lg transition-colors relative ${
                    conversaSelecionada.anotacao 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
                  }`}
                  title="Anotações"
                >
                  <StickyNote size={20} />
                  {conversaSelecionada.anotacao && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                  )}
                </button>

                <button
                  onClick={() => setShowEtiquetas(!showEtiquetas)}
                  className={`p-2 rounded-lg transition-colors ${
                    showEtiquetas 
                      ? 'bg-[#10b981] text-white' 
                      : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
                  }`}
                  title="Etiquetas"
                >
                  <Tag size={20} />
                </button>
                
                <button
                  onClick={toggleHumano}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    conversaSelecionada.humano
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
                  }`}
                >
                  <User size={18} />
                  <span className="hidden sm:inline">HUMANO</span>
                </button>
              </div>
            </div>

            {conversaSelecionada.chatwootLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[#334155]">
                {conversaSelecionada.chatwootLabels.map(label => (
                  <span 
                    key={label} 
                    className={`px-2 py-0.5 rounded text-xs text-white ${
                      label === 'humano' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown de etiquetas */}
          {showEtiquetas && (
            <div className="bg-[#1e293b] border-b border-[#334155] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Etiquetas</p>
                <button
                  onClick={() => setShowGerenciarEtiquetas(!showGerenciarEtiquetas)}
                  className="text-xs text-[#10b981] hover:underline flex items-center gap-1"
                >
                  <Settings size={12} />
                  Gerenciar
                </button>
              </div>
              
              {loadingEtiquetas ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={20} className="animate-spin text-[#10b981]" />
                </div>
              ) : etiquetas.length === 0 ? (
                <p className="text-sm text-[#64748b] text-center py-4">
                  Nenhuma etiqueta cadastrada. Clique em "Gerenciar" para criar.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {etiquetas.map(etq => {
                    const selecionada = conversaSelecionada.etiquetas.includes(etq.id);
                    return (
                      <button
                        key={etq.id}
                        onClick={() => toggleEtiqueta(etq.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selecionada 
                            ? `${etq.cor} text-white` 
                            : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569]'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${selecionada ? 'bg-white' : etq.cor}`}></span>
                        {etq.nome}
                        {selecionada && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}

              {showGerenciarEtiquetas && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <p className="text-sm font-medium mb-3">Criar nova etiqueta</p>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={novaEtiquetaNome}
                      onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                      placeholder="Nome da etiqueta"
                      className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                    />
                    <div className="relative">
                      <button
                        className={`w-10 h-10 rounded-lg ${novaEtiquetaCor} flex items-center justify-center`}
                        onClick={() => {
                          const currentIndex = coresDisponiveis.indexOf(novaEtiquetaCor);
                          const nextIndex = (currentIndex + 1) % coresDisponiveis.length;
                          setNovaEtiquetaCor(coresDisponiveis[nextIndex]);
                        }}
                        title="Clique para mudar a cor"
                      >
                        <ChevronRight size={16} className="text-white" />
                      </button>
                    </div>
                    <button
                      onClick={criarEtiqueta}
                      disabled={!novaEtiquetaNome.trim() || salvandoEtiqueta}
                      className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] disabled:text-[#64748b] rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      {salvandoEtiqueta ? <Loader2 size={16} className="animate-spin" /> : null}
                      Criar
                    </button>
                  </div>

                  <p className="text-sm font-medium mb-2">Etiquetas existentes</p>
                  {etiquetas.length === 0 ? (
                    <p className="text-sm text-[#64748b] text-center py-4">Nenhuma etiqueta cadastrada</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {etiquetas.map(etq => (
                        <div key={etq.id} className="flex items-center justify-between bg-[#0f172a] rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${etq.cor}`}></span>
                            <span className="text-sm">{etq.nome}</span>
                          </div>
                          <button
                            onClick={() => excluirEtiqueta(etq.id)}
                            className="p-1 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {loadingMensagens ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-[#10b981]" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#64748b]">
                <p>Nenhuma mensagem ainda</p>
              </div>
            ) : (
              <>
                {mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.tipo === 'enviada'
                          ? 'bg-[#10b981] text-white rounded-br-md'
                          : 'bg-[#1e293b] text-white rounded-bl-md'
                      }`}
                    >
                      <p>{msg.texto}</p>
                      <p className={`text-xs mt-1 ${msg.tipo === 'enviada' ? 'text-green-200' : 'text-[#64748b]'}`}>
                        {msg.hora}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Aviso de modo humano */}
          {conversaSelecionada.humano && (
            <div className="bg-orange-500/20 border-t border-orange-500/30 px-4 py-2">
              <p className="text-orange-400 text-sm text-center">
                <User size={14} className="inline mr-1" />
                Modo humano ativo - A IA não responderá esta conversa
              </p>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="bg-[#1e293b] border-t border-[#334155] p-4">
            <form 
              onSubmit={(e) => { e.preventDefault(); enviarMensagem(); }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                disabled={enviandoMensagem}
              />
              <button 
                type="submit"
                disabled={enviandoMensagem || !mensagem.trim()}
                className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] text-white p-3 rounded-lg transition-colors"
              >
                {enviandoMensagem ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#0f172a]">
          <div className="text-center text-[#64748b]">
            <div className="w-20 h-20 bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} />
            </div>
            <p>Selecione uma conversa para começar</p>
          </div>
        </div>
      )}

      {/* Painel lateral de anotações */}
      {showAnotacao && conversaSelecionada && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAnotacao(false)}
          ></div>
          
          <div className="fixed right-0 top-0 h-full w-96 max-w-full bg-[#1e293b] border-l border-[#334155] z-50 flex flex-col">
            <div className="p-4 border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote size={20} className="text-yellow-400" />
                <h3 className="font-semibold">Anotações</h3>
              </div>
              <button
                onClick={() => setShowAnotacao(false)}
                className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm text-[#64748b] mb-2">
                Anotações sobre: <span className="text-white">{conversaSelecionada.nome}</span>
              </p>
              <textarea
                value={anotacaoTemp}
                onChange={(e) => setAnotacaoTemp(e.target.value)}
                placeholder="Adicione anotações sobre esta conversa..."
                className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981] resize-none text-sm"
              />
              <p className="text-xs text-[#64748b] mt-2">
                Estas anotações são internas e não são visíveis para o cliente.
              </p>
            </div>

            <div className="p-4 border-t border-[#334155] flex gap-3">
              <button
                onClick={() => setShowAnotacao(false)}
                className="flex-1 px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAnotacao}
                className="flex-1 px-4 py-2 bg-[#10b981] hover:bg-[#059669] rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Salvar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}