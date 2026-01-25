'use client';

import { useState, useEffect } from 'react';
import { Calendar, Phone, Clock, AlertTriangle, CheckCircle, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  ultimo_atendimento: string | null;
  proximo_retorno: string | null;
  observacoes: string;
}

export default function Retornos() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('atrasados');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (CLINICA_ID) {
      fetchClientes();
    }
  }, [CLINICA_ID]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .not('proximo_retorno', 'is', null)
      .order('proximo_retorno');

    if (error) {
      console.error('Erro ao buscar clientes:', error);
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const marcarContatado = async (clienteId: string) => {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);

    const { error } = await supabase
      .from('clientes')
      .update({ 
        proximo_retorno: novaData.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteId);

    if (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar cliente');
    } else {
      fetchClientes();
    }
  };

  const abrirWhatsApp = (telefone: string) => {
    const numero = telefone.replace(/\D/g, '');
    window.open('https://wa.me/55' + numero, '_blank');
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const getDiasAtraso = (data: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataRetorno = new Date(data + 'T00:00:00');
    const diffTime = hoje.getTime() - dataRetorno.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDiasParaRetorno = (data: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataRetorno = new Date(data + 'T00:00:00');
    const diffTime = dataRetorno.getTime() - hoje.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const clientesAtrasados = clientes.filter(c => c.proximo_retorno && getDiasAtraso(c.proximo_retorno) > 0);
  const clientesEstaSemana = clientes.filter(c => {
    if (!c.proximo_retorno) return false;
    const dias = getDiasParaRetorno(c.proximo_retorno);
    return dias >= 0 && dias <= 7;
  });
  const clientesProximaSemana = clientes.filter(c => {
    if (!c.proximo_retorno) return false;
    const dias = getDiasParaRetorno(c.proximo_retorno);
    return dias > 7 && dias <= 14;
  });
  const clientesEsteMes = clientes.filter(c => {
    if (!c.proximo_retorno) return false;
    const dias = getDiasParaRetorno(c.proximo_retorno);
    return dias > 14 && dias <= 30;
  });

  const getClientesFiltrados = () => {
    let lista: Cliente[] = [];
    if (filtro === 'atrasados') lista = clientesAtrasados;
    else if (filtro === 'esta-semana') lista = clientesEstaSemana;
    else if (filtro === 'proxima-semana') lista = clientesProximaSemana;
    else if (filtro === 'este-mes') lista = clientesEsteMes;
    else lista = clientes;

    if (busca) {
      lista = lista.filter(c => 
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.telefone.includes(busca)
      );
    }
    return lista;
  };

  const clientesFiltrados = getClientesFiltrados();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Retornos</h1>
        <p className="text-[#64748b] text-sm">Clientes que precisam retornar para procedimentos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFiltro('atrasados')}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'atrasados' ? 'bg-red-500/20 border-red-500' : 'bg-[#1e293b] border-[#334155] hover:border-red-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} className="text-red-400" />
            <span className="text-sm text-[#64748b]">Atrasados</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{clientesAtrasados.length}</p>
        </button>

        <button
          onClick={() => setFiltro('esta-semana')}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'esta-semana' ? 'bg-yellow-500/20 border-yellow-500' : 'bg-[#1e293b] border-[#334155] hover:border-yellow-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock size={20} className="text-yellow-400" />
            <span className="text-sm text-[#64748b]">Esta Semana</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{clientesEstaSemana.length}</p>
        </button>

        <button
          onClick={() => setFiltro('proxima-semana')}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'proxima-semana' ? 'bg-blue-500/20 border-blue-500' : 'bg-[#1e293b] border-[#334155] hover:border-blue-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className="text-blue-400" />
            <span className="text-sm text-[#64748b]">Próx. Semana</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{clientesProximaSemana.length}</p>
        </button>

        <button
          onClick={() => setFiltro('este-mes')}
          className={`p-4 rounded-xl border transition-colors text-left ${filtro === 'este-mes' ? 'bg-green-500/20 border-green-500' : 'bg-[#1e293b] border-[#334155] hover:border-green-500/50'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-sm text-[#64748b]">Este Mês</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{clientesEsteMes.length}</p>
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#10b981]"
        />
      </div>

      {clientesFiltrados.length === 0 ? (
        <div className="text-center py-12 text-[#64748b]">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Nenhum cliente nesta categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientesFiltrados.map((cliente) => {
            const diasAtraso = cliente.proximo_retorno ? getDiasAtraso(cliente.proximo_retorno) : 0;
            const diasPara = cliente.proximo_retorno ? getDiasParaRetorno(cliente.proximo_retorno) : 0;
            const atrasado = diasAtraso > 0;

            return (
              <div key={cliente.id} className={`bg-[#1e293b] rounded-xl border p-5 ${atrasado ? 'border-red-500/50' : 'border-[#334155]'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold flex-shrink-0">
                      {cliente.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{cliente.nome}</h3>
                      <div className="flex items-center gap-2 text-sm text-[#64748b]">
                        <Phone size={14} />
                        <span>{cliente.telefone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <p className="text-xs text-[#64748b] mb-1">Retorno previsto</p>
                    <p className={`font-semibold ${atrasado ? 'text-red-400' : 'text-white'}`}>
                      {formatarData(cliente.proximo_retorno)}
                    </p>
                    {atrasado && <p className="text-xs text-red-400">{diasAtraso} dias atrasado</p>}
                    {!atrasado && diasPara === 0 && <p className="text-xs text-yellow-400">Hoje!</p>}
                    {!atrasado && diasPara > 0 && <p className="text-xs text-[#64748b]">em {diasPara} dias</p>}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirWhatsApp(cliente.telefone)}
                      className="px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <Phone size={16} />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => marcarContatado(cliente.id)}
                      className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Contatado
                    </button>
                  </div>
                </div>

                {cliente.observacoes && (
                  <div className="mt-4 pt-4 border-t border-[#334155]">
                    <p className="text-sm text-[#94a3b8]">{cliente.observacoes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}