'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus, X, Save, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  interesse: string;
  valor_estimado: number;
  etapa: string;
  created_at: string;
}

const etapas = [
  { id: 'novo', label: 'Novos', cor: 'bg-blue-500' },
  { id: 'atendimento', label: 'Em Atendimento', cor: 'bg-yellow-500' },
  { id: 'agendado', label: 'Agendado', cor: 'bg-purple-500' },
  { id: 'convertido', label: 'Convertido', cor: 'bg-green-500' },
];

function LeadCard({ lead, onDelete }: { lead: Lead; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-[#0f172a] rounded-lg p-4 border border-[#334155] hover:border-[#10b981] transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium">{lead.nome}</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(lead.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 hover:bg-red-500/20 rounded transition-colors"
        >
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>

      <p className="text-sm text-[#10b981] mb-2">{lead.interesse}</p>

      <div className="flex items-center gap-2 text-xs text-[#64748b] mb-2">
        <Phone size={12} />
        <span>{lead.telefone}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#10b981]">
          R$ {Number(lead.valor_estimado || 0).toLocaleString('pt-BR')}
        </span>
        <span className="text-xs text-[#64748b]">{formatarData(lead.created_at)}</span>
      </div>
    </div>
  );
}

function Coluna({
  etapa,
  leads,
  total,
  onDelete,
}: {
  etapa: { id: string; label: string; cor: string };
  leads: Lead[];
  total: number;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: etapa.id,
  });

  return (
    <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
      <div className="p-4 border-b border-[#334155]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${etapa.cor}`}></div>
            <h3 className="font-semibold">{etapa.label}</h3>
            <span className="text-xs bg-[#334155] px-2 py-0.5 rounded-full">{leads.length}</span>
          </div>
        </div>
        <p className="text-xs text-[#10b981] mt-1">R$ {total.toLocaleString('pt-BR')}</p>
      </div>

      <div
        ref={setNodeRef}
        className={`p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-auto transition-colors ${
          isOver ? 'bg-[#10b981]/10' : ''
        }`}
      >
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onDelete={onDelete} />
        ))}

        {leads.length === 0 && (
          <div className={`text-center py-8 text-[#64748b] border-2 border-dashed rounded-lg ${isOver ? 'border-[#10b981]' : 'border-[#334155]'}`}>
            <p className="text-sm">Arraste um lead para cá</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { clinica } = useAuth();
  const CLINICA_ID = clinica?.id || '';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const novoLead: Lead = {
    id: '',
    nome: '',
    telefone: '',
    interesse: '',
    valor_estimado: 0,
    etapa: 'novo',
    created_at: '',
  };

  useEffect(() => {
    if (CLINICA_ID) {
      fetchLeads();
    }
  }, [CLINICA_ID]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pipeline')
      .select('*')
      .eq('clinica_id', CLINICA_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar leads:', error);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const handleNew = () => {
    setEditando({ ...novoLead });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editando || !editando.nome) return;

    setSaving(true);

    if (editando.id) {
      const { error } = await supabase
        .from('pipeline')
        .update({
          nome: editando.nome,
          telefone: editando.telefone,
          interesse: editando.interesse,
          valor_estimado: editando.valor_estimado,
          etapa: editando.etapa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editando.id);

      if (error) {
        console.error('Erro ao atualizar:', error);
        alert('Erro ao salvar lead');
      }
    } else {
      const { error } = await supabase
        .from('pipeline')
        .insert({
          clinica_id: CLINICA_ID,
          nome: editando.nome,
          telefone: editando.telefone,
          interesse: editando.interesse,
          valor_estimado: editando.valor_estimado,
          etapa: editando.etapa,
        });

      if (error) {
        console.error('Erro ao criar:', error);
        alert('Erro ao criar lead');
      }
    }

    setSaving(false);
    setShowModal(false);
    setEditando(null);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;

    const { error } = await supabase.from('pipeline').delete().eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
    } else {
      fetchLeads();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const novaEtapa = over.id as string;

    if (!etapas.find((e) => e.id === novaEtapa)) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.etapa === novaEtapa) return;

    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, etapa: novaEtapa } : l)));

    const { error } = await supabase
      .from('pipeline')
      .update({ etapa: novaEtapa, updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (error) {
      console.error('Erro ao mover lead:', error);
      fetchLeads();
    }
  };

  const getLeadsPorEtapa = (etapaId: string) => {
    return leads.filter((lead) => lead.etapa === etapaId);
  };

  const getTotalPorEtapa = (etapaId: string) => {
    return getLeadsPorEtapa(etapaId).reduce((acc, lead) => acc + Number(lead.valor_estimado || 0), 0);
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pipeline de Vendas</h1>
          <p className="text-[#64748b] text-sm">Arraste os cards para mover entre as etapas</p>
        </div>
        <button
          onClick={handleNew}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Lead
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {etapas.map((etapa) => (
            <Coluna
              key={etapa.id}
              etapa={etapa}
              leads={getLeadsPorEtapa(etapa.id)}
              total={getTotalPorEtapa(etapa.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="bg-[#0f172a] rounded-lg p-4 border-2 border-[#10b981] shadow-2xl w-64">
              <h4 className="font-medium mb-1">{activeLead.nome}</h4>
              <p className="text-sm text-[#10b981]">{activeLead.interesse}</p>
              <p className="text-sm font-medium text-[#10b981] mt-2">
                R$ {Number(activeLead.valor_estimado || 0).toLocaleString('pt-BR')}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showModal && editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] w-full max-w-md">
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-xl font-semibold">Novo Lead</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-[#334155] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#64748b] mb-2">Nome *</label>
                <input
                  type="text"
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Nome do lead"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Telefone</label>
                <input
                  type="text"
                  value={editando.telefone}
                  onChange={(e) => setEditando({ ...editando, telefone: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Interesse</label>
                <input
                  type="text"
                  value={editando.interesse}
                  onChange={(e) => setEditando({ ...editando, interesse: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="Ex: Harmonização Facial"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Valor Estimado</label>
                <input
                  type="number"
                  value={editando.valor_estimado}
                  onChange={(e) => setEditando({ ...editando, valor_estimado: Number(e.target.value) })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm text-[#64748b] mb-2">Etapa</label>
                <select
                  value={editando.etapa}
                  onChange={(e) => setEditando({ ...editando, etapa: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-3 focus:outline-none focus:border-[#10b981]"
                >
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-[#334155] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#334155] hover:bg-[#475569] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editando.nome}
                className="px-4 py-2 bg-[#10b981] hover:bg-[#059669] disabled:bg-[#334155] rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}