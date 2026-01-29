'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Upload, MapPin, Phone, Mail, Instagram, Facebook, Globe, Loader2, Trash2, ChevronDown, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigClinicaProps {
  onBack: () => void;
}

// Lista de estados brasileiros
const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

// Função para formatar telefone
const formatarTelefone = (valor: string) => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
};

// Função para formatar CEP
const formatarCep = (valor: string) => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 5) return numeros;
  return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
};

export default function ConfigClinica({ onBack }: ConfigClinicaProps) {
  const { clinica, refreshClinica } = useAuth();
  const { showToast } = useAlert();
  const CLINICA_ID = clinica?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [driveConectado, setDriveConectado] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement>(null);

  // Estado para dropdown de estados
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const estadoDropdownRef = useRef<HTMLDivElement>(null);

  const [dados, setDados] = useState({
    nome: '',
    descricao: '',
    telefone: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    instagram: '',
    facebook: '',
    website: '',
  });

  useEffect(() => {
    if (CLINICA_ID) {
      fetchClinica();
    }
  }, [CLINICA_ID]);

  // Fechar dropdown de estado ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (estadoDropdownRef.current && !estadoDropdownRef.current.contains(event.target as Node)) {
        setShowEstadoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClinica = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clinicas')
      .select('*')
      .eq('id', CLINICA_ID)
      .single();

    if (error) {
      console.error('Erro ao buscar clínica:', error);
    } else if (data) {
      setDados({
        nome: data.nome || '',
        descricao: data.descricao || '',
        telefone: data.telefone || '',
        email: data.email || '',
        endereco: data.endereco || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        website: data.website || '',
      });
      setLogoUrl(data.logo_url || null);
      setDriveConectado(!!data.google_drive_connected);
    }
    setLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;

    // Aplicar máscara de telefone
    if (field === 'telefone') {
      formattedValue = formatarTelefone(value);
    }

    // Aplicar máscara de CEP
    if (field === 'cep') {
      formattedValue = formatarCep(value);
    }

    setDados(prev => ({ ...prev, [field]: formattedValue }));
  };

  // Filtrar estados
  const estadosFiltrados = ESTADOS_BRASILEIROS.filter(estado =>
    estado.nome.toLowerCase().includes(estadoFiltro.toLowerCase()) ||
    estado.sigla.toLowerCase().includes(estadoFiltro.toLowerCase())
  );

  // Encontrar nome do estado selecionado
  const estadoSelecionado = ESTADOS_BRASILEIROS.find(e => e.sigla === dados.estado || e.nome === dados.estado);

  const handleUploadLogo = async (file: File) => {
    if (!driveConectado) {
      showToast('Conecte o Google Drive nas Integrações antes de fazer upload.', 'warning');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione apenas arquivos de imagem.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 2MB.', 'error');
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicaId', CLINICA_ID);
      formData.append('tipo', 'logo');

      const response = await fetch('/api/google/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setLogoUrl(result.imageUrl);
      showToast('Logo enviada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      showToast('Erro ao enviar logo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'), 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadLogo(file);
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleDeleteLogo = async () => {
    try {
      const { error } = await supabase
        .from('clinicas')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', CLINICA_ID);

      if (error) throw error;

      setLogoUrl(null);
      showToast('Logo removida com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      showToast('Erro ao remover logo', 'error');
    }
  };

  const handleSave = async () => {
    // Validar campo obrigatório
    if (!dados.telefone || dados.telefone.replace(/\D/g, '').length < 10) {
      showToast('O Telefone/WhatsApp é obrigatório', 'error');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('clinicas')
      .update({
        nome: dados.nome,
        descricao: dados.descricao,
        telefone: dados.telefone,
        email: dados.email,
        endereco: dados.endereco,
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        cep: dados.cep,
        instagram: dados.instagram,
        facebook: dados.facebook,
        website: dados.website,
        updated_at: new Date().toISOString(),
      })
      .eq('id', CLINICA_ID);

    if (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar dados', 'error');
    } else {
      showToast('Dados salvos com sucesso!', 'success');
      // Atualizar nome da clínica no menu lateral
      if (refreshClinica) await refreshClinica();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Minha Clínica</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Informações básicas que a IA usará para responder clientes</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <h2 className="font-semibold mb-4">Logo da Clínica</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-[var(--theme-bg-tertiary)] flex items-center justify-center overflow-hidden relative group">
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    onClick={handleDeleteLogo}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remover logo"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              ) : (
                <Upload size={32} className="text-[var(--theme-text-muted)]" />
              )}
            </div>
            <div>
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileSelect}
              />
              <button
                onClick={() => inputLogoRef.current?.click()}
                disabled={uploadingLogo}
                className="bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Enviar Logo
                  </>
                )}
              </button>
              <p className="text-xs text-[var(--theme-text-muted)] mt-2">
                PNG ou JPG, máximo 2MB
                {!driveConectado && (
                  <span className="block text-yellow-500 mt-1">
                    Conecte o Google Drive nas Integrações
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <h2 className="font-semibold mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome da Clínica</label>
              <input
                type="text"
                value={dados.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Descrição</label>
              <textarea
                value={dados.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                rows={3}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                placeholder="Descreva sua clínica em poucas palavras..."
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                <Phone size={14} className="inline mr-1" /> Telefone/WhatsApp <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={dados.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                className={`w-full bg-[var(--theme-input)] border rounded-lg px-4 py-3 focus:outline-none focus:border-primary ${
                  !dados.telefone ? 'border-red-500/50' : 'border-[var(--theme-card-border)]'
                }`}
              />
              {!dados.telefone && (
                <p className="text-xs text-red-400 mt-1">Campo obrigatório</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                <Mail size={14} className="inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={dados.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} /> Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Endereço</label>
              <input
                type="text"
                value={dados.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Bairro</label>
              <input
                type="text"
                value={dados.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Cidade</label>
              <input
                type="text"
                value={dados.cidade}
                onChange={(e) => handleChange('cidade', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative" ref={estadoDropdownRef}>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Estado</label>
              <button
                type="button"
                onClick={() => setShowEstadoDropdown(!showEstadoDropdown)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary text-left flex items-center justify-between"
              >
                <span className={estadoSelecionado ? '' : 'text-[var(--theme-text-muted)]'}>
                  {estadoSelecionado ? `${estadoSelecionado.sigla} - ${estadoSelecionado.nome}` : 'Selecione o estado'}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showEstadoDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showEstadoDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-[var(--theme-card)] border border-[var(--theme-card-border)] rounded-lg shadow-lg max-h-64 overflow-hidden">
                  <div className="p-2 border-b border-[var(--theme-card-border)]">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                      <input
                        type="text"
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        placeholder="Buscar estado..."
                        className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-primary text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {estadosFiltrados.map((estado) => (
                      <button
                        key={estado.sigla}
                        type="button"
                        onClick={() => {
                          handleChange('estado', estado.sigla);
                          setShowEstadoDropdown(false);
                          setEstadoFiltro('');
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-[var(--theme-bg-tertiary)] transition-colors ${
                          dados.estado === estado.sigla ? 'bg-primary/20 text-primary' : ''
                        }`}
                      >
                        <span className="font-medium">{estado.sigla}</span>
                        <span className="text-[var(--theme-text-muted)]"> - {estado.nome}</span>
                      </button>
                    ))}
                    {estadosFiltrados.length === 0 && (
                      <p className="px-4 py-3 text-sm text-[var(--theme-text-muted)]">Nenhum estado encontrado</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">CEP</label>
              <input
                type="text"
                value={dados.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          <h2 className="font-semibold mb-4">Redes Sociais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                <Instagram size={14} className="inline mr-1" /> Instagram
              </label>
              <input
                type="text"
                value={dados.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@suaclinica"
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                <Facebook size={14} className="inline mr-1" /> Facebook
              </label>
              <input
                type="text"
                value={dados.facebook}
                onChange={(e) => handleChange('facebook', e.target.value)}
                placeholder="facebook.com/suaclinica"
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                <Globe size={14} className="inline mr-1" /> Website
              </label>
              <input
                type="text"
                value={dados.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.suaclinica.com.br"
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-hover disabled:bg-[var(--theme-bg-tertiary)] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
