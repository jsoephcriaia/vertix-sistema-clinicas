'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Send, User, StickyNote, X, Check, Settings, Loader2, RefreshCw, Download, FileText, Smile, Paperclip, Mic, Square, Reply, Plus, Phone, MessageSquare, Play, Pause, Trash2, CheckCircle, Clock, Edit3, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';
import { supabase } from '@/lib/supabase';
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
  avatar?: string;
  status: 'open' | 'resolved' | 'pending';
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

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  interesse?: string;
  etapa: string;
}

interface LeadIA {
  id: string;
  nome: string;
  telefone: string;
  procedimento_interesse: string | null;
  etapa: string;
  created_at: string;
  clinica_id: string;
  conversation_id: number | null;
}

type AbaConversa = 'abertas' | 'resolvidas';

interface ConversasProps {
  conversaInicial?: { telefone: string; nome: string } | null;
  onConversaIniciada?: () => void;
}

// Etapas do lead (correspondem ao constraint leads_ia_etapa_check)
const ETAPAS_LEAD = [
  { id: 'novo', label: 'Novo', cor: 'bg-blue-500', textCor: 'text-blue-400', bgCor: 'bg-blue-500/20' },
  { id: 'atendimento', label: 'Em Atendimento', cor: 'bg-yellow-500', textCor: 'text-yellow-400', bgCor: 'bg-yellow-500/20' },
  { id: 'agendado', label: 'Agendado', cor: 'bg-purple-500', textCor: 'text-purple-400', bgCor: 'bg-purple-500/20' },
  { id: 'convertido', label: 'Convertido', cor: 'bg-green-500', textCor: 'text-green-400', bgCor: 'bg-green-500/20' },
  { id: 'perdido', label: 'Perdido', cor: 'bg-red-500', textCor: 'text-red-400', bgCor: 'bg-red-500/20' },
];

export default function Conversas({ conversaInicial, onConversaIniciada }: ConversasProps) {
  const { clinica } = useAuth();
  const { showConfirm, showSuccess, showError } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<AbaConversa>('abertas');
  
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
  
  // Lead da conversa (tabela leads_ia)
  const [leadIA, setLeadIA] = useState<LeadIA | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);
  const [showEtapaDropdown, setShowEtapaDropdown] = useState(false);
  const [atualizandoEtapa, setAtualizandoEtapa] = useState(false);
  
  // Editar nome
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  
  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Anexos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Nova conversa
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoContato, setNovoContato] = useState({ nome: '', telefone: '' });
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [iniciandoConversa, setIniciandoConversa] = useState(false);
  const [abaNovaConversa, setAbaNovaConversa] = useState<'clientes' | 'leads'>('clientes');
  
  // Controle para conversa inicial de outras telas
  const conversaInicialProcessada = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);
  const etapaDropdownRef = useRef<HTMLDivElement>(null);

  // Carrega conversas
  useEffect(() => {
    if (CLINICA_ID) {
      fetchConversas();
      const interval = setInterval(fetchConversas, 30000);
      return () => clearInterval(interval);
    }
  }, [CLINICA_ID]);

  // Processar conversa inicial quando vier de outra tela
  useEffect(() => {
    if (conversaInicial && !conversaInicialProcessada.current && !loadingConversas && CLINICA_ID) {
      conversaInicialProcessada.current = true;
      iniciarConversa(conversaInicial.telefone, conversaInicial.nome);
      if (onConversaIniciada) {
        onConversaIniciada();
      }
    }
  }, [conversaInicial, loadingConversas, CLINICA_ID]);

  // Reset do controle quando mudar a conversa inicial
  useEffect(() => {
    if (!conversaInicial) {
      conversaInicialProcessada.current = false;
    }
  }, [conversaInicial]);

  // Polling de mensagens (a cada 3 segundos, sem loading visual)
  useEffect(() => {
    if (conversaSelecionada && CLINICA_ID) {
      const interval = setInterval(() => {
        fetchMensagensSilent(conversaSelecionada.id);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [conversaSelecionada, CLINICA_ID]);

  // Buscar lead quando selecionar conversa
  useEffect(() => {
    if (conversaSelecionada && CLINICA_ID) {
      fetchLeadIA(conversaSelecionada.id, conversaSelecionada.telefone);
    } else {
      setLeadIA(null);
    }
  }, [conversaSelecionada, CLINICA_ID]);

  // Fechar dropdown de etapa ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (etapaDropdownRef.current && !etapaDropdownRef.current.contains(event.target as Node)) {
        setShowEtapaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll para última mensagem apenas quando houver nova mensagem
  useEffect(() => {
    if (mensagens.length > 0) {
      const lastMsg = mensagens[mensagens.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMsg.id;
        if (!isFirstLoadRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
          isFirstLoadRef.current = false;
        }
      }
    }
  }, [mensagens]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Buscar lead pelo conversation_id ou telefone
  const fetchLeadIA = async (conversationId: number, telefone: string) => {
    if (!CLINICA_ID) return;
    
    setLoadingLead(true);
    try {
      // Primeiro tenta buscar pelo conversation_id (mais preciso)
      let { data, error } = await supabase
        .from('leads_ia')
        .select('*')
        .eq('clinica_id', CLINICA_ID)
        .eq('conversation_id', conversationId)
        .single();
      
      // Se não encontrou, tenta pelo telefone
      if (!data && telefone) {
        const telefoneNormalizado = telefone.replace(/\D/g, '');
        const resultado = await supabase
          .from('leads_ia')
          .select('*')
          .eq('clinica_id', CLINICA_ID)
          .or(`telefone.eq.${telefoneNormalizado},telefone.eq.+${telefoneNormalizado},telefone.ilike.%${telefoneNormalizado.slice(-9)}%`)
          .single();
        
        data = resultado.data;
        error = resultado.error;
      }
      
      if (data && !error) {
        setLeadIA(data);
      } else {
        setLeadIA(null);
      }
    } catch (error) {
      console.error('Erro ao buscar lead:', error);
      setLeadIA(null);
    } finally {
      setLoadingLead(false);
    }
  };

  // Atualizar etapa do lead
  const atualizarEtapaLead = async (novaEtapa: string) => {
    if (!leadIA || !CLINICA_ID) return;
    
    setAtualizandoEtapa(true);
    try {
      const { error } = await supabase
        .from('leads_ia')
        .update({ etapa: novaEtapa })
        .eq('id', leadIA.id);
      
      if (error) throw error;
      
      setLeadIA(prev => prev ? { ...prev, etapa: novaEtapa } : null);
      setShowEtapaDropdown(false);
      
      // Se convertido, converter para cliente
      if (novaEtapa === 'convertido') {
        await converterParaCliente();
      }
      
      showSuccess(`Etapa atualizada para "${ETAPAS_LEAD.find(e => e.id === novaEtapa)?.label}"`);
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      showError('Erro ao atualizar etapa');
    } finally {
      setAtualizandoEtapa(false);
    }
  };

  // Converter lead para cliente
  const converterParaCliente = async () => {
    if (!leadIA || !CLINICA_ID) return;
    
    try {
      // Verificar se já existe cliente com esse telefone
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('clinica_id', CLINICA_ID)
        .eq('telefone', leadIA.telefone)
        .single();
      
      if (!clienteExistente) {
        // Criar novo cliente
        await supabase
          .from('clientes')
          .insert({
            clinica_id: CLINICA_ID,
            nome: leadIA.nome,
            telefone: leadIA.telefone,
          });
        
        showSuccess('Lead convertido para cliente!');
      }
    } catch (error) {
      console.error('Erro ao converter para cliente:', error);
    }
  };

  // Salvar nome editado
  const salvarNome = async () => {
    if (!conversaSelecionada || !nomeTemp.trim() || !CLINICA_ID) return;
    
    setSalvandoNome(true);
    try {
      // Atualizar no leads_ia se existir
      if (leadIA) {
        const { error } = await supabase
          .from('leads_ia')
          .update({ nome: nomeTemp.trim() })
          .eq('id', leadIA.id);
        
        if (!error) {
          setLeadIA(prev => prev ? { ...prev, nome: nomeTemp.trim() } : null);
        }
      }
      
      // Atualizar localmente
      setConversaSelecionada(prev => prev ? { ...prev, nome: nomeTemp.trim() } : null);
      setConversas(prev => prev.map(c => 
        c.id === conversaSelecionada.id ? { ...c, nome: nomeTemp.trim() } : c
      ));
      
      setEditandoNome(false);
      showSuccess('Nome atualizado!');
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      showError('Erro ao salvar nome');
    } finally {
      setSalvandoNome(false);
    }
  };

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
            avatar: sender.thumbnail || sender.avatar_url || '',
            status: conv.status || 'open',
          };
        });

        setConversas(conversasFormatadas);
        
        // Seleciona primeira conversa da aba ativa se nenhuma selecionada
        if (!conversaSelecionada) {
          const conversasAba = conversasFormatadas.filter(c => 
            abaAtiva === 'abertas' ? c.status !== 'resolved' : c.status === 'resolved'
          );
          if (conversasAba.length > 0) {
            selecionarConversa(conversasAba[0]);
          }
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

  const fetchMensagensSilent = async (conversaId: number) => {
    if (!CLINICA_ID) return;
    
    try {
      const response = await fetch(
        `/api/chatwoot/messages?clinica_id=${CLINICA_ID}&conversation_id=${conversaId}`
      );
      const data = await response.json();
      
      if (data.payload) {
        const mensagensFormatadas = formatarMensagens(data.payload);
        
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
    if ((!mensagem.trim() && selectedFiles.length === 0 && !audioBlob) || !conversaSelecionada || !CLINICA_ID) return;
    
    setEnviandoMensagem(true);
    
    try {
      // Se a conversa está resolvida, reabre automaticamente
      if (conversaSelecionada.status === 'resolved') {
        await fetch('/api/chatwoot/conversations/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinica_id: CLINICA_ID,
            conversation_id: conversaSelecionada.id,
            status: 'open'
          })
        });
        
        // Atualiza o estado local
        setConversaSelecionada(prev => prev ? { ...prev, status: 'open' } : null);
        setConversas(prev => prev.map(c => 
          c.id === conversaSelecionada.id ? { ...c, status: 'open' } : c
        ));
      }
      
      const formData = new FormData();
      formData.append('clinica_id', CLINICA_ID);
      formData.append('conversation_id', conversaSelecionada.id.toString());
      formData.append('content', mensagem);
      
      if (replyingTo) {
        formData.append('reply_to', replyingTo.id.toString());
      }
      
      if (audioBlob) {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        formData.append('attachments[]', audioFile);
      }
      
      selectedFiles.forEach(file => {
        formData.append('attachments[]', file);
      });
      
      await fetch('/api/chatwoot/messages', {
        method: 'POST',
        body: formData
      });

      setMensagem('');
      setSelectedFiles([]);
      setReplyingTo(null);
      limparAudio();
      await fetchMensagensSilent(conversaSelecionada.id);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setEnviandoMensagem(false);
    }
  };

  // Toggle status da conversa (resolver/reabrir)
  const toggleStatusConversa = async () => {
    if (!conversaSelecionada || !CLINICA_ID) return;
    
    const novoStatus = conversaSelecionada.status === 'resolved' ? 'open' : 'resolved';
    
    try {
      const response = await fetch('/api/chatwoot/conversations/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: CLINICA_ID,
          conversation_id: conversaSelecionada.id,
          status: novoStatus
        })
      });
      
      if (response.ok) {
        setConversaSelecionada(prev => prev ? { ...prev, status: novoStatus } : null);
        setConversas(prev => prev.map(c => 
          c.id === conversaSelecionada.id ? { ...c, status: novoStatus } : c
        ));
        showSuccess(novoStatus === 'resolved' ? 'Conversa resolvida!' : 'Conversa reaberta!');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showError('Erro ao alterar status da conversa');
    }
  };

  // Deletar conversa
  const deletarConversa = async () => {
    if (!conversaSelecionada || !CLINICA_ID) return;
    
    showConfirm(
      `Tem certeza que deseja deletar a conversa com ${conversaSelecionada.nome}? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          const response = await fetch('/api/chatwoot/conversations/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clinica_id: CLINICA_ID,
              conversation_id: conversaSelecionada.id
            })
          });
          
          if (response.ok) {
            const novasConversas = conversas.filter(c => c.id !== conversaSelecionada.id);
            setConversas(novasConversas);
            setConversaSelecionada(null);
            setMensagens([]);
            showSuccess('Conversa deletada com sucesso!');
          } else {
            showError('Erro ao deletar conversa');
          }
        } catch (error) {
          console.error('Erro ao deletar conversa:', error);
          showError('Erro ao deletar conversa');
        }
      },
      'Deletar conversa'
    );
  };

  // Gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
  
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
  
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        audioContext.close();
      };
  
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioWaveform([]);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      const updateWaveform = () => {
        if (analyserRef.current && isRecording) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const normalized = average / 255;
          
          setAudioWaveform(prev => {
            const newWaveform = [...prev, normalized];
            if (newWaveform.length > 100) {
              return newWaveform.slice(-100);
            }
            return newWaveform;
          });
          
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        }
      };
      
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      showError('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioWaveform([]);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      audioChunksRef.current = [];
    }
  };

  const limparAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlayingPreview(false);
    setAudioWaveform([]);
  };

  const togglePlayPreview = () => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
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

  // Nova conversa - buscar clientes e leads
  const fetchClientesELeads = async () => {
    if (!CLINICA_ID) return;
    
    setLoadingClientes(true);
    try {
      // Buscar clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email')
        .eq('clinica_id', CLINICA_ID)
        .order('nome');
      
      if (clientesData) {
        setClientes(clientesData);
      }
      
      // Buscar leads do pipeline
      const { data: leadsData } = await supabase
        .from('pipeline')
        .select('id, nome, telefone, interesse, etapa')
        .eq('clinica_id', CLINICA_ID)
        .not('etapa', 'eq', 'convertido')
        .order('nome');
      
      if (leadsData) {
        setLeads(leadsData);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes e leads:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const abrirNovaConversa = () => {
    setShowNovaConversa(true);
    fetchClientesELeads();
  };

  const iniciarConversa = async (telefone: string, nome: string) => {
    if (!CLINICA_ID || !telefone) return;
    
    setIniciandoConversa(true);
    
    try {
      const response = await fetch('/api/chatwoot/new-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: CLINICA_ID,
          phone_number: telefone.replace(/\D/g, ''),
          name: nome
        })
      });
      
      const data = await response.json();
      
      if (data.conversation_id) {
        setShowNovaConversa(false);
        setBuscaCliente('');
        setNovoContato({ nome: '', telefone: '' });
        
        const conversasResponse = await fetch(`/api/chatwoot/conversations?clinica_id=${CLINICA_ID}`);
        const conversasData = await conversasResponse.json();
        
        if (conversasData.data?.payload) {
          const conversasFormatadas: Conversa[] = conversasData.data.payload.map((conv: any) => {
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
              nome: sender.name || nome,
              telefone: sender.phone_number || telefone,
              ultima: ultimaMsg,
              tempo: tempoPassado,
              naoLida: conv.unread_count > 0,
              humano: labels.includes('humano'),
              anotacao: '',
              chatwootLabels: labels,
              avatar: sender.thumbnail || sender.avatar_url || '',
              status: conv.status || 'open',
            };
          });
  
          setConversas(conversasFormatadas);
          setAbaAtiva('abertas'); // Muda para aba abertas
          
          const novaConversa = conversasFormatadas.find(c => c.id === data.conversation_id);
          if (novaConversa) {
            selecionarConversa(novaConversa);
          }
        }
      } else {
        showError('Erro ao criar conversa');
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      showError('Erro ao iniciar conversa');
    } finally {
      setIniciandoConversa(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) ||
      c.telefone.includes(busca) ||
      c.email?.toLowerCase().includes(busca)
    );
  }, [clientes, buscaCliente]);

  const leadsFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return leads;
    const busca = buscaCliente.toLowerCase();
    return leads.filter(l => 
      l.nome.toLowerCase().includes(busca) ||
      l.telefone?.includes(busca) ||
      l.interesse?.toLowerCase().includes(busca)
    );
  }, [leads, buscaCliente]);

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
    setEditandoNome(false);
    limparAudio();
    lastMessageIdRef.current = 0;
    fetchMensagens(conv.id);
  };

  // Filtrar conversas por aba e busca
  const conversasFiltradas = useMemo(() => {
    let filtered = conversas;
    
    // Filtrar por aba
    if (abaAtiva === 'abertas') {
      filtered = filtered.filter(c => c.status !== 'resolved');
    } else {
      filtered = filtered.filter(c => c.status === 'resolved');
    }
    
    // Filtrar por busca
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase();
      filtered = filtered.filter(c => 
        c.nome.toLowerCase().includes(termoBusca) ||
        c.telefone.includes(termoBusca) ||
        c.ultima.toLowerCase().includes(termoBusca)
      );
    }
    
    return filtered;
  }, [conversas, abaAtiva, busca]);

  // Contadores para as abas
  const contadorAbertas = conversas.filter(c => c.status !== 'resolved').length;
  const contadorResolvidas = conversas.filter(c => c.status === 'resolved').length;

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

  // Renderiza avatar
  const renderAvatar = (conversa: Conversa, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg'
    };
    
    if (conversa.avatar) {
      return (
        <img 
          src={conversa.avatar} 
          alt={conversa.nome}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold`}>
        {conversa.nome.charAt(0).toUpperCase()}
      </div>
    );
  };

  const getEtapaInfo = (etapaId: string) => {
    return ETAPAS_LEAD.find(e => e.id === etapaId) || ETAPAS_LEAD[0];
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
            <div className="flex items-center gap-1">
              <button 
                onClick={abrirNovaConversa}
                className="p-2 hover:bg-[#334155] rounded-lg transition-colors text-[#10b981]"
                title="Nova conversa"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={fetchConversas}
                className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={16} className={loadingConversas ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Abas Abertas/Resolvidas */}
          <div className="flex gap-1 mb-3 bg-[#0f172a] rounded-lg p-1">
            <button
              onClick={() => setAbaAtiva('abertas')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                abaAtiva === 'abertas' 
                  ? 'bg-[#334155] text-white' 
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              <Clock size={14} />
              Abertas
              {contadorAbertas > 0 && (
                <span className="bg-[#10b981] text-white text-xs px-1.5 py-0.5 rounded-full">
                  {contadorAbertas}
                </span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('resolvidas')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                abaAtiva === 'resolvidas' 
                  ? 'bg-[#334155] text-white' 
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              <CheckCircle size={14} />
              Resolvidas
              {contadorResolvidas > 0 && (
                <span className="bg-[#64748b] text-white text-xs px-1.5 py-0.5 rounded-full">
                  {contadorResolvidas}
                </span>
              )}
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
              <p>Nenhuma conversa {abaAtiva === 'abertas' ? 'aberta' : 'resolvida'}</p>
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
                  {renderAvatar(conv, 'lg')}
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
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {renderAvatar(conversaSelecionada, 'md')}
                <div className="min-w-0 flex-1">
                  {/* Nome editável */}
                  {editandoNome ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nomeTemp}
                        onChange={(e) => setNomeTemp(e.target.value)}
                        className="bg-[#0f172a] border border-[#334155] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#10b981] w-40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarNome();
                          if (e.key === 'Escape') setEditandoNome(false);
                        }}
                      />
                      <button
                        onClick={salvarNome}
                        disabled={salvandoNome}
                        className="p-1 hover:bg-[#334155] rounded text-[#10b981]"
                      >
                        {salvandoNome ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={() => setEditandoNome(false)}
                        className="p-1 hover:bg-[#334155] rounded text-[#64748b]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{conversaSelecionada.nome}</p>
                      <button
                        onClick={() => {
                          setNomeTemp(conversaSelecionada.nome);
                          setEditandoNome(true);
                        }}
                        className="p-1 hover:bg-[#334155] rounded text-[#64748b] hover:text-white"
                        title="Editar nome"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[#64748b]">{conversaSelecionada.telefone}</p>
                </div>
                
                {/* Etapa do Pipeline */}
                <div className="relative" ref={etapaDropdownRef}>
                  {loadingLead ? (
                    <div className="px-3 py-1.5 rounded-lg bg-[#334155]">
                      <Loader2 size={14} className="animate-spin text-[#64748b]" />
                    </div>
                  ) : leadIA ? (
                    <button
                      onClick={() => setShowEtapaDropdown(!showEtapaDropdown)}
                      disabled={atualizandoEtapa}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${getEtapaInfo(leadIA.etapa).bgCor} ${getEtapaInfo(leadIA.etapa).textCor}`}
                    >
                      {atualizandoEtapa ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <span>{getEtapaInfo(leadIA.etapa).label}</span>
                          <ChevronDown size={14} />
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-[#64748b] px-3 py-1.5 bg-[#334155] rounded-lg">
                      Sem lead
                    </span>
                  )}
                  
                  {/* Dropdown de etapas */}
                  {showEtapaDropdown && leadIA && (
                    <div className="absolute top-full right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-lg z-50 min-w-[160px]">
                      {ETAPAS_LEAD.map((etapa) => (
                        <button
                          key={etapa.id}
                          onClick={() => atualizarEtapaLead(etapa.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#334155] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            leadIA.etapa === etapa.id ? 'bg-[#334155]' : ''
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${etapa.cor}`}></div>
                          <span className={leadIA.etapa === etapa.id ? etapa.textCor : ''}>{etapa.label}</span>
                          {leadIA.etapa === etapa.id && (
                            <Check size={14} className={`ml-auto ${etapa.textCor}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Botão Resolver/Reabrir */}
                <button
                  onClick={toggleStatusConversa}
                  className={`p-2 rounded-lg transition-colors ${
                    conversaSelecionada.status === 'resolved'
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                  title={conversaSelecionada.status === 'resolved' ? 'Reabrir conversa' : 'Resolver conversa'}
                >
                  {conversaSelecionada.status === 'resolved' ? (
                    <Clock size={20} />
                  ) : (
                    <CheckCircle size={20} />
                  )}
                </button>
                
                {/* Botão Deletar */}
                <button
                  onClick={deletarConversa}
                  className="p-2 rounded-lg transition-colors bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  title="Deletar conversa"
                >
                  <Trash2 size={20} />
                </button>
                
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
                        {msg.replyTo && (
                          <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
                            msg.tipo === 'enviada' 
                              ? 'bg-[#059669] border-white/50' 
                              : 'bg-[#334155] border-[#10b981]'
                          }`}>
                            <p className="opacity-75 truncate">{msg.replyTo.content || 'Mensagem'}</p>
                          </div>
                        )}
                        
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

          {/* Preview de áudio gravado */}
          {audioUrl && !isRecording && (
            <div className="bg-[#1e293b] border-t border-[#334155] px-4 py-3 flex-shrink-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center h-12 bg-[#0f172a] rounded-lg overflow-hidden px-2">
                  <div className="flex items-center gap-[2px] h-full w-full justify-center">
                    {audioWaveform.length > 0 ? (
                      audioWaveform.map((value, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-[#10b981] rounded-full"
                          style={{ height: `${Math.max(4, value * 40)}px` }}
                        />
                      ))
                    ) : (
                      <div className="flex items-center gap-[2px]">
                        {[...Array(50)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-[#10b981] rounded-full"
                            style={{ height: '8px' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayPreview}
                    className="p-2 bg-[#10b981] hover:bg-[#059669] rounded-full transition-colors"
                  >
                    {isPlayingPreview ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <audio 
                    ref={audioPreviewRef} 
                    src={audioUrl} 
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                  <span className="text-sm text-[#64748b]">{formatRecordingTime(recordingTime)}</span>
                  <div className="flex-1"></div>
                  <button
                    onClick={limparAudio}
                    className="p-2 hover:bg-[#334155] rounded-lg text-red-400 transition-colors"
                    title="Descartar áudio"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={enviarMensagem}
                    disabled={enviandoMensagem}
                    className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {enviandoMensagem ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        Enviar
                      </>
                    )}
                  </button>
                </div>
              </div>
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
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center h-16 bg-[#0f172a] rounded-lg overflow-hidden px-2">
                  <div className="flex items-center gap-[2px] h-full">
                    {audioWaveform.length === 0 ? (
                      <div className="flex items-center gap-[2px]">
                        {[...Array(50)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-[#10b981] rounded-full animate-pulse"
                            style={{ 
                              height: `${Math.random() * 20 + 5}px`,
                              animationDelay: `${i * 50}ms`
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      audioWaveform.map((value, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-[#10b981] rounded-full transition-all duration-75"
                          style={{ height: `${Math.max(4, value * 50)}px` }}
                        />
                      ))
                    )}
                  </div>
                </div>
                
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
                    title="Parar e revisar"
                  >
                    <Square size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => { e.preventDefault(); enviarMensagem(); }}
                className="flex items-center gap-2"
              >
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
                
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  disabled={enviandoMensagem}
                />
                
                {mensagem.trim() || selectedFiles.length > 0 || audioBlob ? (
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

      {/* Modal Nova Conversa */}
      {showNovaConversa && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowNovaConversa(false)}
          ></div>
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-[#334155] flex items-center justify-between">
                <h3 className="font-semibold text-lg">Nova Conversa</h3>
                <button
                  onClick={() => setShowNovaConversa(false)}
                  className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Abas Clientes/Leads */}
              <div className="p-4 border-b border-[#334155]">
                <div className="flex gap-1 mb-3 bg-[#0f172a] rounded-lg p-1">
                  <button
                    onClick={() => setAbaNovaConversa('clientes')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      abaNovaConversa === 'clientes' 
                        ? 'bg-[#334155] text-white' 
                        : 'text-[#64748b] hover:text-white'
                    }`}
                  >
                    Clientes ({clientes.length})
                  </button>
                  <button
                    onClick={() => setAbaNovaConversa('leads')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      abaNovaConversa === 'leads' 
                        ? 'bg-[#334155] text-white' 
                        : 'text-[#64748b] hover:text-white'
                    }`}
                  >
                    Leads ({leads.length})
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={18} />
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder={abaNovaConversa === 'clientes' ? "Buscar cliente..." : "Buscar lead..."}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {loadingClientes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-[#10b981]" />
                  </div>
                ) : abaNovaConversa === 'clientes' ? (
                  // Lista de Clientes
                  clientesFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-[#64748b]">
                      <p>Nenhum cliente encontrado</p>
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => iniciarConversa(cliente.telefone, cliente.nome)}
                        disabled={iniciandoConversa || !cliente.telefone}
                        className="w-full flex items-center gap-3 p-4 hover:bg-[#334155] transition-colors text-left border-b border-[#334155] disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold">
                          {cliente.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cliente.nome}</p>
                          <p className="text-sm text-[#64748b]">{cliente.telefone || 'Sem telefone'}</p>
                        </div>
                        <MessageSquare size={18} className="text-[#10b981]" />
                      </button>
                    ))
                  )
                ) : (
                  // Lista de Leads
                  leadsFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-[#64748b]">
                      <p>Nenhum lead encontrado</p>
                    </div>
                  ) : (
                    leadsFiltrados.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => iniciarConversa(lead.telefone, lead.nome)}
                        disabled={iniciandoConversa || !lead.telefone}
                        className="w-full flex items-center gap-3 p-4 hover:bg-[#334155] transition-colors text-left border-b border-[#334155] disabled:opacity-50"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {lead.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#64748b]">{lead.telefone || 'Sem telefone'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${getEtapaInfo(lead.etapa).bgCor} ${getEtapaInfo(lead.etapa).textCor}`}>
                              {getEtapaInfo(lead.etapa).label}
                            </span>
                          </div>
                          {lead.interesse && (
                            <p className="text-xs text-[#64748b] truncate">{lead.interesse}</p>
                          )}
                        </div>
                        <MessageSquare size={18} className="text-blue-400" />
                      </button>
                    ))
                  )
                )}
              </div>
              
              <div className="p-4 border-t border-[#334155]">
                <p className="text-sm text-[#64748b] mb-3">Ou digite um novo número:</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={novoContato.nome}
                    onChange={(e) => setNovoContato(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome"
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                  />
                  <input
                    type="text"
                    value={novoContato.telefone}
                    onChange={(e) => setNovoContato(prev => ({ ...prev, telefone: e.target.value }))}
                    placeholder="Telefone (ex: 5511999999999)"
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#10b981]"
                  />
                  <button
                    onClick={() => iniciarConversa(novoContato.telefone, novoContato.nome || 'Novo contato')}
                    disabled={!novoContato.telefone || iniciandoConversa}
                    className="w-full bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] disabled:text-[#64748b] text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {iniciandoConversa ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <MessageSquare size={18} />
                        Iniciar Conversa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
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
