'use client';

import { useRef, useEffect } from 'react';
import { Check, CheckCheck, Reply, FileText } from 'lucide-react';

interface Attachment {
  id: number;
  file_type: string;
  data_url: string;
  thumb_url?: string;
  file_name?: string;
}

interface Mensagem {
  id: number;
  tipo: 'recebida' | 'enviada';
  texto: string;
  hora: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: Attachment[];
  replyTo?: { id: number; content: string };
}

interface ChatMessagesProps {
  mensagens: Mensagem[];
  loading: boolean;
  onReply?: (mensagem: Mensagem) => void;
}

export function ChatMessages({ mensagens, loading, onReply }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll para última mensagem
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const renderStatus = (status?: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck size={14} className="text-blue-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-[var(--theme-text-muted)]" />;
      case 'sent':
        return <Check size={14} className="text-[var(--theme-text-muted)]" />;
      case 'failed':
        return <span className="text-red-400 text-xs">Falhou</span>;
      default:
        return null;
    }
  };

  const renderAttachment = (att: Attachment) => {
    if (att.file_type?.startsWith('image')) {
      return (
        <img
          src={att.data_url}
          alt=""
          className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => window.open(att.data_url, '_blank')}
        />
      );
    }
    if (att.file_type?.startsWith('audio')) {
      return <audio src={att.data_url} controls className="max-w-xs" />;
    }
    if (att.file_type?.startsWith('video')) {
      return <video src={att.data_url} controls className="max-w-xs rounded-lg" />;
    }
    return (
      <a
        href={att.data_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <FileText size={16} />
        <span>{att.file_name || 'Arquivo'}</span>
      </a>
    );
  };

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {loading && mensagens.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[var(--theme-text-muted)]">
          Carregando mensagens...
        </div>
      ) : mensagens.length === 0 ? (
        <div className="flex items-center justify-center h-full text-[var(--theme-text-muted)]">
          Nenhuma mensagem ainda
        </div>
      ) : (
        mensagens.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.tipo === 'enviada'
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-[var(--theme-card)] rounded-bl-md'
              }`}
            >
              {/* Reply */}
              {msg.replyTo && (
                <div className="text-xs opacity-70 border-l-2 border-current pl-2 mb-2">
                  {msg.replyTo.content || 'Mensagem original'}
                </div>
              )}

              {/* Attachments */}
              {msg.attachments?.map(att => (
                <div key={att.id} className="mb-2">
                  {renderAttachment(att)}
                </div>
              ))}

              {/* Texto */}
              {msg.texto && <p className="whitespace-pre-wrap break-words">{msg.texto}</p>}

              {/* Footer */}
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs opacity-70">{msg.hora}</span>
                {msg.tipo === 'enviada' && renderStatus(msg.status)}
              </div>
            </div>

            {/* Botão Reply */}
            {onReply && msg.tipo === 'recebida' && (
              <button
                onClick={() => onReply(msg)}
                className="p-1 opacity-0 hover:opacity-100 transition-opacity ml-1 self-center"
                title="Responder"
              >
                <Reply size={16} className="text-[var(--theme-text-muted)]" />
              </button>
            )}
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
