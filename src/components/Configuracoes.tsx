'use client';

import { useState } from 'react';
import { 
  Building2, 
  Scissors, 
  Clock, 
  Users, 
  HelpCircle, 
  FileText,
  Smartphone,
  Link,
  ChevronRight
} from 'lucide-react';
import ConfigClinica from './config/ConfigClinica';
import ConfigProcedimentos from './config/ConfigProcedimentos';
import ConfigHorarios from './config/ConfigHorarios';
import ConfigEquipe from './config/ConfigEquipe';
import ConfigFaq from './config/ConfigFaq';
import ConfigPoliticas from './config/ConfigPoliticas';
import ConfigWhatsApp from './config/ConfigWhatsApp';
import ConfigIntegracoes from './config/ConfigIntegracoes';

const menuConfig = [
  { id: 'clinica', label: 'Minha Clínica', icon: Building2, desc: 'Informações básicas da clínica' },
  { id: 'procedimentos', label: 'Procedimentos', icon: Scissors, desc: 'Catálogo de serviços e preços' },
  { id: 'horarios', label: 'Horários', icon: Clock, desc: 'Horários de atendimento' },
  { id: 'equipe', label: 'Equipe', icon: Users, desc: 'Profissionais da clínica' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, desc: 'Perguntas frequentes' },
  { id: 'politicas', label: 'Políticas', icon: FileText, desc: 'Regras e termos' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, desc: 'Conexão WhatsApp Business' },
  { id: 'integracoes', label: 'Integrações', icon: Link, desc: 'Google Agenda e Drive' },
];

export default function Configuracoes() {
  const [subPage, setSubPage] = useState<string | null>(null);

  const renderSubPage = () => {
    switch (subPage) {
      case 'clinica':
        return <ConfigClinica onBack={() => setSubPage(null)} />;
      case 'procedimentos':
        return <ConfigProcedimentos onBack={() => setSubPage(null)} />;
      case 'horarios':
        return <ConfigHorarios onBack={() => setSubPage(null)} />;
      case 'equipe':
        return <ConfigEquipe onBack={() => setSubPage(null)} />;
      case 'faq':
        return <ConfigFaq onBack={() => setSubPage(null)} />;
      case 'politicas':
        return <ConfigPoliticas onBack={() => setSubPage(null)} />;
      case 'whatsapp':
        return <ConfigWhatsApp onBack={() => setSubPage(null)} />;
      case 'integracoes':
        return <ConfigIntegracoes onBack={() => setSubPage(null)} />;
      default:
        return null;
    }
  };

  if (subPage) {
    return renderSubPage();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-[#64748b] text-sm mt-1">Gerencie as informações da sua clínica</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuConfig.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubPage(item.id)}
              className="bg-[#1e293b] rounded-xl border border-[#334155] p-5 hover:border-[#10b981] transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                  <Icon size={24} className="text-[#10b981]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-[#10b981] transition-colors">{item.label}</h3>
                  <p className="text-sm text-[#64748b]">{item.desc}</p>
                </div>
                <ChevronRight size={20} className="text-[#64748b] group-hover:text-[#10b981] transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}