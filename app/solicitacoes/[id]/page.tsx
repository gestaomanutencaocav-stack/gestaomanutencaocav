'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Clock, 
  Camera, 
  RefreshCw, 
  FileText, 
  CheckSquare, 
  Building2, 
  Calendar, 
  Wrench, 
  Timer,
  CheckCircle2,
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  User,
  Box,
  UserPlus,
  Trash2,
  Plus,
  FileUp,
  Download,
  MessageSquare,
  Paperclip,
  Send
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineEvent {
  date: string;
  action: string;
  user: string;
  type: 'auto' | 'manual';
}

interface Document {
  name: string;
  size: number;
  url: string;
  date: string;
}

interface AssignedProfessional {
  name: string;
  role: string;
}

interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  responsibleServer?: string;
  date: string;
  type: string;
  status: string;
  statusColor: string;
  professionals: AssignedProfessional[];
  avatar: string | null;
  authorizedBy?: string;
  authorizedPosition?: string;
  authorizedJustification?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Emergencial';
  images?: string[];
  checklist?: { id: number; task: string; completed: boolean }[];
  matriculaSiape?: string;
  emailSolicitante?: string;
  tombamento?: string;
  modeloEquipamento?: string;
  tipoEquipamento?: string;
  btus?: string;
  horaFinalizacao?: string;
  dataFinalizacao?: string;
  servidorRepassou?: string;
  observacao?: string;
  timeline?: TimelineEvent[];
  documents?: Document[];
}

const initialChecklist = [
  { id: 1, task: 'Diagnóstico inicial do sistema e verificação de energia', completed: false },
  { id: 2, task: 'Inspecionar suportes do compressor quanto a vibração', completed: false },
  { id: 3, task: 'Verificar níveis de pressão do refrigerante', completed: false },
  { id: 4, task: 'Limpar linha de drenagem de condensação', completed: false },
  { id: 5, task: 'Teste final de desempenho e limpeza', completed: false },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

export default function RequestDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'encarregado' | 'gestao' | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'timeline' | 'equipe' | 'documentos'>('detalhes');
  const [localChecklist, setLocalChecklist] = useState(initialChecklist);
  const [editingChecklistId, setEditingChecklistId] = useState<number | null>(null);
  const [editTaskValue, setEditTaskValue] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [concludeDate, setConcludeDate] = useState(new Date().toISOString().split('T')[0]);
  const [concludeTime, setConcludeTime] = useState(new Date().toTimeString().slice(0, 5));
  const [concludeObservation, setConcludeObservation] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Equipe — campos abertos
  const [newProfName, setNewProfName] = useState('');
  const [newProfRole, setNewProfRole] = useState('');

  // Auth Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'Autorizado' | 'Negado'>('Autorizado');
  const [authName, setAuthName] = useState('');
  const [authPosition, setAuthPosition] = useState('');
  const [authJustification, setAuthJustification] = useState('');
  const [authUrgency, setAuthUrgency] = useState<'Baixa' | 'Média' | 'Alta' | 'Emergencial'>('Média');

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    try {
      const timestamp = Date.now();
      const [reqRes, userRes] = await Promise.all([
        fetch(`/api/solicitacoes/${id}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' }),
      ]);
      if (reqRes.ok) {
        const data = await reqRes.json();
        // Normaliza professionals para array de objetos
        const professionals = (data.professionals || []).map((p: any) =>
          typeof p === 'string' ? { name: p, role: 'Técnico Alocado' } : p
        );
        setRequest({ ...data, professionals });
        if (data.checklist && data.checklist.length > 0) {
          setLocalChecklist(data.checklist);
        }
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserRole(userData.role);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const addTimelineEvent = async (action: string, type: 'auto' | 'manual' = 'auto') => {
    if (!request) return;
    const newEvent: TimelineEvent = {
      date: new Date().toISOString(),
      action,
      user: authName || 'Usuário',
      type
    };
    const updatedTimeline = [newEvent, ...(request.timeline || [])];
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      setRequest({ ...request, timeline: updatedTimeline });
    } catch (error) {
      console.error('Error adding timeline event:', error);
    }
  };

  const handleAuthSubmit = async () => {
    if (!request || !authName || !authPosition) return;
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: authAction, 
          statusColor: authAction === 'Autorizado' ? 'emerald' : 'rose',
          authorizedBy: authName,
          authorizedPosition: authPosition,
          authorizedJustification: authJustification,
          urgency: authUrgency
        }),
      });
      if (res.ok) {
        setIsAuthModalOpen(false);
        addTimelineEvent(`Serviço ${authAction} por ${authName} (${authPosition})`);
        fetchRequest();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleConcludeService = async () => {
    if (!request) return;
    setIsConcluding(true);
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Concluído',
          statusColor: 'green',
          data_finalizacao: concludeDate,
          hora_finalizacao: concludeTime,
          observacao: concludeObservation || request.observacao,
        }),
      });
      if (res.ok) {
        setIsConcludeModalOpen(false);
        addTimelineEvent(
          `Serviço concluído em ${new Date(concludeDate).toLocaleDateString('pt-BR')} às ${concludeTime}`
        );
        fetchRequest();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsConcluding(false);
    }
  };

  const toggleChecklistItem = (itemId: number) => {
    const updated = localChecklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setLocalChecklist(updated);
    updateBackendChecklist(updated);
  };

  const startEditingTask = (itemId: number, currentTask: string) => {
    setEditingChecklistId(itemId);
    setEditTaskValue(currentTask);
  };

  const saveTaskDescription = (itemId: number) => {
    const updated = localChecklist.map(item =>
      item.id === itemId ? { ...item, task: editTaskValue } : item
    );
    setLocalChecklist(updated);
    setEditingChecklistId(null);
    updateBackendChecklist(updated);
  };

  const addChecklistItem = () => {
    const newItem = {
      id: Date.now(),
      task: 'Nova tarefa',
      completed: false
    };
    const updated = [...localChecklist, newItem];
    setLocalChecklist(updated);
    setEditingChecklistId(newItem.id);
    setEditTaskValue('Nova tarefa');
    updateBackendChecklist(updated);
  };

  const removeChecklistItem = (itemId: number) => {
    const updated = localChecklist.filter(item => item.id !== itemId);
    setLocalChecklist(updated);
    updateBackendChecklist(updated);
  };

  const updateBackendChecklist = async (checklistData: any[]) => {
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: checklistData }),
      });
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  };

  const handleAddProfessional = async () => {
    if (!newProfName.trim() || !newProfRole.trim() || !request) return;
    const newProf: AssignedProfessional = { name: newProfName.trim(), role: newProfRole.trim() };
    const updated = [...(request.professionals || []), newProf];
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionals: updated }),
      });
      setRequest({ ...request, professionals: updated });
      addTimelineEvent(`Profissional ${newProf.name} (${newProf.role}) atribuído`);
      setNewProfName('');
      setNewProfRole('');
    } catch (error) {
      console.error('Error adding professional:', error);
    }
  };

  const handleRemoveProfessional = async (index: number) => {
    if (!request) return;
    const removed = request.professionals[index];
    const updated = request.professionals.filter((_, i) => i !== index);
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionals: updated }),
      });
      setRequest({ ...request, professionals: updated });
      addTimelineEvent(`Profissional ${removed.name} removido`);
    } catch (error) {
      console.error('Error removing professional:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !request) return;
    await addTimelineEvent(newComment, 'manual');
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !request) return;
    setIsUploading(true);
    try {
      const mockUrl = `https://example.com/files/${file.name}`;
      const newDoc: Document = {
        name: file.name,
        size: file.size,
        url: mockUrl,
        date: new Date().toISOString()
      };
      const updatedDocs = [newDoc, ...(request.documents || [])];
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: updatedDocs }),
      });
      setRequest({ ...request, documents: updatedDocs });
      addTimelineEvent(`Documento ${file.name} anexado`);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateUrgency = async (newUrgency: 'Baixa' | 'Média' | 'Alta' | 'Emergencial') => {
    if (!request) return;
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urgency: newUrgency }),
      });
      setRequest({ ...request, urgency: newUrgency });
      addTimelineEvent(`Urgência alterada para ${newUrgency}`);
    } catch (error) {
      console.error('Error updating urgency:', error);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) {
    return (
      <DashboardLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600 font-medium">Carregando detalhes da solicitação...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout title="Não Encontrado">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600 font-medium">Solicitação não encontrada.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isCompleted = request.status === 'Concluído';
  const completedCount = localChecklist.filter(i => i.completed).length;

  return (
    <DashboardLayout title="Detalhes do Serviço">
      <div className="max-w-5xl mx-auto w-full">

        {/* Notificação de sucesso */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-6 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/30"
            >
              ✓ Serviço concluído com sucesso!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Title */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                request.status === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                request.status === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                request.status === 'Novo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                request.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {request.status}
              </span>
              <p className="text-slate-600 text-xs font-mono font-black">{request.id}</p>
            </div>
            <h1 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-tight mt-1 uppercase">
              {request.description}
            </h1>
            <p className="text-slate-600 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
              <Clock size={12} className="text-amber-600" />
              Aberto em {request.date}
            </p>
            {isCompleted && request.dataFinalizacao && (
              <p className="text-emerald-700 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={12} />
                Concluído em {new Date(request.dataFinalizacao).toLocaleDateString('pt-BR')} às {request.horaFinalizacao}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer">
              <Camera size={18} className="text-slate-500" />
              Adicionar Foto
              <input type="file" className="hidden" accept="image/*" />
            </label>
            {userRole && request.status === 'Novo' && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setAuthAction('Autorizado'); setIsAuthModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <ShieldCheck size={18} />
                  Autorizar
                </button>
                <button
                  onClick={() => { setAuthAction('Negado'); setIsAuthModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
                >
                  <ShieldAlert size={18} />
                  Negar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-8 overflow-x-auto">
            {['detalhes', 'timeline', 'equipe', 'documentos'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                  activeTab === tab ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'detalhes' ? 'Detalhes' :
                 tab === 'timeline' ? 'Linha do Tempo' :
                 tab === 'equipe' ? 'Equipe' : 'Documentos'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">

            {/* ABA DETALHES */}
            {activeTab === 'detalhes' && (
              <>
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                      <FileText className="text-amber-600" size={18} />
                      Descrição do Serviço
                    </h3>
                    {request.urgency && (
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                        request.urgency === 'Emergencial' ? 'bg-rose-500 text-white' :
                        request.urgency === 'Alta' ? 'bg-rose-100 text-rose-700' :
                        request.urgency === 'Média' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        <AlertTriangle size={12} />
                        Urgência: {request.urgency}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed mb-4">{request.description}</p>

                  {/* Grau de Urgência */}
                  <div className="mt-6">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">Alterar Grau de Urgência</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {(['Baixa', 'Média', 'Alta', 'Emergencial'] as const).map((u) => (
                        <button
                          key={u}
                          onClick={() => handleUpdateUrgency(u)}
                          className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                            request.urgency === u
                              ? u === 'Emergencial' ? 'bg-rose-500 text-white border-rose-500' :
                                u === 'Alta' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                u === 'Média' ? 'bg-amber-500 text-white border-amber-500' :
                                'bg-emerald-100 text-emerald-700 border-emerald-300'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {request.authorizedBy && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">Dados da {request.status}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Agente Responsável</p>
                          <p className="text-xs font-bold text-slate-800">{request.authorizedBy} • {request.authorizedPosition}</p>
                        </div>
                        {request.authorizedJustification && (
                          <div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Justificativa</p>
                            <p className="text-xs font-medium text-slate-700 italic">&quot;{request.authorizedJustification}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(request.tombamento || request.modeloEquipamento || request.tipoEquipamento || request.btus) && (
                    <div className="mt-8 p-6 rounded-xl border border-amber-200 bg-amber-50">
                      <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest mb-4">
                        <Box className="text-amber-600" size={18} />
                        Dados do Equipamento
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {request.tombamento && (
                          <div>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Tombamento</p>
                            <p className="text-xs font-bold text-slate-900">{request.tombamento}</p>
                          </div>
                        )}
                        {request.modeloEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Modelo</p>
                            <p className="text-xs font-bold text-slate-900">{request.modeloEquipamento}</p>
                          </div>
                        )}
                        {request.tipoEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Tipo</p>
                            <p className="text-xs font-bold text-slate-900">{request.tipoEquipamento}</p>
                          </div>
                        )}
                        {request.btus && (
                          <div>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">BTUs</p>
                            <p className="text-xs font-bold text-slate-900">{request.btus}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {request.observacao && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Observações Adicionais</h4>
                      <p className="text-xs font-medium text-slate-800 italic">&quot;{request.observacao}&quot;</p>
                    </div>
                  )}
                </section>

                {/* Checklist */}
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                      <CheckSquare className="text-amber-600" size={18} />
                      Checklist de Manutenção
                    </h3>
                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest">
                      {completedCount} / {localChecklist.length} Tarefas
                    </span>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mb-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${localChecklist.length > 0 ? (completedCount / localChecklist.length) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {localChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          {editingChecklistId === item.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500/50"
                                value={editTaskValue}
                                onChange={(e) => setEditTaskValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveTaskDescription(item.id)}
                              />
                              <button onClick={() => saveTaskDescription(item.id)} className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Salvar</button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span
                                onClick={() => toggleChecklistItem(item.id)}
                                className={`text-xs font-bold cursor-pointer ${item.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                              >
                                {item.task}
                              </span>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditingTask(item.id, item.task)} className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Editar</button>
                                <button onClick={() => removeChecklistItem(item.id)} className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Remover</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addChecklistItem}
                    className="mt-4 flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors"
                  >
                    <Plus size={14} />
                    Adicionar Item
                  </button>
                </section>
              </>
            )}

            {/* ABA TIMELINE */}
            {activeTab === 'timeline' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest mb-6">
                  <Timer className="text-amber-600" size={18} />
                  Linha do Tempo Detalhada
                </h3>

                <div className="mb-8 flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all pr-12 placeholder:text-slate-400"
                      placeholder="Adicionar comentário ou atualização..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <MessageSquare className="absolute right-4 top-3.5 text-slate-400" size={18} />
                  </div>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </div>

                <div className="relative space-y-8 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-100">
                  {request.timeline && request.timeline.length > 0 ? (
                    request.timeline.map((item, index) => (
                      <div key={index} className="relative pl-10">
                        <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-300'}`} />
                        <div className={`p-4 rounded-xl border ${item.type === 'manual' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] text-slate-600 font-black font-mono uppercase">
                              {new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${item.type === 'manual' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>
                              {item.type === 'manual' ? 'Comentário' : 'Sistema'}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.action}</p>
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-2 flex items-center gap-1">
                            <User size={10} />
                            {item.user}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-500 italic text-xs">
                      Nenhum evento registrado na linha do tempo.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ABA EQUIPE */}
            {activeTab === 'equipe' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest mb-6">
                  <User className="text-amber-600" size={18} />
                  Equipe Técnica Alocada
                </h3>

                {/* Campo aberto para adicionar profissional */}
                <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4">Adicionar Profissional</p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-400 font-medium"
                      placeholder="Nome do profissional"
                      value={newProfName}
                      onChange={(e) => setNewProfName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddProfessional()}
                    />
                    <input
                      type="text"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-400 font-medium"
                      placeholder="Atribuição (ex: Eletricista)"
                      value={newProfRole}
                      onChange={(e) => setNewProfRole(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddProfessional()}
                    />
                    <button
                      onClick={handleAddProfessional}
                      disabled={!newProfName.trim() || !newProfRole.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de profissionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.professionals && request.professionals.length > 0 ? (
                    request.professionals.map((prof, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white group hover:border-amber-200 transition-all">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black text-lg shadow-sm flex-shrink-0">
                          {getInitials(prof.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{prof.name}</p>
                          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{prof.role}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveProfessional(idx)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                          title="Remover Profissional"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-500 italic text-xs border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum profissional alocado a este serviço.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ABA DOCUMENTOS */}
            {activeTab === 'documentos' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                    <FileText className="text-amber-600" size={18} />
                    Documentos e Anexos
                  </h3>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all cursor-pointer">
                    <FileUp size={14} />
                    {isUploading ? 'Enviando...' : 'Anexar Documento'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                  </label>
                </div>

                <div className="space-y-3">
                  {request.documents && request.documents.length > 0 ? (
                    request.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 group">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                          <Paperclip size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                            {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                      <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500 text-xs font-medium italic">Nenhum documento anexo a esta solicitação.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Informações Técnicas</h3>
              <div className="space-y-5">
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Unidade Demandante</p>
                  <div className="flex items-start gap-2">
                    <Building2 className="text-slate-500 mt-0.5" size={14} />
                    <p className="text-slate-800 text-xs font-bold">{request.unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Servidor Responsável</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-[10px] uppercase">
                      {request.responsibleServer ? getInitials(request.responsibleServer) : 'SR'}
                    </div>
                    <p className="text-slate-800 text-xs font-bold">{request.responsibleServer || 'Não informado'}</p>
                  </div>
                  {request.matriculaSiape && (
                    <p className="text-[10px] text-slate-600 font-medium ml-9 mt-1">SIAPE: {request.matriculaSiape}</p>
                  )}
                  {request.emailSolicitante && (
                    <p className="text-[10px] text-slate-600 font-medium ml-9 mt-1 truncate">{request.emailSolicitante}</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Tipo de Serviço</p>
                  <div className="flex items-center gap-2">
                    <Wrench className="text-slate-500" size={14} />
                    <p className="text-slate-800 text-xs font-bold uppercase tracking-tight">{request.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Data da Demanda</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-500" size={14} />
                    <p className="text-slate-700 text-xs font-mono">{request.date}</p>
                  </div>
                </div>
                {isCompleted && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-1">Serviço Concluído</p>
                    <p className="text-emerald-800 text-xs font-bold">
                      {request.dataFinalizacao && new Date(request.dataFinalizacao).toLocaleDateString('pt-BR')} às {request.horaFinalizacao}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Equipe Técnica</p>
                  <div className="flex flex-col gap-2">
                    {request.professionals && request.professionals.length > 0 ? (
                      request.professionals.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center text-white font-black text-[10px] uppercase">
                            {getInitials(p.name)}
                          </div>
                          <div>
                            <p className="text-slate-800 text-xs font-bold">{p.name}</p>
                            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{p.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-[10px] font-bold italic">Não atribuído</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Concluir */}
            <button
              onClick={() => setIsConcludeModalOpen(true)}
              disabled={isCompleted}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              }`}
            >
              <CheckCircle2 size={20} />
              {isCompleted ? 'Serviço Concluído' : 'Concluir Serviço'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Concluir Serviço */}
      <AnimatePresence>
        {isConcludeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConcludeModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-emerald-800 tracking-tight uppercase">Concluir Serviço</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Confirme os dados de finalização</p>
                </div>
                <button onClick={() => setIsConcludeModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Data de Conclusão</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                      value={concludeDate}
                      onChange={(e) => setConcludeDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Hora de Conclusão</label>
                    <input
                      type="time"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                      value={concludeTime}
                      onChange={(e) => setConcludeTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Observação Final (Opcional)</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[80px] placeholder:text-slate-400"
                    placeholder="Descreva como o serviço foi concluído..."
                    value={concludeObservation}
                    onChange={(e) => setConcludeObservation(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsConcludeModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConcludeService}
                    disabled={isConcluding}
                    className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                  >
                    {isConcluding ? 'Salvando...' : 'Confirmar Conclusão'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Autorizar/Negar */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className={`px-6 py-4 border-b flex items-center justify-between ${authAction === 'Autorizado' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div>
                  <h3 className={`text-lg font-black tracking-tight uppercase ${authAction === 'Autorizado' ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {authAction === 'Autorizado' ? 'Autorizar Ordem de Serviço' : 'Negar Ordem de Serviço'}
                  </h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Autenticação do Servidor Responsável</p>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-500 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Agente</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-400"
                      placeholder="Seu nome completo"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Cargo / Função</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-slate-400"
                      placeholder="Ex: Gestor de Manutenção"
                      value={authPosition}
                      onChange={(e) => setAuthPosition(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Nível de Urgência</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['Baixa', 'Média', 'Alta', 'Emergencial'] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setAuthUrgency(u)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                          authUrgency === u
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Justificativa (Opcional)</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[100px] placeholder:text-slate-400"
                    placeholder="Descreva o motivo da decisão..."
                    value={authJustification}
                    onChange={(e) => setAuthJustification(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsAuthModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAuthSubmit}
                    disabled={!authName || !authPosition}
                    className={`flex-1 px-4 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 ${
                      authAction === 'Autorizado' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                    }`}
                  >
                    Confirmar {authAction}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
