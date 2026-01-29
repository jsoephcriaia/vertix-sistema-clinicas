'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Upload, MapPin, Phone, Mail, Instagram, Facebook, Globe, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useAlert } from '@/components/Alert';

interface ConfigClinicaProps {
  onBack: () => void;
}

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
    setDados(prev => ({ ...prev, [field]: value }));
  };

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
                <Phone size={14} className="inline mr-1" /> Telefone/WhatsApp
              </label>
              <input
                type="text"
                value={dados.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
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
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Estado</label>
              <input
                type="text"
                value={dados.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
                className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--theme-text-muted)] mb-2">CEP</label>
              <input
                type="text"
                value={dados.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
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
