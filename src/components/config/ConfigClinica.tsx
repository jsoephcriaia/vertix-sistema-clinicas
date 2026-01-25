'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Upload, MapPin, Phone, Mail, Instagram, Facebook, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface ConfigClinicaProps {
  onBack: () => void;
}

export default function ConfigClinica({ onBack }: ConfigClinicaProps) {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    }
    setLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setDados(prev => ({ ...prev, [field]: value }));
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
      alert('Erro ao salvar dados');
    } else {
      alert('Dados salvos com sucesso!');
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Minha Clínica</h1>
          <p className="text-[#64748b] text-sm">Informações básicas que a IA usará para responder clientes</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <h2 className="font-semibold mb-4">Logo da Clínica</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-[#334155] flex items-center justify-center">
              <Upload size={32} className="text-[#64748b]" />
            </div>
            <div>
              <button className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg transition-colors">
                Enviar Logo
              </button>
              <p className="text-xs text-[#64748b] mt-2">PNG ou JPG, máximo 2MB</p>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <h2 className="font-semibold mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#64748b] mb-2">Nome da Clínica</label>
              <input
                type="text"
                value={dados.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#64748b] mb-2">Descrição</label>
              <textarea
                value={dados.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                rows={3}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                placeholder="Descreva sua clínica em poucas palavras..."
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">
                <Phone size={14} className="inline mr-1" /> Telefone/WhatsApp
              </label>
              <input
                type="text"
                value={dados.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">
                <Mail size={14} className="inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={dados.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin size={18} /> Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#64748b] mb-2">Endereço</label>
              <input
                type="text"
                value={dados.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Bairro</label>
              <input
                type="text"
                value={dados.bairro}
                onChange={(e) => handleChange('bairro', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Cidade</label>
              <input
                type="text"
                value={dados.cidade}
                onChange={(e) => handleChange('cidade', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">Estado</label>
              <input
                type="text"
                value={dados.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">CEP</label>
              <input
                type="text"
                value={dados.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
          <h2 className="font-semibold mb-4">Redes Sociais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#64748b] mb-2">
                <Instagram size={14} className="inline mr-1" /> Instagram
              </label>
              <input
                type="text"
                value={dados.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#64748b] mb-2">
                <Facebook size={14} className="inline mr-1" /> Facebook
              </label>
              <input
                type="text"
                value={dados.facebook}
                onChange={(e) => handleChange('facebook', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-[#64748b] mb-2">
                <Globe size={14} className="inline mr-1" /> Website
              </label>
              <input
                type="text"
                value={dados.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}