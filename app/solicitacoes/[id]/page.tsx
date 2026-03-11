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
} from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

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

  const handleAuthorize = async () => {
    if (!request) return;
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Autorizado', statusColor: 'emerald' }),
      });
      if (res.ok) {
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
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                request.status === 'Em Andamento' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                request.status === 'Novo' ? 'bg-blue-500/20 text-blue-500 border-blue-500/30' :
                request.status === 'Autorizado' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                'bg-slate-500/20 text-slate-500 border-slate-500/30'
              }`}>
                {request.status}
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{request.id}</p>
            </div>
            <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-tight mt-1">
              {request.description}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1 text-sm">
              <Clock size={14} />
              Aberto em {request.date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <Camera size={18} />
              Adicionar Foto
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              <RefreshCw size={18} />
              Atualizar Status
            </button>
            {userRole === 'gestao' && request.status === 'Novo' && (
              <button 
                onClick={handleAuthorize}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 size={18} />
                Autorizar Serviço
              </button>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            <button className="flex flex-col items-center justify-center border-b-2 border-blue-600 text-blue-600 pb-3 font-bold text-sm min-w-max">Detalhes</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 pb-3 font-bold text-sm min-w-max">Linha do Tempo</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 pb-3 font-bold text-sm min-w-max">Equipe</button>
            <button className="flex flex-col items-center justify-center border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 pb-3 font-bold text-sm min-w-max">Documentos</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Service Description */}
            <section className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText className="text-blue-600" size={20} />
                Descrição do Serviço
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {request.description}. Solicitação realizada para a unidade {request.unit}.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden relative group cursor-pointer">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWwOzsUrIyXCJM_g6j-JBzlAJ_MMLU2oaMKZA_rqFcSVFcDQKpc2wjP1gNWC6E3J-uJ7Yy5J5nBC3LdAPHLE5Uq2QPbVGCUmHw6RQcw3rQTxm6wiKQ_4T6LkcDwuhFL6ltFPh-Gn2ZRaO0EyII0HcAgVziXdn5hNtSkyEHG6hQnc087-QYg7uhcmcJ9rOjOgnd8Qg0xJEUsSg0LEp6wnET2rUTaob-7wafyy8LshunR4o-jIFbbYK5x0MqtlcBRkGxLGb5zBjFAws"
                    alt="AC Unit"
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold">Ver Foto</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Checklist Section */}
            <section className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <CheckSquare className="text-blue-600" size={20} />
                  Checklist de Manutenção
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">2 / 5 Tarefas</span>
              </div>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={item.completed} 
                        readOnly
                        className="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-blue-600 focus:ring-blue-600"
                      />
                    </div>
                    <span className={`text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100 font-medium'}`}>
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
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Informações da Demanda</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Unidade Demandante</p>
                  <div className="flex items-start gap-2">
                    <Building2 className="text-slate-400" size={16} />
                    <p className="text-slate-900 dark:text-slate-100 text-sm">{request.unit}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Servidor Responsável</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {request.responsibleServer ? request.responsibleServer.substring(0, 2).toUpperCase() : 'SR'}
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 text-sm font-medium">{request.responsibleServer || 'Não informado'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Data da Demanda</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-slate-400" size={16} />
                    <p className="text-slate-900 dark:text-slate-100 text-sm">{request.date}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tipo de Serviço</p>
                  <div className="flex items-center gap-2">
                    <Wrench className="text-slate-400" size={16} />
                    <p className="text-slate-900 dark:text-slate-100 text-sm">{request.type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tempo Estimado</p>
                  <div className="flex items-center gap-2">
                    <Timer className="text-slate-400" size={16} />
                    <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">4 Horas</p>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Profissional Atribuído</p>
                  <div className="flex items-center gap-2">
                    {request.avatar ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden relative">
                        <Image src={request.avatar} alt={request.professional || ''} fill className="object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {request.professional ? request.professional.substring(0, 2).toUpperCase() : 'NA'}
                      </div>
                    )}
                    <p className="text-slate-900 dark:text-slate-100 text-sm font-medium">{request.professional || 'Não atribuído'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Linha do Tempo</h3>
              <div className="relative space-y-6 before:absolute before:left-2.5 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                {timeline.map((item, index) => (
                  <div key={index} className="relative pl-8">
                    <div className={`absolute left-0 top-1.5 h-5 w-5 rounded-full border-4 border-white dark:border-slate-900 ${item.active ? 'bg-blue-600' : 'bg-slate-400'}`}></div>
                    <p className="text-[10px] text-slate-500 font-bold mb-0.5">{item.time}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                    {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Final Action */}
            <button className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20">
              <CheckCircle2 size={20} />
              Concluir Serviço
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
