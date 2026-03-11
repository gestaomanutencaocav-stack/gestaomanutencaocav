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
  AlertTriangle
} from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  responsibleServer?: string;
  date: string;
  type: string;
  status: string;
  statusColor: string;
  professional: string | null;
  avatar: string | null;
  authorizedBy?: string;
  authorizedPosition?: string;
  authorizedJustification?: string;
  urgency?: 'Baixa' | 'Média' | 'Alta' | 'Emergencial';
}

const checklist = [
  { id: 1, task: 'Diagnóstico inicial do sistema e verificação de energia', completed: true },
  { id: 2, task: 'Inspecionar suportes do compressor quanto a vibração', completed: true },
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
      const [reqRes, userRes] = await Promise.all([
        fetch(`/api/solicitacoes/${id}`),
        fetch('/api/auth/me')
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
            <button className="flex flex-col items-center justify-center border-b-2 border-amber-500 text-amber-600 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max">Detalhes</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-400 hover:text-slate-900 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max">Linha do Tempo</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-400 hover:text-slate-900 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max">Equipe</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-400 hover:text-slate-900 pb-3 font-black text-[10px] uppercase tracking-widest min-w-max">Documentos</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-200">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWwOzsUrIyXCJM_g6j-JBzlAJ_MMLU2oaMKZA_rqFcSVFcDQKpc2wjP1gNWC6E3J-uJ7Yy5J5nBC3LdAPHLE5Uq2QPbVGCUmHw6RQcw3rQTxm6wiKQ_4T6LkcDwuhFL6ltFPh-Gn2ZRaO0EyII0HcAgVziXdn5hNtSkyEHG6hQnc087-QYg7uhcmcJ9rOjOgnd8Qg0xJEUsSg0LEp6wnET2rUTaob-7wafyy8LshunR4o-jIFbbYK5x0MqtlcBRkGxLGb5zBjFAws"
                    alt="AC Unit"
                    fill
                    className="object-cover transition-all group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Ver Foto</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Checklist Section */}
            <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                  <CheckSquare className="text-amber-600" size={18} />
                  Checklist de Manutenção
                </h3>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase tracking-widest">2 / 5 Tarefas</span>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        readOnly
                        className="h-4 w-4 rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-500/50"
                      />
                    </div>
                    <span className={`text-xs font-bold ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {item.task}
                    </span>
                  </label>
                ))}
              </div>
            </section>
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
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-[10px] uppercase">
                      {request.responsibleServer ? request.responsibleServer.substring(0, 2).toUpperCase() : 'SR'}
                    </div>
                    <p className="text-slate-700 text-xs font-bold">{request.responsibleServer || 'Não informado'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Data da Demanda</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-400" size={14} />
                    <p className="text-slate-600 text-xs font-mono">{request.date}</p>
                  </div>
                </div>
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
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Profissional Atribuído</p>
                  <div className="flex items-center gap-2">
                    {request.avatar ? (
                      <div className="w-7 h-7 rounded overflow-hidden relative border border-slate-200">
                        <Image src={request.avatar} alt={request.professional || ''} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded bg-slate-50 border border-slate-200 flex items-center justify-center text-amber-600 font-black text-[10px] uppercase">
                        {request.professional ? request.professional.substring(0, 2).toUpperCase() : 'NA'}
                      </div>
                    )}
                    <p className="text-slate-700 text-xs font-bold">{request.professional || 'Não atribuído'}</p>
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
