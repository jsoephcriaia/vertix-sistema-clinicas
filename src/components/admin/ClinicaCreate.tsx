'use client';

import { useState } from 'react';
import { ArrowLeft, Building2, User, CheckCircle, AlertCircle, Loader2, Copy, Check, Eye, EyeOff, Phone } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuth';
import { useAlert } from '@/components/Alert';

interface ClinicaCreateProps {
  onNavigate: (page: string, clinicaId?: string) => void;
}

type Step = 'dados' | 'revisao' | 'progresso' | 'sucesso';

interface FormData {
  clinicaNome: string;
  clinicaTelefone: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioSenha: string;
}

// Função para formatar telefone
const formatarTelefone = (valor: string) => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
};

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
}

export default function ClinicaCreate({ onNavigate }: ClinicaCreateProps) {
  const { admin } = useAdminAuth();
  const { showToast } = useAlert();

  const [step, setStep] = useState<Step>('dados');
  const [formData, setFormData] = useState<FormData>({
    clinicaNome: '',
    clinicaTelefone: '',
    usuarioNome: '',
    usuarioEmail: '',
    usuarioSenha: '',
  });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [createdClinica, setCreatedClinica] = useState<{ id: string; nome: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
    { id: 'clinica', label: 'Criar clínica no sistema', status: 'pending' },
    { id: 'usuario', label: 'Criar usuário da clínica', status: 'pending' },
    { id: 'chatwoot_account', label: 'Criar conta no Chatwoot', status: 'pending' },
    { id: 'chatwoot_user', label: 'Criar usuário no Chatwoot', status: 'pending' },
    { id: 'chatwoot_inbox', label: 'Criar inbox WhatsApp', status: 'pending' },
  ]);

  const updateProgressStep = (id: string, status: ProgressStep['status']) => {
    setProgressSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const gerarSenhaAleatoria = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%&*';

    // Garante pelo menos 1 de cada tipo
    let senha = '';
    senha += lower.charAt(Math.floor(Math.random() * lower.length));
    senha += upper.charAt(Math.floor(Math.random() * upper.length));
    senha += numbers.charAt(Math.floor(Math.random() * numbers.length));
    senha += special.charAt(Math.floor(Math.random() * special.length));

    // Completa com caracteres aleatórios
    const allChars = lower + upper + numbers + special;
    for (let i = 0; i < 8; i++) {
      senha += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Embaralha a senha
    senha = senha.split('').sort(() => Math.random() - 0.5).join('');
    setFormData(prev => ({ ...prev, usuarioSenha: senha }));
  };

  const validarDados = (): boolean => {
    if (!formData.clinicaNome.trim()) {
      setError('Nome da clínica é obrigatório');
      return false;
    }
    const telefoneLimpo = formData.clinicaTelefone.replace(/\D/g, '');
    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      setError('Telefone da clínica é obrigatório (mínimo 10 dígitos)');
      return false;
    }
    if (!formData.usuarioNome.trim()) {
      setError('Nome do usuário é obrigatório');
      return false;
    }
    if (!formData.usuarioEmail.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    if (!formData.usuarioEmail.includes('@')) {
      setError('Email inválido');
      return false;
    }
    if (!formData.usuarioSenha.trim() || formData.usuarioSenha.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    // Chatwoot exige caractere especial
    if (!/[!@#$%^&*()_+\-=\[\]{}|'"/\\.,`~<>:;?]/.test(formData.usuarioSenha)) {
      setError('Senha deve conter pelo menos 1 caractere especial (!@#$%&* etc)');
      return false;
    }
    setError('');
    return true;
  };

  const handleCriar = async () => {
    setLoading(true);
    setError('');
    setWarning('');
    setStep('progresso');

    // Simular progresso visual
    updateProgressStep('clinica', 'loading');

    try {
      const response = await fetch('/api/admin/clinicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicaNome: formData.clinicaNome,
          clinicaTelefone: formData.clinicaTelefone,
          usuarioNome: formData.usuarioNome,
          usuarioEmail: formData.usuarioEmail,
          usuarioSenha: formData.usuarioSenha,
          adminId: admin?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar clínica');
      }

      // Atualizar progresso baseado no resultado
      updateProgressStep('clinica', 'success');
      updateProgressStep('usuario', 'success');

      if (data.clinica?.chatwoot_setup_status === 'completed') {
        updateProgressStep('chatwoot_account', 'success');
        updateProgressStep('chatwoot_user', 'success');
        updateProgressStep('chatwoot_inbox', 'success');
      } else if (data.clinica?.chatwoot_setup_status === 'failed') {
        updateProgressStep('chatwoot_account', 'error');
        updateProgressStep('chatwoot_user', 'pending');
        updateProgressStep('chatwoot_inbox', 'pending');
        setWarning(data.chatwootError || data.warning || 'Erro ao configurar Chatwoot');
      } else {
        // pending - não configurado
        updateProgressStep('chatwoot_account', 'pending');
        updateProgressStep('chatwoot_user', 'pending');
        updateProgressStep('chatwoot_inbox', 'pending');
        setWarning(data.warning || 'Chatwoot não configurado');
      }

      setCreatedClinica(data.clinica);
      setStep('sucesso');
      showToast('Clínica criada com sucesso!', 'success');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar clínica');
      // Marcar todos como erro
      progressSteps.forEach(s => {
        if (s.status === 'loading' || s.status === 'pending') {
          updateProgressStep(s.id, 'error');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarParaClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {['dados', 'revisao', 'progresso', 'sucesso'].map((s, i) => {
        const stepIndex = ['dados', 'revisao', 'progresso', 'sucesso'].indexOf(step);
        const isActive = i <= stepIndex;
        const isCurrent = s === step;

        return (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              isCurrent ? 'bg-primary text-white' :
              isActive ? 'bg-green-500 text-white' :
              'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)]'
            }`}>
              {isActive && !isCurrent ? <CheckCircle size={16} /> : i + 1}
            </div>
            {i < 3 && (
              <div className={`w-12 h-1 mx-1 ${isActive ? 'bg-primary' : 'bg-[var(--theme-bg-tertiary)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => step === 'dados' ? onNavigate('clinicas') : setStep('dados')}
          className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded-lg transition-colors"
          disabled={loading}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--theme-text)]">Nova Clínica</h1>
          <p className="text-[var(--theme-text-muted)] text-sm">Criar nova clínica e usuário</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {renderStepIndicator()}

        <div className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-6">
          {/* Step 1: Dados */}
          {step === 'dados' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--theme-text)]">Informações da Clínica</h2>
                  <p className="text-sm text-[var(--theme-text-muted)]">Dados básicos da clínica e usuário</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome da Clínica *</label>
                  <input
                    type="text"
                    value={formData.clinicaNome}
                    onChange={(e) => handleInputChange('clinicaNome', e.target.value)}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary text-[var(--theme-text)]"
                    placeholder="Ex: Clínica Bella Estética"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">
                    Telefone/WhatsApp *
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                    <input
                      type="tel"
                      value={formData.clinicaTelefone}
                      onChange={(e) => handleInputChange('clinicaTelefone', formatarTelefone(e.target.value))}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary text-[var(--theme-text)]"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-[var(--theme-card-border)]" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <User size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-[var(--theme-text)]">Usuário Principal</h2>
                  <p className="text-sm text-[var(--theme-text-muted)]">Credenciais de acesso da clínica</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Nome do Usuário *</label>
                  <input
                    type="text"
                    value={formData.usuarioNome}
                    onChange={(e) => handleInputChange('usuarioNome', e.target.value)}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary text-[var(--theme-text)]"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.usuarioEmail}
                    onChange={(e) => handleInputChange('usuarioEmail', e.target.value)}
                    className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-primary text-[var(--theme-text)]"
                    placeholder="admin@clinica.com.br"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--theme-text-muted)] mb-2">Senha *</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showSenha ? 'text' : 'password'}
                      value={formData.usuarioSenha}
                      onChange={(e) => handleInputChange('usuarioSenha', e.target.value)}
                      className="w-full bg-[var(--theme-input)] border border-[var(--theme-card-border)] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary text-[var(--theme-text)]"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
                    >
                      {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={gerarSenhaAleatoria}
                    className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors text-sm"
                  >
                    Gerar
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => onNavigate('clinicas')}
                  className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => validarDados() && setStep('revisao')}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Revisão */}
          {step === 'revisao' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-[var(--theme-text)]">Revisar e Confirmar</h2>

              <div className="bg-[var(--theme-bg-tertiary)] rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-muted)]">Nome da Clínica:</span>
                  <span className="font-medium text-[var(--theme-text)]">{formData.clinicaNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-muted)]">Telefone/WhatsApp:</span>
                  <span className="font-medium text-[var(--theme-text)]">{formData.clinicaTelefone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-muted)]">Nome do Usuário:</span>
                  <span className="font-medium text-[var(--theme-text)]">{formData.usuarioNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-muted)]">Email:</span>
                  <span className="font-medium text-[var(--theme-text)]">{formData.usuarioEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--theme-text-muted)]">Senha:</span>
                  <span className="font-medium text-[var(--theme-text)]">••••••••</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-sm">
                <p><strong>O que será criado:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Clínica no sistema Vertix</li>
                  <li>Usuário com acesso ao painel</li>
                  <li>Conta no Chatwoot (se configurado)</li>
                  <li>Inbox WhatsApp no Chatwoot</li>
                </ul>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <button
                  onClick={() => setStep('dados')}
                  className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCriar}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Criar Clínica
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Progresso */}
          {step === 'progresso' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-[var(--theme-text)] text-center">Criando Clínica...</h2>

              <div className="space-y-3">
                {progressSteps.map((ps) => (
                  <div key={ps.id} className="flex items-center gap-3 p-3 bg-[var(--theme-bg-tertiary)] rounded-lg">
                    {ps.status === 'loading' && <Loader2 size={20} className="text-primary animate-spin" />}
                    {ps.status === 'success' && <CheckCircle size={20} className="text-green-400" />}
                    {ps.status === 'error' && <AlertCircle size={20} className="text-red-400" />}
                    {ps.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-[var(--theme-card-border)]" />}
                    <span className={`flex-1 ${ps.status === 'success' ? 'text-green-400' : ps.status === 'error' ? 'text-red-400' : 'text-[var(--theme-text)]'}`}>
                      {ps.label}
                    </span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Sucesso */}
          {step === 'sucesso' && createdClinica && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--theme-text)]">Clínica Criada!</h2>
                <p className="text-[var(--theme-text-muted)] mt-1">Anote as credenciais para passar à clínica</p>
              </div>

              {warning && (
                <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-sm">
                  <strong>Atenção:</strong> {warning}
                </div>
              )}

              <div className="bg-[var(--theme-bg-tertiary)] rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-[var(--theme-text-muted)] mb-2">Credenciais de Acesso:</p>

                <div className="flex items-center justify-between p-2 bg-[var(--theme-card)] rounded">
                  <div>
                    <span className="text-xs text-[var(--theme-text-muted)]">URL:</span>
                    <p className="text-[var(--theme-text)]">{window.location.origin}</p>
                  </div>
                  <button
                    onClick={() => copiarParaClipboard(window.location.origin, 'url')}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded"
                  >
                    {copied === 'url' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 bg-[var(--theme-card)] rounded">
                  <div>
                    <span className="text-xs text-[var(--theme-text-muted)]">Email:</span>
                    <p className="text-[var(--theme-text)]">{formData.usuarioEmail}</p>
                  </div>
                  <button
                    onClick={() => copiarParaClipboard(formData.usuarioEmail, 'email')}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded"
                  >
                    {copied === 'email' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2 bg-[var(--theme-card)] rounded">
                  <div>
                    <span className="text-xs text-[var(--theme-text-muted)]">Senha:</span>
                    <p className="text-[var(--theme-text)]">{formData.usuarioSenha}</p>
                  </div>
                  <button
                    onClick={() => copiarParaClipboard(formData.usuarioSenha, 'senha')}
                    className="p-2 hover:bg-[var(--theme-bg-tertiary)] rounded"
                  >
                    {copied === 'senha' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 text-sm">
                <strong>Próximos passos para a clínica:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Acessar o sistema com as credenciais acima</li>
                  <li>Ir em Configurações &gt; WhatsApp e conectar o número</li>
                  <li>Configurar procedimentos e horários</li>
                </ol>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={() => onNavigate('clinica-detalhe', createdClinica.id)}
                  className="px-4 py-2 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] rounded-lg transition-colors"
                >
                  Ver Detalhes
                </button>
                <button
                  onClick={() => onNavigate('clinicas')}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
                >
                  Voltar para Lista
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
