'use client';

import { useState, useMemo } from 'react';

const emojisData = [
  { emoji: '😀', keywords: ['sorriso', 'feliz', 'alegre', 'smile', 'happy'] },
  { emoji: '😃', keywords: ['sorriso', 'feliz', 'alegre', 'smile', 'happy'] },
  { emoji: '😄', keywords: ['sorriso', 'feliz', 'alegre', 'smile', 'happy'] },
  { emoji: '😁', keywords: ['sorriso', 'feliz', 'grin'] },
  { emoji: '😅', keywords: ['suor', 'nervoso', 'sweat'] },
  { emoji: '😂', keywords: ['rindo', 'chorando', 'laugh', 'cry', 'lol'] },
  { emoji: '🤣', keywords: ['rindo', 'rolando', 'laugh', 'rofl'] },
  { emoji: '😊', keywords: ['sorriso', 'feliz', 'blush'] },
  { emoji: '😇', keywords: ['anjo', 'inocente', 'angel'] },
  { emoji: '🙂', keywords: ['sorriso', 'leve', 'smile'] },
  { emoji: '😉', keywords: ['piscada', 'wink'] },
  { emoji: '😍', keywords: ['amor', 'apaixonado', 'love', 'heart'] },
  { emoji: '🥰', keywords: ['amor', 'carinho', 'love'] },
  { emoji: '😘', keywords: ['beijo', 'kiss'] },
  { emoji: '😋', keywords: ['delicioso', 'gostoso', 'yummy'] },
  { emoji: '😛', keywords: ['lingua', 'tongue'] },
  { emoji: '😜', keywords: ['lingua', 'piscada', 'tongue', 'wink'] },
  { emoji: '🤪', keywords: ['louco', 'doido', 'crazy'] },
  { emoji: '🤔', keywords: ['pensando', 'thinking', 'hmm'] },
  { emoji: '🤨', keywords: ['desconfiado', 'suspicious'] },
  { emoji: '😐', keywords: ['neutro', 'neutral'] },
  { emoji: '😑', keywords: ['sem expressao', 'expressionless'] },
  { emoji: '😶', keywords: ['sem boca', 'mute', 'silencio'] },
  { emoji: '😏', keywords: ['malicioso', 'smirk'] },
  { emoji: '😒', keywords: ['entediado', 'unamused'] },
  { emoji: '🙄', keywords: ['revirando olhos', 'eye roll'] },
  { emoji: '😬', keywords: ['nervoso', 'grimace'] },
  { emoji: '😔', keywords: ['triste', 'sad', 'pensive'] },
  { emoji: '😪', keywords: ['sono', 'sleepy'] },
  { emoji: '😴', keywords: ['dormindo', 'sleeping'] },
  { emoji: '😷', keywords: ['doente', 'mascara', 'sick', 'mask'] },
  { emoji: '🤒', keywords: ['doente', 'febre', 'sick', 'fever'] },
  { emoji: '🤕', keywords: ['machucado', 'hurt'] },
  { emoji: '🤢', keywords: ['enjoado', 'nauseated'] },
  { emoji: '🤮', keywords: ['vomitando', 'vomit'] },
  { emoji: '🥵', keywords: ['calor', 'hot'] },
  { emoji: '🥶', keywords: ['frio', 'cold'] },
  { emoji: '😵', keywords: ['tonto', 'dizzy'] },
  { emoji: '🤯', keywords: ['explodindo', 'mind blown'] },
  { emoji: '🥳', keywords: ['festa', 'party', 'comemorando'] },
  { emoji: '😎', keywords: ['legal', 'cool', 'oculos'] },
  { emoji: '🤓', keywords: ['nerd', 'geek'] },
  { emoji: '😕', keywords: ['confuso', 'confused'] },
  { emoji: '😟', keywords: ['preocupado', 'worried'] },
  { emoji: '🙁', keywords: ['triste', 'sad'] },
  { emoji: '😮', keywords: ['surpreso', 'surprised', 'oh'] },
  { emoji: '😯', keywords: ['surpreso', 'surprised'] },
  { emoji: '😲', keywords: ['chocado', 'shocked', 'astonished'] },
  { emoji: '😳', keywords: ['envergonhado', 'flushed'] },
  { emoji: '🥺', keywords: ['pidao', 'pleading', 'por favor'] },
  { emoji: '😢', keywords: ['chorando', 'crying', 'triste'] },
  { emoji: '😭', keywords: ['chorando muito', 'crying loud', 'triste'] },
  { emoji: '😱', keywords: ['medo', 'scared', 'terror'] },
  { emoji: '😤', keywords: ['raiva', 'angry', 'bufando'] },
  { emoji: '😡', keywords: ['raiva', 'angry', 'bravo'] },
  { emoji: '😠', keywords: ['raiva', 'angry'] },
  { emoji: '🤬', keywords: ['xingando', 'cursing'] },
  { emoji: '👍', keywords: ['legal', 'ok', 'like', 'positivo', 'joia'] },
  { emoji: '👎', keywords: ['negativo', 'dislike', 'ruim'] },
  { emoji: '👌', keywords: ['ok', 'perfeito', 'perfect'] },
  { emoji: '✌️', keywords: ['paz', 'peace', 'vitoria'] },
  { emoji: '🤞', keywords: ['sorte', 'luck', 'dedos cruzados'] },
  { emoji: '🤟', keywords: ['rock', 'love'] },
  { emoji: '🤘', keywords: ['rock', 'metal'] },
  { emoji: '🤙', keywords: ['liga', 'call', 'shaka'] },
  { emoji: '👋', keywords: ['tchau', 'oi', 'wave', 'hello', 'bye'] },
  { emoji: '👏', keywords: ['palmas', 'clap', 'parabens'] },
  { emoji: '🙌', keywords: ['comemorando', 'celebrate', 'maos'] },
  { emoji: '🤝', keywords: ['acordo', 'handshake', 'negocio'] },
  { emoji: '🙏', keywords: ['por favor', 'obrigado', 'please', 'thanks', 'rezando'] },
  { emoji: '💪', keywords: ['forte', 'strong', 'musculo'] },
  { emoji: '❤️', keywords: ['amor', 'love', 'coracao', 'heart'] },
  { emoji: '🧡', keywords: ['amor', 'love', 'coracao', 'laranja'] },
  { emoji: '💛', keywords: ['amor', 'love', 'coracao', 'amarelo'] },
  { emoji: '💚', keywords: ['amor', 'love', 'coracao', 'verde'] },
  { emoji: '💙', keywords: ['amor', 'love', 'coracao', 'azul'] },
  { emoji: '💜', keywords: ['amor', 'love', 'coracao', 'roxo'] },
  { emoji: '🖤', keywords: ['amor', 'love', 'coracao', 'preto'] },
  { emoji: '💔', keywords: ['coracao partido', 'broken heart', 'triste'] },
  { emoji: '💕', keywords: ['amor', 'love', 'coracoes'] },
  { emoji: '💖', keywords: ['amor', 'love', 'coracao brilhante'] },
  { emoji: '💗', keywords: ['amor', 'love', 'coracao crescendo'] },
  { emoji: '💘', keywords: ['amor', 'love', 'cupido'] },
  { emoji: '🔥', keywords: ['fogo', 'fire', 'quente', 'hot'] },
  { emoji: '✨', keywords: ['brilho', 'sparkles', 'magico'] },
  { emoji: '🌟', keywords: ['estrela', 'star', 'brilho'] },
  { emoji: '💫', keywords: ['estrela', 'star', 'tonto'] },
  { emoji: '⭐', keywords: ['estrela', 'star'] },
  { emoji: '🌈', keywords: ['arco iris', 'rainbow'] },
  { emoji: '☀️', keywords: ['sol', 'sun'] },
  { emoji: '🎉', keywords: ['festa', 'party', 'parabens', 'celebracao'] },
  { emoji: '🎊', keywords: ['festa', 'party', 'confete'] },
  { emoji: '🎁', keywords: ['presente', 'gift'] },
  { emoji: '🎂', keywords: ['bolo', 'cake', 'aniversario', 'birthday'] },
  { emoji: '💰', keywords: ['dinheiro', 'money'] },
  { emoji: '💵', keywords: ['dinheiro', 'money', 'dollar'] },
  { emoji: '💸', keywords: ['dinheiro', 'money', 'voando'] },
  { emoji: '📱', keywords: ['celular', 'phone', 'telefone'] },
  { emoji: '💻', keywords: ['computador', 'computer', 'laptop'] },
  { emoji: '📧', keywords: ['email', 'carta'] },
  { emoji: '📞', keywords: ['telefone', 'phone', 'ligacao'] },
  { emoji: '✅', keywords: ['ok', 'check', 'certo', 'correto', 'feito'] },
  { emoji: '❌', keywords: ['nao', 'errado', 'x', 'cancelar'] },
  { emoji: '⚠️', keywords: ['atencao', 'warning', 'cuidado'] },
  { emoji: '📍', keywords: ['local', 'location', 'pin'] },
  { emoji: '🏠', keywords: ['casa', 'home'] },
  { emoji: '🏥', keywords: ['hospital', 'clinica', 'saude'] },
  { emoji: '💉', keywords: ['injecao', 'vacina', 'injection'] },
  { emoji: '💊', keywords: ['remedio', 'pill', 'medicamento'] },
  { emoji: '🩺', keywords: ['estetoscopio', 'medico', 'doctor'] },
  { emoji: '💆', keywords: ['massagem', 'spa', 'relaxar'] },
  { emoji: '💅', keywords: ['unha', 'nail', 'manicure'] },
  { emoji: '💇', keywords: ['cabelo', 'hair', 'corte'] },
  { emoji: '🧖', keywords: ['spa', 'sauna', 'relaxar'] },
  { emoji: '⏰', keywords: ['relogio', 'clock', 'hora', 'alarme'] },
  { emoji: '📅', keywords: ['calendario', 'calendar', 'data', 'agenda'] },
  { emoji: '📆', keywords: ['calendario', 'calendar', 'data'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return emojisData;
    
    const searchLower = search.toLowerCase();
    return emojisData.filter(item => 
      item.keywords.some(keyword => keyword.includes(searchLower)) ||
      item.emoji.includes(search)
    );
  }, [search]);

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl w-72 max-h-72 overflow-hidden z-50">
      <div className="p-2 border-b border-[#334155]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji... (ex: feliz, amor, ok)"
          className="w-full bg-[#0f172a] border border-[#334155] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#10b981]"
          autoFocus
        />
      </div>
      <div className="p-2 grid grid-cols-8 gap-1 max-h-52 overflow-auto">
        {filteredEmojis.length === 0 ? (
          <p className="col-span-8 text-center text-[#64748b] text-sm py-4">Nenhum emoji encontrado</p>
        ) : (
          filteredEmojis.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(item.emoji);
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-[#334155] rounded text-xl transition-colors"
              title={item.keywords.join(', ')}
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}