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
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

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

interface Professional {
  id: string;
  name: string;
  specialty: string;
  photoUrl: string;
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
  professionals: string[];
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

const timeline = [
  { time: 'Hoje, 10:30 AM', title: 'Serviço Iniciado', description: 'Técnico chegou ao local', active: true },
  { time: 'Hoje, 08:15 AM', title: 'Demanda Despachada', description: '', active: false },
  { time: 'Hoje, 07:45 AM', title: 'Reportado', description: '', active: false },
];

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
  
  // New States
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Auth Modal State
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
      const [reqRes, userRes, profRes] = await Promise.all([
        fetch(`/api/solicitacoes/${id}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/professionals?t=${timestamp}`, { cache: 'no-store' })
      ]);
      
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequest(data);
        if (data.checklist && data.checklist.length > 0) {
          setLocalChecklist(data.checklist);
        }
      }
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserRole(userData.role);
      }

      if (profRes.ok) {
        const profData = await profRes.json();
        setAllProfessionals(profData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
        fetchRequest();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleChecklistItem = (id: number) => {
    const updatedChecklist = localChecklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setLocalChecklist(updatedChecklist);
    updateBackendChecklist(updatedChecklist);
  };

  const startEditingTask = (id: number, currentTask: string) => {
    setEditingChecklistId(id);
    setEditTaskValue(currentTask);
  };

  const saveTaskDescription = (id: number) => {
    const updatedChecklist = localChecklist.map(item => 
      item.id === id ? { ...item, task: editTaskValue } : item
    );
    setLocalChecklist(updatedChecklist);
    setEditingChecklistId(null);
    updateBackendChecklist(updatedChecklist);
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

  const handleAssignProfessional = async (prof: Professional) => {
    if (!request) return;
    if (request.professionals.includes(prof.name)) return;
    
    const updatedProfs = [...request.professionals, prof.name];
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionals: updatedProfs }),
      });
      setRequest({ ...request, professionals: updatedProfs });
      addTimelineEvent(`Profissional ${prof.name} atribuído`);
    } catch (error) {
      console.error('Error assigning professional:', error);
    }
  };

  const handleRemoveProfessional = async (profName: string) => {
    if (!request) return;
    const updatedProfs = request.professionals.filter(p => p !== profName);
    try {
      await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionals: updatedProfs }),
      });
      setRequest({ ...request, professionals: updatedProfs });
      addTimelineEvent(`Profissional ${profName} removido`);
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
      // Mock upload - in a real app we'd upload to Supabase Storage
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

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) {
    return (
      <DashboardLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Carregando detalhes da solicitação...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout title="Não Encontrado">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">Solicitação não encontrada.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Detalhes do Serviço">
      <div className="max-w-5xl mx-auto w-full">
        {/* Hero Title Section */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                request.status === 'Em Andamento' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                request.status === 'Novo' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                request.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                {request.status}
              </span>
              <p className="text-slate-400 text-xs font-mono font-black">{request.id}</p>
            </div>
            <h1 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-tight mt-1 uppercase">
              {request.description}
            </h1>
            <p className="text-slate-500 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
              <Clock size={12} className="text-amber-600" />
              Aberto em {request.date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              <Camera size={18} className="text-slate-400" />
              Adicionar Foto
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              <RefreshCw size={18} className="text-amber-600" />
              Atualizar Status
            </button>
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

        {/* Tabs Navigation */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('detalhes')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'detalhes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Detalhes
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'timeline' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Linha do Tempo
            </button>
            <button 
              onClick={() => setActiveTab('equipe')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'equipe' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Equipe
            </button>
            <button 
              onClick={() => setActiveTab('documentos')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'documentos' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Documentos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'detalhes' && (
              <>
                {/* Service Description */}
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                      <FileText className="text-amber-600" size={18} />
                      Descrição do Serviço
                    </h3>
                    {request.urgency && (
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                        request.urgency === 'Emergencial' ? 'bg-rose-500 text-white' :
                        request.urgency === 'Alta' ? 'bg-rose-50 text-rose-600' :
                        request.urgency === 'Média' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        <AlertTriangle size={12} />
                        Urgência: {request.urgency}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed mb-4">
                    {request.description}. Solicitação realizada para a unidade {request.unit}.
                  </p>
                  
                  {request.authorizedBy && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dados da {request.status}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Agente Responsável</p>
                          <p className="text-xs font-bold text-slate-700">{request.authorizedBy} • {request.authorizedPosition}</p>
                        </div>
                        {request.authorizedJustification && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Justificativa</p>
                            <p className="text-xs font-medium text-slate-600 italic">&quot;{request.authorizedJustification}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {request.images && request.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      {request.images.map((img, idx) => (
                        <div key={idx} className="aspect-video bg-slate-50 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-200">
                          <Image 
                            src={img}
                            alt={`Service image ${idx + 1}`}
                            fill
                            className="object-cover transition-all group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Ver Foto</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(request.tombamento || request.modeloEquipamento || request.tipoEquipamento || request.btus) && (
                    <div className="mt-8 p-6 rounded-xl border border-amber-100 bg-amber-50/30">
                      <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest mb-4">
                        <Box className="text-amber-600" size={18} />
                        Dados do Equipamento
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {request.tombamento && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tombamento</p>
                            <p className="text-xs font-bold text-slate-700">{request.tombamento}</p>
                          </div>
                        )}
                        {request.modeloEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Modelo</p>
                            <p className="text-xs font-bold text-slate-700">{request.modeloEquipamento}</p>
                          </div>
                        )}
                        {request.tipoEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tipo</p>
                            <p className="text-xs font-bold text-slate-700">{request.tipoEquipamento}</p>
                          </div>
                        )}
                        {request.btus && (
                          <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">BTUs</p>
                            <p className="text-xs font-bold text-slate-700">{request.btus}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {request.observacao && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações Adicionais</h4>
                      <p className="text-xs font-medium text-slate-600 italic">&quot;{request.observacao}&quot;</p>
                    </div>
                  )}
                </section>

                {/* Checklist Section */}
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                      <CheckSquare className="text-amber-600" size={18} />
                      Checklist de Manutenção
                    </h3>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase tracking-widest">
                      {localChecklist.filter(i => i.completed).length} / {localChecklist.length} Tarefas
                    </span>
                  </div>
                  <div className="space-y-3">
                    {localChecklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={item.completed} 
                            onChange={() => toggleChecklistItem(item.id)}
                            className="h-4 w-4 rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-500/50 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          {editingChecklistId === item.id ? (
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-amber-500/50"
                                value={editTaskValue}
                                onChange={(e) => setEditTaskValue(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveTaskDescription(item.id)}
                              />
                              <button 
                                onClick={() => saveTaskDescription(item.id)}
                                className="text-[10px] font-black text-emerald-600 uppercase tracking-widest"
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span 
                                onClick={() => toggleChecklistItem(item.id)}
                                className={`text-xs font-bold cursor-pointer ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                              >
                                {item.task}
                              </span>
                              <button 
                                onClick={() => startEditingTask(item.id, item.task)}
                                className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-amber-600 uppercase tracking-widest transition-opacity"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {activeTab === 'timeline' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                    <Timer className="text-amber-600" size={18} />
                    Linha do Tempo Detalhada
                  </h3>
                </div>

                {/* Manual Comment Input */}
                <div className="mb-8 flex gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all pr-12"
                      placeholder="Adicionar um comentário ou atualização manual..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <MessageSquare className="absolute right-4 top-3.5 text-slate-300" size={18} />
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
                        <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-200'}`}></div>
                        <div className={`p-4 rounded-xl border ${item.type === 'manual' ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] text-slate-400 font-black font-mono uppercase">
                              {new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${item.type === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                              {item.type === 'manual' ? 'Comentário' : 'Sistema'}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.action}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-1">
                            <User size={10} />
                            Responsável: {item.user}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 italic text-xs">
                      Nenhum evento registrado na linha do tempo.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'equipe' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                    <User className="text-amber-600" size={18} />
                    Equipe Técnica Alocada
                  </h3>
                  <button 
                    onClick={() => setIsAssigning(!isAssigning)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                  >
                    <UserPlus size={14} />
                    {isAssigning ? 'Fechar Busca' : 'Atribuir Profissional'}
                  </button>
                </div>

                {isAssigning && (
                  <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selecione um profissional para atribuir:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allProfessionals.map((prof) => (
                        <button
                          key={prof.id}
                          onClick={() => handleAssignProfessional(prof)}
                          disabled={request.professionals.includes(prof.name)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            request.professionals.includes(prof.name)
                              ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                              : 'bg-white border-slate-200 hover:border-amber-500 hover:shadow-md'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-slate-100">
                            <Image src={prof.photoUrl} alt={prof.name} fill className="object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{prof.name}</p>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{prof.specialty}</p>
                          </div>
                          {!request.professionals.includes(prof.name) && (
                            <Plus size={16} className="ml-auto text-amber-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {request.professionals && request.professionals.length > 0 ? (
                    request.professionals.map((pName, idx) => {
                      const prof = allProfessionals.find(ap => ap.name === pName);
                      return (
                        <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 group">
                          <div className="w-12 h-12 rounded-lg bg-amber-500 overflow-hidden relative border border-white shadow-sm">
                            {prof ? (
                              <Image src={prof.photoUrl} alt={pName} fill className="object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
                                {pName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{pName}</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                              {prof?.specialty || 'Técnico Alocado'}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleRemoveProfessional(pName)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Remover Profissional"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-400 italic text-xs border-2 border-dashed border-slate-50 rounded-xl">
                      Nenhum profissional alocado a este serviço.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'documentos' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                    <FileText className="text-amber-600" size={18} />
                    Documentos e Anexos
                  </h3>
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all cursor-pointer">
                    <FileUp size={14} />
                    {isUploading ? 'Enviando...' : 'Anexar Documento'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,.doc,.docx,.xls,.xlsx" />
                  </label>
                </div>

                <div className="space-y-3">
                  {request.documents && request.documents.length > 0 ? (
                    request.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 group">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                          <Paperclip size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                            {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="Baixar Documento"
                        >
                          <Download size={18} />
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
                      <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 text-xs font-medium italic">Nenhum documento anexo a esta solicitação.</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-6">
            {/* Request Info Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Informações Técnicas</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Unidade Demandante</p>
                  <div className="flex items-start gap-2">
                    <Building2 className="text-slate-400" size={14} />
                    <p className="text-slate-700 text-xs font-bold">{request.unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Servidor Responsável</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] uppercase">
                        {request.responsibleServer ? request.responsibleServer.substring(0, 2).toUpperCase() : 'SR'}
                      </div>
                      <p className="text-slate-700 text-xs font-bold">{request.responsibleServer || 'Não informado'}</p>
                    </div>
                    {request.matriculaSiape && (
                      <p className="text-[10px] text-slate-500 font-medium ml-9">SIAPE: {request.matriculaSiape}</p>
                    )}
                    {request.emailSolicitante && (
                      <p className="text-[10px] text-slate-500 font-medium ml-9 truncate">{request.emailSolicitante}</p>
                    )}
                  </div>
                </div>
                {request.servidorRepassou && (
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Servidor que Repassou</p>
                    <div className="flex items-center gap-2">
                      <User className="text-slate-400" size={14} />
                      <p className="text-slate-700 text-xs font-bold">{request.servidorRepassou}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Data da Demanda</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-400" size={14} />
                    <p className="text-slate-600 text-xs font-mono">{request.date}</p>
                  </div>
                </div>
                {(request.dataFinalizacao || request.horaFinalizacao) && (
                  <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Finalização Prevista/Realizada</p>
                    <div className="flex items-center gap-2">
                      <Clock className="text-slate-400" size={14} />
                      <p className="text-slate-700 text-xs font-bold">
                        {request.dataFinalizacao} {request.horaFinalizacao}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Tipo de Serviço</p>
                  <div className="flex items-center gap-2">
                    <Wrench className="text-slate-400" size={14} />
                    <p className="text-slate-700 text-xs font-bold uppercase tracking-tight">{request.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Tempo Estimado</p>
                  <div className="flex items-center gap-2">
                    <Timer className="text-slate-400" size={14} />
                    <p className="text-amber-600 text-xs font-black font-mono">04:00:00</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Equipe Técnica</p>
                  <div className="flex flex-col gap-2">
                    {request.professionals && request.professionals.length > 0 ? (
                      request.professionals.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {request.avatar ? (
                            <div className="w-7 h-7 rounded overflow-hidden relative border border-slate-200">
                              <Image src={request.avatar} alt={p} fill className="object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-amber-600 font-black text-[10px] uppercase">
                              {p.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <p className="text-slate-700 text-xs font-bold truncate">{p}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Não atribuído</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Log de Atividades</h3>
              <div className="relative space-y-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-100">
                {timeline.map((item, index) => (
                  <div key={index} className="relative pl-8">
                    <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white ${item.active ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-200'}`}></div>
                    <p className="text-[9px] text-slate-400 font-black font-mono mb-0.5 uppercase">{item.time}</p>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{item.title}</p>
                    {item.description && <p className="text-[10px] text-slate-500 font-medium">{item.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Action */}
            <button className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={20} />
              Concluir Serviço
            </button>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
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
              <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${
                authAction === 'Autorizado' ? 'bg-emerald-50' : 'bg-rose-50'
              }`}>
                <div>
                  <h3 className={`text-lg font-black tracking-tight uppercase ${
                    authAction === 'Autorizado' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {authAction === 'Autorizado' ? 'Autorizar Ordem de Serviço' : 'Negar Ordem de Serviço'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Autenticação do Servidor Responsável</p>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Agente</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all"
                      placeholder="Seu nome completo"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cargo / Função</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all"
                      placeholder="Ex: Gestor de Manutenção"
                      value={authPosition}
                      onChange={(e) => setAuthPosition(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nível de Urgência</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Baixa', 'Média', 'Alta', 'Emergencial'].map((u) => (
                      <button
                        key={u}
                        onClick={() => setAuthUrgency(u as any)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                          authUrgency === u 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                            : 'bg-white text-slate-400 border-slate-200 hover:border-amber-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Justificativa (Opcional)</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all min-h-[100px]"
                    placeholder="Descreva o motivo da decisão ou observações técnicas..."
                    value={authJustification}
                    onChange={(e) => setAuthJustification(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsAuthModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAuthSubmit}
                    disabled={!authName || !authPosition}
                    className={`flex-1 px-4 py-3 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
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
