'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, User, StickyNote, X, Check, Settings, Loader2, RefreshCw, Download, FileText, Smile, Paperclip, Mic, Square, Reply } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import EmojiPicker from './EmojiPicker';

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
  replyTo?: {
    id: number;
    content: string;
  };
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
  
  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Reply
  const [replyingTo, setReplyingTo] = useState<Mensagem | null>(null);
  
  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Anexos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  // Carrega conversas
  useEffect(() => {
    if (CLINICA_ID) {
      fetchConversas();
      const interval = setInterval(fetchConversas, 30000);
      return () => clearInterval(interval);
    }
  }, [CLINICA_ID]);

  // Polling de mensagens (a cada 3 segundos, sem loading visual)
  useEffect(() => {
    if (conversaSelecionada && CLINICA_ID) {
      const interval = setInterval(() => {
        fetchMensagenssilent(conversaSelecionada.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [conversaSelecionada, CLINICA_ID]);

  // Scroll para última mensagem apenas quando houver nova mensagem
  useEffect(() => {
    if (mensagens.length > 0) {
      const lastMsg = mensagens[mensagens.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMsg.id;
        // Scroll suave apenas se não for primeira carga
        if (!isFirstLoadRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          isFirstLoadRef.current = false;
        }
      }
    }
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
    isFirstLoadRef.current = true;
    
    try {
      const response = await fetch(
        `/api/chatwoot/messages?clinica_id=${CLINICA_ID}&conversation_id=${conversaId}`
      );
      const data = await response.json();
      
      if (data.payload) {
        const mensagensFormatadas = formatarMensagens(data.payload);
        setMensagens(mensagensFormatadas);
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoadingMensagens(false);
    }
  };

  // Busca mensagens sem loading visual (para polling)
  const fetchMensagenssilent = async (conversaId: number) => {
    if (!CLINICA_ID) return;
    
    try {
      const response = await fetch(
        `/api/chatwoot/messages?clinica_id=${CLINICA_ID}&conversation_id=${conversaId}`
      );
      const data = await response.json();
      
      if (data.payload) {
        const mensagensFormatadas = formatarMensagens(data.payload);
        
        // Só atualiza se tiver mensagens novas
        if (mensagensFormatadas.length !== mensagens.length || 
            (mensagensFormatadas.length > 0 && mensagensFormatadas[mensagensFormatadas.length - 1].id !== lastMessageIdRef.current)) {
          setMensagens(mensagensFormatadas);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const formatarMensagens = (payload: any[]): Mensagem[] => {
    return payload
      .filter((msg: any) => (msg.content || msg.attachments?.length > 0) && msg.message_type !== 2)
      .map((msg: any) => ({
        id: msg.id,
        tipo: msg.message_type === 0 ? 'recebida' : 'enviada',
        texto: msg.content || '',
        hora: formatarHora(msg.created_at),
        attachments: msg.attachments || [],
        replyTo: msg.content_attributes?.in_reply_to ? {
          id: msg.content_attributes.in_reply_to,
          content: msg.content_attributes.in_reply_to_content || ''
        } : undefined
      })) as Mensagem[];
  };

  const enviarMensagem = async () => {
    if ((!mensagem.trim() && selectedFiles.length === 0) || !conversaSelecionada || !CLINICA_ID) return;
    
    setEnviandoMensagem(true);
    
    try {
      // Se tem arquivos, envia com FormData
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append('clinica_id', CLINICA_ID);
        formData.append('conversation_id', conversaSelecionada.id.toString());
        formData.append('content', mensagem);
        if (replyingTo) {
          formData.append('reply_to', replyingTo.id.toString());
        }
        selectedFiles.forEach(file => {
          formData.append('attachments[]', file);
        });
        
        await fetch('/api/chatwoot/messages', {
          method: 'POST',
          body: formData
        });
      } else {
        // Envia só texto
        await fetch('/api/chatwoot/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinica_id: CLINICA_ID,
            conversation_id: conversaSelecionada.id,
            content: mensagem,
            reply_to: replyingTo?.id
          })
        });
      }

      setMensagem('');
      setSelectedFiles([]);
      setReplyingTo(null);
      await fetchMensagenssilent(conversaSelecionada.id);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setEnviandoMensagem(false);
    }
  };

  // Gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        
        // Envia o áudio
        if (conversaSelecionada && CLINICA_ID) {
          setEnviandoMensagem(true);
          const formData = new FormData();
          formData.append('clinica_id', CLINICA_ID);
          formData.append('conversation_id', conversaSelecionada.id.toString());
          formData.append('content', '');
          formData.append('attachments[]', audioFile);
          
          try {
            await fetch('/api/chatwoot/messages', {
              method: 'POST',
              body: formData
            });
            await fetchMensagenssilent(conversaSelecionada.id);
          } catch (error) {
            console.error('Erro ao enviar áudio:', error);
          } finally {
            setEnviandoMensagem(false);
          }
        }
        
        // Para as tracks do stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Anexos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
    setReplyingTo(null);
    setSelectedFiles([]);
    lastMessageIdRef.current = 0;
    fetchMensagens(conv.id);
  };

  const conversasFiltradas = conversas.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca) ||
    c.ultima.toLowerCase().includes(busca.toLowerCase())
  );

  // Componente para renderizar anexos
  const renderAttachment = (attachment: Attachment, isEnviada: boolean) => {
    const { file_type, data_url, file_name } = attachment;

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

    if (file_type === 'audio') {
      return (
        <audio controls className="max-w-[250px]">
          <source src={data_url} />
          Seu navegador não suporta áudio.
        </audio>
      );
    }

    if (file_type === 'video') {
      return (
        <video controls className="max-w-full rounded-lg max-h-64">
          <source src={data_url} />
          Seu navegador não suporta vídeo.
        </video>
      );
    }

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
    <div className="flex h-[calc(100vh-48px)] -m-4 lg:-m-6 overflow-hidden">
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
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold">
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
                    <span className="text-xs text-[#64748b] flex-shrink-0 ml-2">{conv.tempo}</span>
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
        <div className="flex-1 flex flex-col bg-[#0f172a] min-w-0 overflow-hidden">
          {/* Header do chat */}
          <div className="bg-[#1e293b] border-b border-[#334155] p-4 flex-shrink-0">
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
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          >
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
                    className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="flex items-start gap-1 max-w-[70%]">
                      {/* Botão de reply (aparece no hover) */}
                      {msg.tipo === 'recebida' && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#334155] rounded transition-all self-center"
                          title="Responder"
                        >
                          <Reply size={16} className="text-[#64748b]" />
                        </button>
                      )}
                      
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          msg.tipo === 'enviada'
                            ? 'bg-[#10b981] text-white rounded-br-md'
                            : 'bg-[#1e293b] text-white rounded-bl-md'
                        }`}
                      >
                        {/* Reply quote */}
                        {msg.replyTo && (
                          <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
                            msg.tipo === 'enviada' 
                              ? 'bg-[#059669] border-white/50' 
                              : 'bg-[#334155] border-[#10b981]'
                          }`}>
                            <p className="opacity-75 truncate">{msg.replyTo.content || 'Mensagem'}</p>
                          </div>
                        )}
                        
                        {/* Anexos */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {msg.attachments.map((att, idx) => (
                              <div key={idx}>
                                {renderAttachment(att, msg.tipo === 'enviada')}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {msg.texto && <p className="break-words">{msg.texto}</p>}
                        
                        <p className={`text-xs mt-1 ${msg.tipo === 'enviada' ? 'text-green-200' : 'text-[#64748b]'}`}>
                          {msg.hora}
                        </p>
                      </div>
                      
                      {/* Botão de reply para mensagens enviadas */}
                      {msg.tipo === 'enviada' && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#334155] rounded transition-all self-center"
                          title="Responder"
                        >
                          <Reply size={16} className="text-[#64748b]" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Aviso de modo humano */}
          {conversaSelecionada.humano && (
            <div className="bg-orange-500/20 border-t border-orange-500/30 px-4 py-2 flex-shrink-0">
              <p className="text-orange-400 text-sm text-center">
                <User size={14} className="inline mr-1" />
                Modo humano ativo - A IA não responderá esta conversa
              </p>
            </div>
          )}

          {/* Reply preview */}
          {replyingTo && (
            <div className="bg-[#1e293b] border-t border-[#334155] px-4 py-2 flex items-center gap-3 flex-shrink-0">
              <div className="flex-1 border-l-2 border-[#10b981] pl-3">
                <p className="text-xs text-[#10b981]">Respondendo</p>
                <p className="text-sm text-[#94a3b8] truncate">{replyingTo.texto || 'Mídia'}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-[#334155] rounded"
              >
                <X size={18} className="text-[#64748b]" />
              </button>
            </div>
          )}

          {/* Preview de arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div className="bg-[#1e293b] border-t border-[#334155] px-4 py-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#334155] rounded-lg px-3 py-1">
                    <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => removeFile(idx)} className="hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="bg-[#1e293b] border-t border-[#334155] p-4 flex-shrink-0">
            {isRecording ? (
              // Interface de gravação
              <div className="flex items-center gap-3">
                <button
                  onClick={cancelRecording}
                  className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Cancelar"
                >
                  <X size={20} />
                </button>
                
                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium">{formatRecordingTime(recordingTime)}</span>
                </div>
                
                <button
                  onClick={stopRecording}
                  className="p-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors"
                  title="Enviar áudio"
                >
                  <Send size={20} />
                </button>
              </div>
            ) : (
              // Interface normal
              <form 
                onSubmit={(e) => { e.preventDefault(); enviarMensagem(); }}
                className="flex items-center gap-2"
              >
                {/* Emoji picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#64748b] hover:text-white"
                  >
                    <Smile size={22} />
                  </button>
                  {showEmojiPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)}></div>
                      <EmojiPicker
                        onSelect={(emoji) => setMensagem(prev => prev + emoji)}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </>
                  )}
                </div>
                
                {/* Anexar arquivo */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#64748b] hover:text-white"
                >
                  <Paperclip size={22} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                
                {/* Input de texto */}
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  disabled={enviandoMensagem}
                />
                
                {/* Botão de gravar áudio ou enviar */}
                {mensagem.trim() || selectedFiles.length > 0 ? (
                  <button 
                    type="submit"
                    disabled={enviandoMensagem}
                    className="p-3 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] text-white rounded-lg transition-colors"
                  >
                    {enviandoMensagem ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-3 bg-[#334155] hover:bg-[#475569] text-white rounded-lg transition-colors"
                    title="Gravar áudio"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </form>
            )}
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