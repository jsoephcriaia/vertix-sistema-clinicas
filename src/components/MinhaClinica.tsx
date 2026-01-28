'use client';

import {
  Building2,
  Scissors,
  Clock,
  HelpCircle,
  FileText,
  UserCog,
  ChevronRight
} from 'lucide-react';
import ConfigClinica from './config/ConfigClinica';
import ConfigProcedimentos from './config/ConfigProcedimentos';
import ConfigHorarios from './config/ConfigHorarios';
import ConfigFaq from './config/ConfigFaq';
import ConfigPoliticas from './config/ConfigPoliticas';
import ConfigEquipe from './config/ConfigEquipe';

interface MinhaClinicaProps {
  subPage: string | null;
  setSubPage: (sub: string | null) => void;
}

const menuConfig = [
  { id: 'info', label: 'Informações Básicas', icon: Building2, desc: 'Nome, endereço e dados da clínica' },
  { id: 'procedimentos', label: 'Procedimentos', icon: Scissors, desc: 'Catálogo de serviços e preços' },
  { id: 'horarios', label: 'Horários', icon: Clock, desc: 'Horários de funcionamento' },
  { id: 'profissionais', label: 'Profissionais', icon: UserCog, desc: 'Equipe e especialistas' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, desc: 'Perguntas frequentes' },
  { id: 'politicas', label: 'Políticas', icon: FileText, desc: 'Regras e termos' },
];

export default function MinhaClinica({ subPage, setSubPage }: MinhaClinicaProps) {

  const renderSubPage = () => {
    switch (subPage) {
      case 'info':
        return <ConfigClinica onBack={() => setSubPage(null)} />;
      case 'procedimentos':
        return <ConfigProcedimentos onBack={() => setSubPage(null)} />;
      case 'horarios':
        return <ConfigHorarios onBack={() => setSubPage(null)} />;
      case 'profissionais':
        return <ConfigEquipe onBack={() => setSubPage(null)} />;
      case 'faq':
        return <ConfigFaq onBack={() => setSubPage(null)} />;
      case 'politicas':
        return <ConfigPoliticas onBack={() => setSubPage(null)} />;
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
        <h1 className="text-2xl font-bold text-[var(--theme-text)]">Minha Clínica</h1>
        <p className="text-[var(--theme-text-muted)] text-sm mt-1">Configure as informações da sua clínica</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuConfig.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubPage(item.id)}
              className="bg-[var(--theme-card)] rounded-xl border border-[var(--theme-card-border)] p-5 hover:border-primary transition-colors text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Icon size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--theme-text)] group-hover:text-primary transition-colors">{item.label}</h3>
                  <p className="text-sm text-[var(--theme-text-muted)]">{item.desc}</p>
                </div>
                <ChevronRight size={20} className="text-[var(--theme-text-muted)] group-hover:text-primary transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
