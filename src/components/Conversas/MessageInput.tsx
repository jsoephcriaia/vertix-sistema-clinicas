'use client';

import { useState, useRef } from 'react';
import { Send, Smile, Paperclip, Mic, X, Loader2 } from 'lucide-react';
import EmojiPicker from '@/components/EmojiPicker';
import { GravadorAudio } from './GravadorAudio';

interface MessageInputProps {
  onSend: (texto: string, arquivos?: File[], audioBlob?: Blob) => Promise<void>;
  replyingTo?: { id: number; content: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Digite uma mensagem...',
}: MessageInputProps) {
  const [texto, setTexto] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [modoGravacao, setModoGravacao] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEnviar = async () => {
    if (enviando || disabled) return;
    if (!texto.trim() && arquivos.length === 0) return;

    setEnviando(true);
    try {
      await onSend(texto, arquivos.length > 0 ? arquivos : undefined);
      setTexto('');
      setArquivos([]);
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarAudio = async (audioBlob: Blob) => {
    setEnviando(true);
    try {
      await onSend('', undefined, audioBlob);
      setModoGravacao(false);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setArquivos(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  if (modoGravacao) {
    return (
      <GravadorAudio
        onEnviar={handleEnviarAudio}
        onCancelar={() => setModoGravacao(false)}
        enviando={enviando}
      />
    );
  }

  return (
    <div className="border-t border-[var(--theme-border)] p-4">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-[var(--theme-input)] rounded-lg p-2 mb-2">
          <div className="flex-1 text-sm truncate">
            <span className="text-[var(--theme-text-muted)]">Respondendo: </span>
            {replyingTo.content}
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-[var(--theme-hover)] rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Arquivos selecionados */}
      {arquivos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {arquivos.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[var(--theme-input)] rounded-lg px-3 py-1"
            >
              <span className="text-sm truncate max-w-[150px]">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Emoji */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
            disabled={disabled}
          >
            <Smile size={20} className="text-[var(--theme-text-muted)]" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker
                onSelect={(emoji) => {
                  setTexto(prev => prev + emoji);
                  setShowEmoji(false);
                }}
                onClose={() => setShowEmoji(false)}
              />
            </div>
          )}
        </div>

        {/* Anexo */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
          disabled={disabled}
        >
          <Paperclip size={20} className="text-[var(--theme-text-muted)]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Texto */}
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-[var(--theme-input)] border border-[var(--theme-border)] rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />

        {/* Enviar ou Gravar */}
        {texto.trim() || arquivos.length > 0 ? (
          <button
            onClick={handleEnviar}
            disabled={enviando || disabled}
            className="p-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        ) : (
          <button
            onClick={() => setModoGravacao(true)}
            disabled={disabled}
            className="p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors"
          >
            <Mic size={20} className="text-[var(--theme-text-muted)]" />
          </button>
        )}
      </div>
    </div>
  );
}
