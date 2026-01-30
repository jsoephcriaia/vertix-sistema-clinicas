'use client';

import { useEffect } from 'react';
import { Square, Send, Trash2, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface GravadorAudioProps {
  onEnviar: (blob: Blob) => Promise<void>;
  onCancelar: () => void;
  enviando?: boolean;
}

export function GravadorAudio({ onEnviar, onCancelar, enviando }: GravadorAudioProps) {
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    waveform,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Iniciar gravação automaticamente
  useEffect(() => {
    startRecording().catch(console.error);
    return () => cancelRecording();
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnviar = async () => {
    if (!audioBlob) return;
    await onEnviar(audioBlob);
  };

  const handleCancelar = () => {
    cancelRecording();
    onCancelar();
  };

  return (
    <div className="border-t border-[var(--theme-border)] p-4">
      <div className="flex items-center gap-4">
        {/* Cancelar */}
        <button
          onClick={handleCancelar}
          className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
        >
          <Trash2 size={20} />
        </button>

        {/* Waveform / Preview */}
        <div className="flex-1 flex items-center gap-2">
          {isRecording ? (
            <>
              {/* Waveform visual */}
              <div className="flex items-center gap-0.5 h-8">
                {waveform.map((level, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full transition-all"
                    style={{ height: `${Math.max(4, level * 32)}px` }}
                  />
                ))}
              </div>
              <span className="text-sm text-[var(--theme-text-muted)] ml-2">
                {formatTime(recordingTime)}
              </span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </>
          ) : audioUrl ? (
            <audio src={audioUrl} controls className="w-full h-8" />
          ) : null}
        </div>

        {/* Stop / Enviar */}
        {isRecording ? (
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            <Square size={20} />
          </button>
        ) : audioBlob ? (
          <button
            onClick={handleEnviar}
            disabled={enviando}
            className="p-2 bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
