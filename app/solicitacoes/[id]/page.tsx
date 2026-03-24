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
  Eye,
  Plus,
  FileUp,
  Download,
  MessageSquare,
  Paperclip,
  Send,
  AlertCircle,
  CheckCircle,
  GripVertical
} from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  name: string;
  role: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
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
  professionals: Professional[];
  avatar: string | null;
  authorizedBy?: string;
  authorizedPosition?: string;
  authorizedJustification?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Emergencial';
  images?: string[];
  checklist?: ChecklistItem[];
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

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const SortableItem = ({ 
  item, 
  onToggle, 
  onRemove, 
  onTaskChange 
}: { 
  item: ChecklistItem; 
  onToggle: (id: string) => void; 
  onRemove: (id: string) => void; 
  onTaskChange: (id: string, task: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-3 bg-white border rounded-xl transition-all ${
        isDragging ? 'shadow-xl border-amber-200 scale-[1.02]' : 'border-slate-100 hover:border-slate-200 shadow-sm'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors"
      >
        <GripVertical size={16} />
      </button>

      <button
        onClick={() => onToggle(item.id)}
        className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
          item.completed 
            ? 'bg-amber-500 border-amber-500 text-white' 
            : 'border-slate-200 hover:border-amber-500'
        }`}
      >
        {item.completed && <CheckCircle2 size={12} strokeWidth={3} />}
      </button>

      <input
        type="text"
        id={`task-${item.id}`}
        value={item.task}
        onChange={(e) => onTaskChange(item.id, e.target.value)}
        placeholder="Descreva a tarefa..."
        className={`flex-grow bg-transparent border-none focus:ring-0 text-sm font-bold uppercase tracking-tight transition-all ${
          item.completed ? 'text-slate-400 line-through' : 'text-slate-700'
        }`}
      />

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={() => document.getElementById(`task-${item.id}`)?.focus()}
          className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
          title="Editar Tarefa"
        >
          <Wrench size={14} />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
          title="Remover Tarefa"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default function RequestDetailsPage() {
  const { id } = useParams() as { id: string };
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'encarregado' | 'gestao' | null>(null);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'timeline' | 'equipe' | 'documentos'>('detalhes');
  
  // Edit States
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // New States
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Team States
  const [newProfName, setNewProfName] = useState('');
  const [newProfRole, setNewProfRole] = useState('');
  
  // Completion Modal State
  const [isConcluirModalOpen, setIsConcluirModalOpen] = useState(false);
  const [conclusaoObs, setConclusaoObs] = useState('');

  // Checklist States
  const [newItemTask, setNewItemTask] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const [reqRes, userRes] = await Promise.all([
        fetch(`/api/solicitacoes/${id}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' })
      ]);
      
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequest(data);
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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveChanges = async (updatedFields?: Partial<MaintenanceRequest>) => {
    if (!request) return;
    setIsSaving(true);
    try {
      const payload = updatedFields || request;
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        showNotification('success', 'Alterações salvas com sucesso');
        fetchRequest();
      } else {
        showNotification('error', 'Erro ao salvar alterações');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const addTimelineEvent = (action: string, type: 'auto' | 'manual' = 'auto') => {
    if (!request) return;
    const newEvent: TimelineEvent = {
      date: new Date().toISOString(),
      action,
      user: authName || 'Usuário',
      type
    };
    const updatedTimeline = [newEvent, ...(request.timeline || [])];
    setRequest({ ...request, timeline: updatedTimeline });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !request) return;
    setIsSaving(true);
    try {
      const newEvent: TimelineEvent = {
        date: new Date().toISOString(),
        action: newComment,
        user: 'Usuário', // Ideally this should be the logged in user's name
        type: 'manual'
      };

      const updatedTimeline = [newEvent, ...(request.timeline || [])];
      
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });
      
      if (res.ok) {
        setRequest({ ...request, timeline: updatedTimeline });
        setNewComment('');
        showNotification('success', 'Comentário adicionado');
        fetchRequest();
      } else {
        showNotification('error', 'Erro ao adicionar comentário');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão ao adicionar comentário');
    } finally {
      setIsSaving(false);
    }
  };

  const ensureBucketExists = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'images')) {
        await supabase.storage.createBucket('images', { public: true });
      }
    } catch (e) {
      console.error('Error checking/creating bucket:', e);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !request) return;

    setIsUploading(true);
    const newImages = [...(request.images || [])];
    
    try {
      await ensureBucketExists();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `requests/${fileName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
            
          newImages.push(publicUrl);
        } catch (storageError) {
          console.warn('Supabase Storage failed, falling back to base64:', storageError);
          // Fallback to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newImages.push(base64);
        }
      }
      
      const updatedRequest = { ...request, images: newImages };
      setRequest(updatedRequest);
      
      const newEvent: TimelineEvent = {
        date: new Date().toISOString(),
        action: `Adicionou ${files.length} foto(s)`,
        user: 'Sistema',
        type: 'auto'
      };
      
      const updatedFields: Partial<MaintenanceRequest> = {
        images: newImages,
        timeline: [newEvent, ...(request.timeline || [])]
      };

      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok) {
        showNotification('success', 'Fotos enviadas com sucesso');
        fetchRequest();
      } else {
        showNotification('error', 'Erro ao salvar fotos no banco');
      }
    } catch (error: any) {
      console.error('Error in handlePhotoUpload:', error);
      showNotification('error', `Erro no upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !request) return;

    setIsUploading(true);
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.find(b => b.name === 'documents')) {
        await supabase.storage.createBucket('documents', { public: true });
      }
      
      const newDocs = [...(request.documents || [])];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${id}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        newDocs.push({
          name: file.name,
          size: file.size,
          url: publicUrl,
          date: new Date().toISOString()
        });
      }
      
      setRequest({ ...request, documents: newDocs });
      addTimelineEvent(`Anexou ${files.length} documento(s)`);
      showNotification('success', 'Documentos anexados com sucesso');
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      showNotification('error', `Erro no upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Checklist Handlers
  const handleDragEnd = (event: DragEndEvent) => {
    if (!request) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const items = request.checklist || [];
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      setRequest({ ...request, checklist: arrayMove(items, oldIndex, newIndex) });
    }
  };

  const saveChecklist = async (updatedChecklist: ChecklistItem[]) => {
    if (!request) return;
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklist: updatedChecklist }),
      });
      if (!res.ok) {
        showNotification('error', 'Erro ao salvar checklist');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão ao salvar checklist');
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newItemTask.trim() || !request) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      task: newItemTask,
      completed: false
    };
    const updatedChecklist = [...(request.checklist || []), newItem];
    setRequest({ ...request, checklist: updatedChecklist });
    setNewItemTask('');
    await saveChecklist(updatedChecklist);
  };

  const handleToggleChecklistItem = async (id: string) => {
    if (!request) return;
    const updatedChecklist = (request.checklist || []).map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setRequest({ ...request, checklist: updatedChecklist });
    await saveChecklist(updatedChecklist);
  };

  const handleRemoveChecklistItem = async (id: string) => {
    if (!request) return;
    const updatedChecklist = (request.checklist || []).filter(item => item.id !== id);
    setRequest({ ...request, checklist: updatedChecklist });
    await saveChecklist(updatedChecklist);
  };

  const handleTaskChange = async (id: string, task: string) => {
    if (!request) return;
    const updatedChecklist = (request.checklist || []).map(item => 
      item.id === id ? { ...item, task } : item
    );
    setRequest({ ...request, checklist: updatedChecklist });
    await saveChecklist(updatedChecklist);
  };

  const removePhoto = (idx: number) => {
    if (!request) return;
    const newImages = [...(request.images || [])];
    newImages.splice(idx, 1);
    setRequest({ ...request, images: newImages });
  };

  const removeDocument = (idx: number) => {
    if (!request) return;
    const newDocs = [...(request.documents || [])];
    newDocs.splice(idx, 1);
    setRequest({ ...request, documents: newDocs });
  };

  const handleAddProfessional = async () => {
    if (!newProfName.trim() || !newProfRole.trim() || !request) return;
    setIsSaving(true);
    try {
      const newProf = { name: newProfName, role: newProfRole };
      const updatedProfs = [...(request.professionals || []), newProf];
      
      const newEvent: TimelineEvent = {
        date: new Date().toISOString(),
        action: `Profissional ${newProfName} (${newProfRole}) atribuído`,
        user: 'Sistema',
        type: 'auto'
      };

      const updatedFields: Partial<MaintenanceRequest> = {
        professionals: updatedProfs,
        timeline: [newEvent, ...(request.timeline || [])]
      };

      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      
      if (res.ok) {
        setRequest({ ...request, ...updatedFields });
        setNewProfName('');
        setNewProfRole('');
        showNotification('success', 'Profissional adicionado com sucesso');
        fetchRequest();
      } else {
        showNotification('error', 'Erro ao adicionar profissional');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão ao adicionar profissional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProfessional = async (idx: number) => {
    if (!request) return;
    setIsSaving(true);
    try {
      const updatedProfs = [...(request.professionals || [])];
      const removed = updatedProfs[idx];
      updatedProfs.splice(idx, 1);
      
      const newEvent: TimelineEvent = {
        date: new Date().toISOString(),
        action: `Profissional ${removed.name} removido`,
        user: 'Sistema',
        type: 'auto'
      };

      const updatedFields: Partial<MaintenanceRequest> = {
        professionals: updatedProfs,
        timeline: [newEvent, ...(request.timeline || [])]
      };

      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      
      if (res.ok) {
        setRequest({ ...request, ...updatedFields });
        showNotification('success', 'Profissional removido com sucesso');
        fetchRequest();
      } else {
        showNotification('error', 'Erro ao remover profissional');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão ao remover profissional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuthSubmit = async () => {
    if (!request) return;
    setIsSaving(true);
    
    try {
      const now = new Date();
      const newEvent: TimelineEvent = {
        date: now.toISOString(),
        action: `Solicitação ${authAction} por ${authName} (${authPosition})`,
        user: authName,
        type: 'auto'
      };

      const updatedFields: Partial<MaintenanceRequest> = {
        status: authAction,
        statusColor: authAction === 'Autorizado' ? 'emerald' : 'rose',
        authorizedBy: authName,
        authorizedPosition: authPosition,
        authorizedJustification: authJustification,
        urgency: authUrgency,
        timeline: [newEvent, ...(request.timeline || [])]
      };

      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      
      if (res.ok) {
        setRequest({ ...request, ...updatedFields });
        setIsAuthModalOpen(false);
        showNotification('success', `Solicitação ${authAction} com sucesso`);
        fetchRequest();
      } else {
        showNotification('error', `Erro ao processar ${authAction}`);
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Erro de conexão');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConcluirServico = async () => {
    if (!request) return;
    setIsSaving(true);
    
    try {
      const now = new Date();
      const dataFinal = format(now, 'yyyy-MM-dd');
      const horaFinal = format(now, 'HH:mm');
      const dataFormatada = format(now, 'dd/MM/yyyy');
      
      const newEvent: TimelineEvent = {
        date: now.toISOString(),
        action: `Serviço concluído em ${dataFormatada} às ${horaFinal}`,
        user: 'Sistema',
        type: 'auto'
      };

      const updatedFields: Partial<MaintenanceRequest> = {
        status: 'Concluído',
        statusColor: 'emerald',
        dataFinalizacao: dataFinal,
        horaFinalizacao: horaFinal,
        observacao: conclusaoObs || request.observacao,
        timeline: [newEvent, ...(request.timeline || [])]
      };

      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });
      
      if (res.ok) {
        setRequest({ ...request, ...updatedFields });
        setIsConcluirModalOpen(false);
        showNotification('success', 'Serviço concluído com sucesso');
        fetchRequest();
      } else {
        const errData = await res.json();
        console.error('Erro ao concluir serviço:', errData);
        showNotification('error', `Erro ao concluir: ${errData.error || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro de conexão ao concluir serviço:', error);
      showNotification('error', 'Erro de conexão ao concluir serviço');
    } finally {
      setIsSaving(false);
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
                request.status === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                request.status === 'Novo' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                request.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                request.status === 'Concluído' ? 'bg-emerald-500 text-white border-emerald-600' :
                'bg-slate-50 text-slate-700 border-slate-100'
              }`}>
                {request.status} {request.status === 'Concluído' && request.dataFinalizacao && ` em ${format(new Date(request.dataFinalizacao + 'T12:00:00'), 'dd/MM/yyyy')} às ${request.horaFinalizacao}`}
              </span>
              <p className="text-slate-400 text-xs font-mono font-black">{request.id}</p>
            </div>
            <h1 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-widest mt-1 uppercase">
              {request.description}
            </h1>
            <p className="text-slate-700 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
              <Clock size={12} className="text-amber-600" />
              Aberto em {request.date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all cursor-pointer">
              <Camera size={18} className="text-slate-400" />
              {isUploading ? 'Enviando...' : 'Adicionar Foto'}
              <input type="file" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} accept="image/*" multiple />
            </label>
            <button 
              onClick={() => handleSaveChanges()}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Salvar Alterações
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
                activeTab === 'detalhes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              Detalhes
            </button>
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'timeline' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              Linha do Tempo
            </button>
            <button 
              onClick={() => setActiveTab('equipe')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'equipe' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              Equipe
            </button>
            <button 
              onClick={() => setActiveTab('documentos')}
              className={`flex flex-col items-center justify-center border-b-2 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max transition-all ${
                activeTab === 'documentos' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-700 hover:text-slate-900'
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
                  <p className="text-slate-800 font-medium leading-relaxed mb-4">
                    {request.description}. Solicitação realizada para a unidade {request.unit}.
                  </p>
                  
                  {request.authorizedBy && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">Dados da {request.status}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Agente Responsável</p>
                          <p className="text-xs font-bold text-slate-800">{request.authorizedBy} • {request.authorizedPosition}</p>
                        </div>
                        {request.authorizedJustification && (
                          <div>
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Justificativa</p>
                            <p className="text-xs font-medium text-slate-800 italic">&apos;{request.authorizedJustification}&apos;</p>
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
                            <div className="flex gap-2">
                              <button 
                                onClick={() => window.open(img, '_blank')}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white transition-all"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                onClick={() => removePhoto(idx)}
                                className="p-2 bg-rose-500/80 hover:bg-rose-600 rounded-lg text-white transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Tombamento</p>
                            <p className="text-xs font-bold text-slate-800">{request.tombamento}</p>
                          </div>
                        )}
                        {request.modeloEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Modelo</p>
                            <p className="text-xs font-bold text-slate-800">{request.modeloEquipamento}</p>
                          </div>
                        )}
                        {request.tipoEquipamento && (
                          <div>
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Tipo</p>
                            <p className="text-xs font-bold text-slate-800">{request.tipoEquipamento}</p>
                          </div>
                        )}
                        {request.btus && (
                          <div>
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">BTUs</p>
                            <p className="text-xs font-bold text-slate-800">{request.btus}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {request.observacao && (
                    <div className="mt-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Observações Adicionais</h4>
                      <p className="text-xs font-medium text-slate-800 italic">&apos;{request.observacao}&apos;</p>
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
                  </div>
                  
                  <div className="space-y-6">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Progresso da Manutenção</h4>
                          <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">
                            {(request.checklist || []).filter(i => i.completed).length} de {(request.checklist || []).length} tarefas concluídas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-600 font-mono">
                          {Math.round(((request.checklist || []).length > 0 
                            ? ((request.checklist || []).filter(i => i.completed).length / (request.checklist || []).length) * 100 
                            : 0))}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(request.checklist || []).length > 0 
                          ? ((request.checklist || []).filter(i => i.completed).length / (request.checklist || []).length) * 100 
                          : 0}%` }}
                        className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      />
                    </div>

                    {/* Add Item Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newItemTask}
                        onChange={(e) => setNewItemTask(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                        placeholder="Adicionar nova tarefa ao checklist..."
                        className="flex-grow bg-slate-50 border-slate-200 rounded-xl text-sm font-bold uppercase tracking-tight focus:ring-amber-500 focus:border-amber-500"
                      />
                      <button
                        onClick={handleAddChecklistItem}
                        className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    {/* Sortable List */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={(request.checklist || []).map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          <AnimatePresence>
                            {(request.checklist || []).map((item) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                              >
                                <SortableItem
                                  item={item}
                                  onToggle={handleToggleChecklistItem}
                                  onRemove={handleRemoveChecklistItem}
                                  onTaskChange={handleTaskChange}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          {(request.checklist || []).length === 0 && (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                              <p className="text-slate-700 text-xs font-black uppercase tracking-widest">Nenhuma tarefa no checklist</p>
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
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
                    <MessageSquare className="absolute right-4 top-3.5 text-slate-700" size={18} />
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
                            <p className="text-[10px] text-slate-700 font-black font-mono uppercase">
                              {new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${item.type === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                              {item.type === 'manual' ? 'Comentário' : 'Sistema'}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.action}</p>
                          <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest mt-2 flex items-center gap-1">
                            <User size={10} />
                            Responsável: {item.user}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-700 italic text-xs">
                      Nenhum evento registrado na linha do tempo.
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'equipe' && (
              <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest mb-6">
                    <User className="text-amber-600" size={18} />
                    Equipe Técnica Alocada
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Nome do Profissional</label>
                      <input 
                        type="text"
                        value={newProfName}
                        onChange={(e) => setNewProfName(e.target.value)}
                        placeholder="Ex: João Silva"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest ml-1">Atribuição / Função</label>
                      <input 
                        type="text"
                        value={newProfRole}
                        onChange={(e) => setNewProfRole(e.target.value)}
                        placeholder="Ex: Eletricista"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={handleAddProfessional}
                        disabled={!newProfName.trim() || !newProfRole.trim()}
                        className="w-full h-[38px] flex items-center justify-center gap-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <Plus size={16} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {request.professionals && request.professionals.length > 0 ? (
                    <AnimatePresence mode="popLayout">
                      {request.professionals.map((prof, idx) => (
                        <motion.div 
                          key={`${prof.name}-${idx}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 group hover:border-amber-200 transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-xs uppercase border-2 border-white shadow-sm shrink-0">
                            {getInitials(prof.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{prof.name}</p>
                            <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest truncate">
                              {prof.role}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleRemoveProfessional(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Remover Profissional"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-700 italic text-xs border-2 border-dashed border-slate-100 rounded-xl">
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
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                          <Paperclip size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{doc.name}</p>
                          <p className="text-[9px] text-slate-700 font-black uppercase tracking-widest">
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
                      <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-700 text-xs font-medium italic">Nenhum documento anexo a esta solicitação.</p>
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
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Unidade Demandante</p>
                  <div className="flex items-start gap-2">
                    <Building2 className="text-slate-700" size={14} />
                    <p className="text-slate-700 text-xs font-bold">{request.unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Servidor Responsável</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-[10px] uppercase">
                        {request.responsibleServer ? request.responsibleServer.substring(0, 2).toUpperCase() : 'SR'}
                      </div>
                      <p className="text-slate-700 text-xs font-bold">{request.responsibleServer || 'Não informado'}</p>
                    </div>
                    {request.matriculaSiape && (
                      <p className="text-[10px] text-slate-700 font-medium ml-9">SIAPE: {request.matriculaSiape}</p>
                    )}
                    {request.emailSolicitante && (
                      <p className="text-[10px] text-slate-700 font-medium ml-9 truncate">{request.emailSolicitante}</p>
                    )}
                  </div>
                </div>
                {request.servidorRepassou && (
                  <div>
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Servidor que Repassou</p>
                    <div className="flex items-center gap-2">
                      <User className="text-slate-400" size={14} />
                      <p className="text-slate-700 text-xs font-bold">{request.servidorRepassou}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Data da Demanda</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-700" size={14} />
                    <p className="text-slate-700 text-xs font-mono">{request.date}</p>
                  </div>
                </div>
                {(request.dataFinalizacao || request.horaFinalizacao) && (
                  <div>
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Finalização Prevista/Realizada</p>
                    <div className="flex items-center gap-2">
                      <Clock className="text-slate-700" size={14} />
                      <p className="text-slate-700 text-xs font-bold">
                        {request.dataFinalizacao} {request.horaFinalizacao}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Tipo de Serviço</p>
                  <div className="flex items-center gap-2">
                    <Wrench className="text-slate-700" size={14} />
                    <p className="text-slate-900 text-xs font-black uppercase tracking-tight">{request.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Tempo Estimado</p>
                  <div className="flex items-center gap-2">
                    <Timer className="text-slate-700" size={14} />
                    <p className="text-amber-600 text-xs font-black font-mono">04:00:00</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest mb-2">Equipe Técnica</p>
                  <div className="flex flex-col gap-2">
                    {request.professionals && request.professionals.length > 0 ? (
                      request.professionals.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-amber-600 font-black text-[10px] uppercase">
                            {p.name.substring(0, 2).toUpperCase()}
                          </div>
                          <p className="text-slate-700 text-xs font-bold truncate">{p.name}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest italic">Não atribuído</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Log de Atividades</h3>
              <div className="relative space-y-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-100">
                {request.timeline && request.timeline.length > 0 ? (
                  request.timeline.slice(0, 5).map((item, index) => (
                    <div key={index} className="relative pl-8">
                      <div className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white ${index === 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-200'}`}></div>
                      <p className="text-[9px] text-slate-700 font-black font-mono mb-0.5 uppercase">
                        {new Date(item.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{item.action}</p>
                      <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest mt-1">Por: {item.user}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest italic">Nenhum log disponível</p>
                )}
              </div>
            </div>

            {/* Final Action */}
            <button 
              onClick={() => setIsConcluirModalOpen(true)}
              disabled={request.status === 'Concluído'}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
            >
              <CheckCircle2 size={20} />
              {request.status === 'Concluído' ? 'Serviço Concluído' : 'Concluir Serviço'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Concluir Modal */}
      <AnimatePresence>
        {isConcluirModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConcluirModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-emerald-700">Concluir Serviço</h3>
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Finalização da Ordem de Serviço</p>
                </div>
                <button onClick={() => setIsConcluirModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Data de Finalização</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none"
                      value={format(new Date(), 'dd/MM/yyyy')}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Hora</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 outline-none"
                      value={format(new Date(), 'HH:mm')}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Observações Finais</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all min-h-[100px]"
                    placeholder="Descreva o que foi realizado ou observações finais..."
                    value={conclusaoObs}
                    onChange={(e) => setConclusaoObs(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsConcluirModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConcluirServico}
                    className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Confirmar Conclusão
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Autenticação do Servidor Responsável</p>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Nome do Agente</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all"
                      placeholder="Seu nome completo"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Cargo / Função</label>
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
                  <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Nível de Urgência</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Baixa', 'Média', 'Alta', 'Emergencial'].map((u) => (
                      <button
                        key={u}
                        onClick={() => setAuthUrgency(u as any)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                          authUrgency === u 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-200'
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all min-h-[100px]"
                    placeholder="Descreva o motivo da decisão ou observações técnicas..."
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
