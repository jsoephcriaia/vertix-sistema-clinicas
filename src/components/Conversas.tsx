'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Send, User, StickyNote, X, Check, CheckCheck, Settings, Loader2, RefreshCw, Download, FileText, Smile, Paperclip, Mic, Square, Reply, Plus, Phone, MessageSquare, Play, Pause, Trash2, CheckCircle, Clock, Edit3, ChevronDown, CalendarPlus, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';
import { supabase } from '@/lib/supabase';
import EmojiPicker from './EmojiPicker';
import PainelInteresse from './PainelInteresse';
import PainelAgendamentos from './PainelAgendamentos';

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
  status?: 'sent' | 'delivered' | 'read' | 'failed';
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
  avatar?: string | null;
}

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  interesse?: string;
  etapa: string;
  avatar?: string | null;
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
  const { showConfirm, showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<AbaConversa>('abertas');

  const [loadingConversas, setLoadingConversas] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [chatwootConfigurado, setChatwootConfigurado] = useState(true);

  // Estados para validações de funcionalidades
  const [whatsappConectado, setWhatsappConectado] = useState<boolean | null>(null);
  const [iaAtiva, setIaAtiva] = useState<boolean | null>(null); // null = ainda carregando
  const [googleConectado, setGoogleConectado] = useState(false);
  const [horariosDefinidos, setHorariosDefinidos] = useState(false);
  const [profissionaisComHorario, setProfissionaisComHorario] = useState(false);
  const [procedimentosDefinidos, setProcedimentosDefinidos] = useState(false);
  const [loadingValidacoes, setLoadingValidacoes] = useState(true);
  
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
  
  // Paineis laterais
  const [showPainelInteresse, setShowPainelInteresse] = useState(false);
  const [showPainelAgendamentos, setShowPainelAgendamentos] = useState(false);
  
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

  // Função para buscar validações
  const fetchValidacoes = useCallback(async () => {
    if (!CLINICA_ID) return;

    setLoadingValidacoes(true);
    try {
      // Buscar dados da clínica
      const { data: clinicaData } = await supabase
        .from('clinicas')
        .select('uazapi_instance_token, agente_ia_pausado, google_tokens')
        .eq('id', CLINICA_ID)
        .single();

      if (clinicaData) {
        setWhatsappConectado(!!clinicaData.uazapi_instance_token);
        // agente_ia_pausado: true = IA pausada, false/null = IA ativa
        setIaAtiva(clinicaData.agente_ia_pausado !== true);
        setGoogleConectado(!!clinicaData.google_tokens);
      }

      // Buscar horários da clínica
      const { data: horariosData } = await supabase
        .from('horarios')
        .select('id')
        .eq('clinica_id', CLINICA_ID)
        .eq('ativo', true)
        .limit(1);

      setHorariosDefinidos(!!horariosData && horariosData.length > 0);

      // Buscar profissionais ativos
      const { data: profissionaisData } = await supabase
        .from('equipe')
        .select('id')
        .eq('clinica_id', CLINICA_ID)
        .eq('ativo', true)
        .limit(1);

      setProfissionaisComHorario(!!profissionaisData && profissionaisData.length > 0);

      // Buscar procedimentos ativos
      const { data: procedimentosData } = await supabase
        .from('procedimentos')
        .select('id')
        .eq('clinica_id', CLINICA_ID)
        .eq('ativo', true)
        .limit(1);

      setProcedimentosDefinidos(!!procedimentosData && procedimentosData.length > 0);
    } catch (error) {
      console.error('Erro ao buscar validações:', error);
    } finally {
      setLoadingValidacoes(false);
    }
  }, [CLINICA_ID]);

  // Carrega validações ao montar
  useEffect(() => {
    fetchValidacoes();
  }, [fetchValidacoes]);

  // Escutar mudanças no status da IA (de ConfigAvancado)
  useEffect(() => {
    const handleIaStatusChanged = () => {
      fetchValidacoes();
    };
    window.addEventListener('iaStatusChanged', handleIaStatusChanged);
    return () => window.removeEventListener('iaStatusChanged', handleIaStatusChanged);
  }, [fetchValidacoes]);

  // Carrega conversas
  useEffect(() => {
    if (CLINICA_ID) {
      fetchConversas();
      const interval = setInterval(() => fetchConversas(true), 30000);
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

  // Buscar lead quando selecionar conversa (só quando muda o ID)
  useEffect(() => {
    if (conversaSelecionada && CLINICA_ID) {
      fetchLeadIA(conversaSelecionada.id, conversaSelecionada.telefone, conversaSelecionada.avatar);
    } else {
      setLeadIA(null);
    }
  }, [conversaSelecionada?.id, CLINICA_ID]);

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
  const fetchLeadIA = async (conversationId: number, telefone: string, avatar?: string) => {
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
        // Sincroniza avatar do Chatwoot → leads_ia
        if (avatar && avatar !== data.avatar) {
          await supabase
            .from('leads_ia')
            .update({ avatar })
            .eq('id', data.id);
          data.avatar = avatar;
        }

        setLeadIA(data);

        // Se o lead tem nome, atualiza o nome da conversa selecionada
        if (data.nome && conversaSelecionada) {
          setConversaSelecionada(prev => prev ? { ...prev, nome: data.nome } : null);
          setConversas(prev => prev.map(c => 
            c.id === conversationId ? { ...c, nome: data.nome } : c
          ));
        }
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
      
      showToast(`Etapa atualizada para "${ETAPAS_LEAD.find(e => e.id === novaEtapa)?.label}"`, 'success');
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      showToast('Erro ao atualizar etapa', 'error');
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
        
        showToast('Lead convertido para cliente!', 'success');
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
      showToast('Nome atualizado!', 'success');
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      showToast('Erro ao salvar nome', 'error');
    } finally {
      setSalvandoNome(false);
    }
  };

  const fetchConversas = async (isPolling = false) => {
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
        const novasConversas: Conversa[] = data.data.payload.map((conv: any) => {
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

        // Atualização inteligente: mantém referências de objetos que não mudaram
        setConversas(prevConversas => {
          // Se é primeira carga, retorna tudo
          if (prevConversas.length === 0 || !isPolling) {
            return novasConversas;
          }

          // Verifica se há diferenças
          let hasChanges = novasConversas.length !== prevConversas.length;

          if (!hasChanges) {
            for (const nova of novasConversas) {
              const antiga = prevConversas.find(c => c.id === nova.id);
              if (!antiga ||
                  antiga.ultima !== nova.ultima ||
                  antiga.naoLida !== nova.naoLida ||
                  antiga.status !== nova.status ||
                  antiga.humano !== nova.humano ||
                  antiga.tempo !== nova.tempo) {
                hasChanges = true;
                break;
              }
            }
          }

          // Se não há mudanças, retorna o array anterior (mesma referência = sem re-render)
          if (!hasChanges) {
            return prevConversas;
          }

          // Faz merge: mantém objetos inalterados, atualiza só os que mudaram
          return novasConversas.map(nova => {
            const antiga = prevConversas.find(c => c.id === nova.id);
            if (antiga &&
                antiga.ultima === nova.ultima &&
                antiga.naoLida === nova.naoLida &&
                antiga.status === nova.status &&
                antiga.humano === nova.humano &&
                antiga.tempo === nova.tempo &&
                antiga.nome === nova.nome) {
              // Retorna objeto antigo (mesma referência)
              return antiga;
            }
            // Retorna novo objeto
            return nova;
          });
        });

        // Seleciona primeira conversa da aba ativa se nenhuma selecionada
        if (!conversaSelecionada) {
          const conversasAba = novasConversas.filter(c =>
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
        const novasMensagens = formatarMensagens(data.payload);

        // Atualização inteligente: só atualiza se houver mudanças reais
        setMensagens(prevMensagens => {
          // Verifica se última mensagem é diferente (nova mensagem chegou)
          const ultimaNova = novasMensagens[novasMensagens.length - 1];
          const ultimaAnterior = prevMensagens[prevMensagens.length - 1];

          // Se não há mudanças, retorna array anterior (mesma referência = sem re-render)
          if (novasMensagens.length === prevMensagens.length &&
              ultimaNova?.id === ultimaAnterior?.id &&
              ultimaNova?.status === ultimaAnterior?.status) {
            return prevMensagens;
          }

          // Se há novas mensagens, faz merge mantendo referências antigas
          return novasMensagens.map(nova => {
            const antiga = prevMensagens.find(m => m.id === nova.id);
            // Se mensagem existe e não mudou, retorna referência antiga
            if (antiga && antiga.status === nova.status && antiga.texto === nova.texto) {
              return antiga;
            }
            return nova;
          });
        });
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
        status: msg.status as 'sent' | 'delivered' | 'read' | 'failed' | undefined,
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
        showToast(novoStatus === 'resolved' ? 'Conversa resolvida!' : 'Conversa reaberta!', 'success');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showToast('Erro ao alterar status da conversa', 'error');
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
            showToast('Conversa deletada com sucesso!', 'success');
          } else {
            showToast('Erro ao deletar conversa', 'error');
          }
        } catch (error) {
          console.error('Erro ao deletar conversa:', error);
          showToast('Erro ao deletar conversa', 'error');
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
      showToast('Não foi possível acessar o microfone', 'error');
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
        .select('id, nome, telefone, email, avatar')
        .eq('clinica_id', CLINICA_ID)
        .order('nome');

      if (clientesData) {
        setClientes(clientesData);
      }

      // Buscar leads do pipeline/leads_ia
      const { data: leadsData } = await supabase
        .from('leads_ia')
        .select('id, nome, telefone, procedimento_interesse, etapa, avatar')
        .eq('clinica_id', CLINICA_ID)
        .not('etapa', 'eq', 'convertido')
        .order('nome');
      
      if (leadsData) {
        // Map leads_ia fields to Lead interface
        const leadsMapped = leadsData.map(l => ({
          id: l.id,
          nome: l.nome || 'Sem nome',
          telefone: l.telefone || '',
          interesse: l.procedimento_interesse || '',
          etapa: l.etapa || 'novo',
          avatar: l.avatar || null,
        }));
        setLeads(leadsMapped);
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
        showToast('Erro ao criar conversa', 'error');
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      showToast('Erro ao iniciar conversa', 'error');
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

  // Formatar telefone com máscara
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
  };

  // Validar telefone (mínimo 10 dígitos)
  const validarTelefone = (telefone: string): boolean => {
    const numeros = telefone.replace(/\D/g, '');
    return numeros.length >= 10;
  };

  // Preparar telefone para salvar (adiciona 55 se não tiver)
  const prepararTelefoneParaSalvar = (telefone: string): string => {
    const numeros = telefone.replace(/\D/g, '');
    if (numeros.startsWith('55')) return numeros;
    return '55' + numeros;
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

  const selecionarConversa = async (conv: Conversa) => {
    setConversaSelecionada(conv);
    setShowAnotacao(false);
    setReplyingTo(null);
    setSelectedFiles([]);
    setEditandoNome(false);
    limparAudio();
    lastMessageIdRef.current = 0;
    fetchMensagens(conv.id);

    // Marca a conversa como lida no Chatwoot
    if (conv.naoLida && CLINICA_ID) {
      try {
        await fetch('/api/chatwoot/conversations/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinica_id: CLINICA_ID,
            conversation_id: conv.id
          })
        });

        // Atualiza o estado local para remover indicador de não lida
        setConversas(prev => prev.map(c =>
          c.id === conv.id ? { ...c, naoLida: false } : c
        ));
        setConversaSelecionada(prev => prev ? { ...prev, naoLida: false } : null);

        // Dispara evento para atualizar o contador do Sidebar
        window.dispatchEvent(new CustomEvent('conversaLida'));
      } catch (error) {
        console.error('Erro ao marcar conversa como lida:', error);
      }
    }
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
          isEnviada ? 'bg-primary-hover' : 'bg-[var(--theme-bg-tertiary)]'
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
      <div className={`${sizeClasses[size]} rounded-full bg-primary flex items-center justify-center text-white font-bold`}>
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
          <div className="w-20 h-20 bg-[var(--theme-bg-tertiary)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={40} className="text-[var(--theme-text-muted)]" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Chatwoot não configurado</h2>
          <p className="text-[var(--theme-text-muted)] mb-4">Configure a integração com o Chatwoot para ver as conversas.</p>
          <p className="text-primary">
            Vá em Configurações → Integrações
          </p>
        </div>
      </div>
    );
  }

  // Se WhatsApp não está conectado
  if (!loadingValidacoes && whatsappConectado === false) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)] -m-4 lg:-m-6">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone size={40} className="text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">WhatsApp não conectado</h2>
          <p className="text-[var(--theme-text-muted)] mb-4">Conecte seu WhatsApp para começar a conversar com seus clientes.</p>
          <p className="text-primary">
            Vá em Configurações → WhatsApp
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-48px)] -m-4 lg:-m-6 overflow-hidden">
      {/* Lista de conversas */}
      <div className="w-80 bg-[var(--theme-card)] border-r border-[var(--theme-card-border)] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversas</h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={abrirNovaConversa}
                className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors text-primary"
                title="Nova conversa"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => fetchConversas()}
                className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={16} className={loadingConversas ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Abas Abertas/Resolvidas */}
          <div className="flex gap-1 mb-3 bg-[var(--theme-bg)] rounded-lg p-1">
            <button
              onClick={() => setAbaAtiva('abertas')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                abaAtiva === 'abertas' 
                  ? 'bg-[var(--theme-bg-tertiary)] text-white' 
                  : 'text-[var(--theme-text-muted)] hover:text-white'
              }`}
            >
              <Clock size={14} />
              Abertas
              {contadorAbertas > 0 && (
                <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                  {contadorAbertas}
                </span>
              )}
            </button>
            <button
              onClick={() => setAbaAtiva('resolvidas')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                abaAtiva === 'resolvidas' 
                  ? 'bg-[var(--theme-bg-tertiary)] text-white' 
                  : 'text-[var(--theme-text-muted)] hover:text-white'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={18} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {loadingConversas ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-[var(--theme-text-muted)]">
              <p>Nenhuma conversa {abaAtiva === 'abertas' ? 'aberta' : 'resolvida'}</p>
            </div>
          ) : (
            conversasFiltradas.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selecionarConversa(conv)}
                className={`w-full flex items-center gap-3 p-4 border-b border-[var(--theme-card-border)] hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left ${
                  conversaSelecionada?.id === conv.id ? 'bg-[var(--theme-bg-tertiary)]' : ''
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
                    <span className="text-xs text-[var(--theme-text-muted)] flex-shrink-0 ml-2">{conv.tempo}</span>
                  </div>
                  <p className="text-sm text-[var(--theme-text-muted)] truncate">{conv.ultima}</p>
                </div>
                {conv.naoLida && (
                  <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Área de chat */}
      {conversaSelecionada ? (
        <div className="flex-1 flex flex-col bg-[var(--theme-bg)] min-w-0 overflow-hidden">
          {/* Header do chat */}
          <div className="bg-[var(--theme-card)] border-b border-[var(--theme-card-border)] p-4 flex-shrink-0">
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
                        className="bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-primary w-40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarNome();
                          if (e.key === 'Escape') setEditandoNome(false);
                        }}
                      />
                      <button
                        onClick={salvarNome}
                        disabled={salvandoNome}
                        className="p-1 hover:bg-[var(--theme-bg-tertiary)] rounded text-primary"
                      >
                        {salvandoNome ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={() => setEditandoNome(false)}
                        className="p-1 hover:bg-[var(--theme-bg-tertiary)] rounded text-[var(--theme-text-muted)]"
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
                        className="p-1 hover:bg-[var(--theme-bg-tertiary)] rounded text-[var(--theme-text-muted)] hover:text-white"
                        title="Editar nome"
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[var(--theme-text-muted)]">{conversaSelecionada.telefone}</p>
                </div>
                
                {/* Etapa do Pipeline */}
                <div className="relative" ref={etapaDropdownRef}>
                  {loadingLead ? (
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--theme-bg-tertiary)]">
                      <Loader2 size={14} className="animate-spin text-[var(--theme-text-muted)]" />
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
                    <span className="text-xs text-[var(--theme-text-muted)] px-3 py-1.5 bg-[var(--theme-bg-tertiary)] rounded-lg">
                      Sem lead
                    </span>
                  )}
                  
                  {/* Dropdown de etapas */}
                  {showEtapaDropdown && leadIA && (
                    <div className="absolute top-full right-0 mt-1 bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg shadow-lg z-50 min-w-[160px]">
                      {ETAPAS_LEAD.map((etapa) => (
                        <button
                          key={etapa.id}
                          onClick={() => atualizarEtapaLead(etapa.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--theme-bg-tertiary)] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            leadIA.etapa === etapa.id ? 'bg-[var(--theme-bg-tertiary)]' : ''
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
                
                {/* Botão Procedimentos de Interesse */}
                <button
                  onClick={() => {
                    if (!leadIA) {
                      showToast('Sem lead vinculado a esta conversa', 'warning');
                      return;
                    }
                    if (!procedimentosDefinidos) {
                      showToast('Cadastre procedimentos em Configurações → Procedimentos', 'warning');
                      return;
                    }
                    setShowPainelInteresse(true);
                  }}
                  className={`p-2 rounded-lg transition-colors bg-primary/20 text-primary hover:bg-primary/30 ${
                    (!leadIA || !procedimentosDefinidos) ? 'opacity-50' : ''
                  }`}
                  title="Procedimentos de Interesse"
                >
                  <Package size={20} />
                </button>
                
                {/* Botão Agendar */}
                <button
                  onClick={() => {
                    if (!leadIA) {
                      showToast('Sem lead vinculado a esta conversa', 'warning');
                      return;
                    }
                    if (!googleConectado) {
                      showToast('Conecte o Google Calendar em Configurações → Integrações', 'warning');
                      return;
                    }
                    if (!horariosDefinidos) {
                      showToast('Defina os horários da clínica em Configurações → Horários', 'warning');
                      return;
                    }
                    if (!profissionaisComHorario) {
                      showToast('Cadastre profissionais em Configurações → Equipe', 'warning');
                      return;
                    }
                    setShowPainelAgendamentos(true);
                  }}
                  className={`p-2 rounded-lg transition-colors bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 ${
                    (!leadIA || !googleConectado || !horariosDefinidos || !profissionaisComHorario) ? 'opacity-50' : ''
                  }`}
                  title="Agendamentos"
                >
                  <CalendarPlus size={20} />
                </button>
                
                <button
                  onClick={abrirAnotacao}
                  className={`p-2 rounded-lg transition-colors relative ${
                    conversaSelecionada.anotacao 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-card-border)]'
                  }`}
                  title="Anotações"
                >
                  <StickyNote size={20} />
                  {conversaSelecionada.anotacao && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    if (iaAtiva === false) {
                      showToast('Secretária IA está desativada. Ative em Configurações → Avançado', 'info');
                      return;
                    }
                    toggleHumano();
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    conversaSelecionada.humano || iaAtiva === false
                      ? 'bg-orange-500 text-white'
                      : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-card-border)]'
                  } ${iaAtiva === false ? 'cursor-not-allowed' : ''}`}
                  title={iaAtiva === false ? "Secretária IA desativada" : "Alternar modo humano"}
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
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            ) : mensagens.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--theme-text-muted)]">
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
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--theme-bg-tertiary)] rounded transition-all self-center"
                          title="Responder"
                        >
                          <Reply size={16} className="text-[var(--theme-text-muted)]" />
                        </button>
                      )}
                      
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          msg.tipo === 'enviada'
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-[var(--theme-card)] text-white rounded-bl-md'
                        }`}
                      >
                        {msg.replyTo && (
                          <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
                            msg.tipo === 'enviada' 
                              ? 'bg-primary-hover border-white/50' 
                              : 'bg-[var(--theme-bg-tertiary)] border-primary'
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

                        <div className={`flex items-center justify-end gap-1 mt-1 ${msg.tipo === 'enviada' ? 'text-green-200' : 'text-[var(--theme-text-muted)]'}`}>
                          <span className="text-xs">{msg.hora}</span>
                          {msg.tipo === 'enviada' && (
                            msg.status === 'read' ? (
                              <CheckCheck size={14} className="text-blue-400" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck size={14} />
                            ) : msg.status === 'failed' ? (
                              <span className="text-red-400 text-xs">!</span>
                            ) : (
                              <Check size={14} />
                            )
                          )}
                        </div>
                      </div>
                      
                      {msg.tipo === 'enviada' && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--theme-bg-tertiary)] rounded transition-all self-center"
                          title="Responder"
                        >
                          <Reply size={16} className="text-[var(--theme-text-muted)]" />
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
          {(conversaSelecionada.humano || iaAtiva === false) && (
            <div className="bg-orange-500/20 border-t border-orange-500/30 px-4 py-2 flex-shrink-0">
              <p className="text-orange-400 text-sm text-center">
                <User size={14} className="inline mr-1" />
                {iaAtiva === false
                  ? 'Secretária IA desativada - Todas as conversas em modo humano'
                  : 'Modo humano ativo - A IA não responderá esta conversa'
                }
              </p>
            </div>
          )}

          {/* Reply preview */}
          {replyingTo && (
            <div className="bg-[var(--theme-card)] border-t border-[var(--theme-card-border)] px-4 py-2 flex items-center gap-3 flex-shrink-0">
              <div className="flex-1 border-l-2 border-primary pl-3">
                <p className="text-xs text-primary">Respondendo</p>
                <p className="text-sm text-[var(--theme-text-secondary)] truncate">{replyingTo.texto || 'Mídia'}</p>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-[var(--theme-bg-tertiary)] rounded"
              >
                <X size={18} className="text-[var(--theme-text-muted)]" />
              </button>
            </div>
          )}

          {/* Preview de áudio gravado */}
          {audioUrl && !isRecording && (
            <div className="bg-[var(--theme-card)] border-t border-[var(--theme-card-border)] px-4 py-3 flex-shrink-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center h-12 bg-[var(--theme-bg)] rounded-lg overflow-hidden px-2">
                  <div className="flex items-center gap-[2px] h-full w-full justify-center">
                    {audioWaveform.length > 0 ? (
                      audioWaveform.map((value, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-primary rounded-full"
                          style={{ height: `${Math.max(4, value * 40)}px` }}
                        />
                      ))
                    ) : (
                      <div className="flex items-center gap-[2px]">
                        {[...Array(50)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-primary rounded-full"
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
                    className="p-2 bg-primary hover:bg-primary-hover rounded-full transition-colors"
                  >
                    {isPlayingPreview ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <audio 
                    ref={audioPreviewRef} 
                    src={audioUrl} 
                    onEnded={() => setIsPlayingPreview(false)}
                    className="hidden"
                  />
                  <span className="text-sm text-[var(--theme-text-muted)]">{formatRecordingTime(recordingTime)}</span>
                  <div className="flex-1"></div>
                  <button
                    onClick={limparAudio}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg text-red-400 transition-colors"
                    title="Descartar áudio"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={enviarMensagem}
                    disabled={enviandoMensagem}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center gap-2"
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
            <div className="bg-[var(--theme-card)] border-t border-[var(--theme-card-border)] px-4 py-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[var(--theme-bg-tertiary)] rounded-lg px-3 py-1">
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
          <div className="bg-[var(--theme-card)] border-t border-[var(--theme-card-border)] p-4 flex-shrink-0">
            {isRecording ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center h-16 bg-[var(--theme-bg)] rounded-lg overflow-hidden px-2">
                  <div className="flex items-center gap-[2px] h-full">
                    {audioWaveform.length === 0 ? (
                      <div className="flex items-center gap-[2px]">
                        {[...Array(50)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-primary rounded-full animate-pulse"
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
                          className="w-1 bg-primary rounded-full transition-all duration-75"
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
                    className="p-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
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
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors text-[var(--theme-text-muted)] hover:text-white"
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
                  className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors text-[var(--theme-text-muted)] hover:text-white"
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
                  className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                  disabled={enviandoMensagem}
                />
                
                {mensagem.trim() || selectedFiles.length > 0 || audioBlob ? (
                  <button 
                    type="submit"
                    disabled={enviandoMensagem}
                    className="p-3 bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] text-white rounded-lg transition-colors"
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
                    className="p-3 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] text-white rounded-lg transition-colors"
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
        <div className="flex-1 flex items-center justify-center bg-[var(--theme-bg)]">
          <div className="text-center text-[var(--theme-text-muted)]">
            <div className="w-20 h-20 bg-[var(--theme-card)] rounded-full flex items-center justify-center mx-auto mb-4">
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
          
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNovaConversa(false)}
          >
            <div
              className="bg-[var(--theme-card)] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[var(--theme-card-border)] flex items-center justify-between">
                <h3 className="font-semibold text-lg">Nova Conversa</h3>
                <button
                  onClick={() => setShowNovaConversa(false)}
                  className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Abas Clientes/Leads */}
              <div className="p-4 border-b border-[var(--theme-card-border)]">
                <div className="flex gap-1 mb-3 bg-[var(--theme-bg)] rounded-lg p-1">
                  <button
                    onClick={() => setAbaNovaConversa('clientes')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      abaNovaConversa === 'clientes' 
                        ? 'bg-[var(--theme-bg-tertiary)] text-white' 
                        : 'text-[var(--theme-text-muted)] hover:text-white'
                    }`}
                  >
                    Clientes ({clientes.length})
                  </button>
                  <button
                    onClick={() => setAbaNovaConversa('leads')}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      abaNovaConversa === 'leads' 
                        ? 'bg-[var(--theme-bg-tertiary)] text-white' 
                        : 'text-[var(--theme-text-muted)] hover:text-white'
                    }`}
                  >
                    Leads ({leads.length})
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" size={18} />
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={(e) => setBuscaCliente(e.target.value)}
                    placeholder={abaNovaConversa === 'clientes' ? "Buscar cliente..." : "Buscar lead..."}
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {loadingClientes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : abaNovaConversa === 'clientes' ? (
                  // Lista de Clientes
                  clientesFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-[var(--theme-text-muted)]">
                      <p>Nenhum cliente encontrado</p>
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        onClick={() => iniciarConversa(cliente.telefone, cliente.nome)}
                        disabled={iniciandoConversa || !cliente.telefone}
                        className="w-full flex items-center gap-3 p-4 hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left border-b border-[var(--theme-card-border)] disabled:opacity-50"
                      >
                        {cliente.avatar ? (
                          <img src={cliente.avatar} alt={cliente.nome} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            {cliente.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{cliente.nome}</p>
                          <p className="text-sm text-[var(--theme-text-muted)]">{cliente.telefone || 'Sem telefone'}</p>
                        </div>
                        <MessageSquare size={18} className="text-primary" />
                      </button>
                    ))
                  )
                ) : (
                  // Lista de Leads
                  leadsFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-[var(--theme-text-muted)]">
                      <p>Nenhum lead encontrado</p>
                    </div>
                  ) : (
                    leadsFiltrados.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => iniciarConversa(lead.telefone, lead.nome)}
                        disabled={iniciandoConversa || !lead.telefone}
                        className="w-full flex items-center gap-3 p-4 hover:bg-[var(--theme-bg-tertiary)] transition-colors text-left border-b border-[var(--theme-card-border)] disabled:opacity-50"
                      >
                        {lead.avatar ? (
                          <img src={lead.avatar} alt={lead.nome} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {lead.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[var(--theme-text-muted)]">{lead.telefone || 'Sem telefone'}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${getEtapaInfo(lead.etapa).bgCor} ${getEtapaInfo(lead.etapa).textCor}`}>
                              {getEtapaInfo(lead.etapa).label}
                            </span>
                          </div>
                          {lead.interesse && (
                            <p className="text-xs text-[var(--theme-text-muted)] truncate">{lead.interesse}</p>
                          )}
                        </div>
                        <MessageSquare size={18} className="text-blue-400" />
                      </button>
                    ))
                  )
                )}
              </div>
              
              <div className="p-4 border-t border-[var(--theme-card-border)]">
                <p className="text-sm text-[var(--theme-text-muted)] mb-3">Ou digite um novo número:</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={novoContato.nome}
                    onChange={(e) => setNovoContato(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome"
                    className="w-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                    <input
                      type="text"
                      value={novoContato.telefone}
                      onChange={(e) => setNovoContato(prev => ({ ...prev, telefone: formatarTelefone(e.target.value) }))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className={`w-full bg-[var(--theme-bg)] border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary ${
                        novoContato.telefone && !validarTelefone(novoContato.telefone)
                          ? 'border-red-500'
                          : 'border-[var(--theme-card-border)]'
                      }`}
                    />
                  </div>
                  {novoContato.telefone && !validarTelefone(novoContato.telefone) && (
                    <p className="text-xs text-red-400 mt-1">Telefone deve ter pelo menos 10 dígitos</p>
                  )}
                  <button
                    onClick={() => iniciarConversa(prepararTelefoneParaSalvar(novoContato.telefone), novoContato.nome || 'Novo contato')}
                    disabled={!validarTelefone(novoContato.telefone) || iniciandoConversa}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] disabled:text-[var(--theme-text-muted)] text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
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
          
          <div className="fixed right-0 top-0 h-full w-96 max-w-full bg-[var(--theme-card)] border-l border-[var(--theme-card-border)] z-50 flex flex-col">
            <div className="p-4 border-b border-[var(--theme-card-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote size={20} className="text-yellow-400" />
                <h3 className="font-semibold">Anotações</h3>
              </div>
              <button
                onClick={() => setShowAnotacao(false)}
                className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-sm text-[var(--theme-text-muted)] mb-2">
                Anotações sobre: <span className="text-white">{conversaSelecionada.nome}</span>
              </p>
              <textarea
                value={anotacaoTemp}
                onChange={(e) => setAnotacaoTemp(e.target.value)}
                placeholder="Adicione anotações sobre esta conversa..."
                className="flex-1 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary resize-none text-sm"
              />
              <p className="text-xs text-[var(--theme-text-muted)] mt-2">
                Estas anotações são internas e não são visíveis para o cliente.
              </p>
            </div>

            <div className="p-4 border-t border-[var(--theme-card-border)] flex gap-3">
              <button
                onClick={() => setShowAnotacao(false)}
                className="flex-1 px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAnotacao}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Salvar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Painel de Procedimentos de Interesse */}
      <PainelInteresse
        isOpen={showPainelInteresse}
        onClose={() => setShowPainelInteresse(false)}
        leadId={leadIA?.id || null}
        leadNome={conversaSelecionada?.nome || ''}
        clinicaId={CLINICA_ID}
      />

      {/* Painel de Agendamentos */}
      <PainelAgendamentos
        isOpen={showPainelAgendamentos}
        onClose={() => setShowPainelAgendamentos(false)}
        leadId={leadIA?.id || null}
        leadNome={conversaSelecionada?.nome || ''}
        leadTelefone={conversaSelecionada?.telefone}
        clinicaId={CLINICA_ID}
        onAgendamentoCriado={() => {
          // Atualizar etapa do lead localmente
          if (leadIA) {
            setLeadIA(prev => prev ? { ...prev, etapa: 'agendado' } : null);
          }
        }}
        onStatusAlterado={(novaEtapa) => {
          if (leadIA) {
            setLeadIA(prev => prev ? { ...prev, etapa: novaEtapa } : null);
          }
        }}
      />
    </div>
  );
}
