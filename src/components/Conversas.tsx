'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, User, StickyNote, X, Check, Settings, Loader2, RefreshCw, Download, Play, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface Attachment {
  id: number;
  file_type: string;
  data_url: string;
  thumb_url?: string;
  file_name?: string;
}

interface Conversa {
  id: number;
  nome: string;
  telefone: string;
  ultima: string;
  tempo: string;
  naoLida: boolean;
  humano: boolean;
  anotacao: string;
  chatwootLabels: string[];
}

interface Mensagem {
  id: number;
  tipo: 'recebida' | 'enviada';
  texto: string;
  hora: string;
  attachments?: Attachment[];
}

export default function Conversas() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  
  const [loadingConversas, setLoadingConversas] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [chatwootConfigurado, setChatwootConfigurado] = useState(true);
  
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  
  const [showAnotacao, setShowAnotacao] = useState(false);
  const [anotacaoTemp, setAnotacaoTemp] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega conversas
  useEffect(() => {
    if (CLINICA_ID) {
      fetchConversas();
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
          
          // Verifica se última mensagem tem attachment
          let ultimaMsg = lastMessage?.content || 'Nova conversa';
          if (!ultimaMsg && lastMessage?.attachments?.length > 0) {
            const tipo = lastMessage.attachments[0].file_type;
            if (tipo === 'image') ultimaMsg = '📷 Imagem';
            else if (tipo === 'audio') ultimaMsg = '🎵 Áudio';
            else if (tipo === 'video') ultimaMsg = '🎥 Vídeo';
            else if (tipo === 'file') ultimaMsg = '📄 Arquivo';
            else ultimaMsg = '📎 Anexo';
          }
          
          return {
            id: conv.id,
            nome: sender.name || 'Cliente',
            telefone: sender.phone_number || '',
            ultima: ultimaMsg,
            tempo: tempoPassado,
            naoLida: conv.unread_count > 0,
            humano: labels.includes('humano'),
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
          .filter((msg: any) => (msg.content || msg.attachments?.length > 0) && msg.message_type !== 2)
          .map((msg: any) => ({
            id: msg.id,
            tipo: msg.message_type === 0 ? 'recebida' : 'enviada',
            texto: msg.content || '',
            hora: formatarHora(msg.created_at),
            attachments: msg.attachments || [],
          }));

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
    setShowAnotacao(false);
    fetchMensagens(conv.id);
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.ultima.toLowerCase().includes(busca.toLowerCase())
  );

  // Componente para renderizar anexos
  const renderAttachment = (attachment: Attachment, isEnviada: boolean) => {
    const { file_type, data_url, thumb_url, file_name } = attachment;

    // Imagem
    if (file_type === 'image') {
      return (
        <a href={data_url} target="_blank" rel="noopener noreferrer" className="block">
          <img 
            src={data_url} 
            alt="Imagem" 
            className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    // Áudio
    if (file_type === 'audio') {
      return (
        <audio controls className="max-w-full">
          <source src={data_url} />
          Seu navegador não suporta áudio.
        </audio>
      );
    }

    // Vídeo
    if (file_type === 'video') {
      return (
        <video controls className="max-w-full rounded-lg max-h-64">
          <source src={data_url} />
          Seu navegador não suporta vídeo.
        </video>
      );
    }

    // Sticker/GIF (webp)
    if (file_type === 'image' || data_url?.includes('.webp') || data_url?.includes('.gif')) {
      return (
        <img 
          src={data_url} 
          alt="Sticker" 
          className="max-w-32 max-h-32 object-contain"
        />
      );
    }

    // Arquivo/Documento
    return (
      <a 
        href={data_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isEnviada ? 'bg-[#059669]' : 'bg-[#334155]'
        } hover:opacity-80 transition-opacity`}
      >
        <FileText size={20} />
        <span className="text-sm truncate max-w-[150px]">{file_name || 'Arquivo'}</span>
        <Download size={16} />
      </a>
    );
  };

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
          </div>

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
                      {/* Renderiza anexos */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx}>
                              {renderAttachment(att, msg.tipo === 'enviada')}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Texto da mensagem */}
                      {msg.texto && <p>{msg.texto}</p>}
                      
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