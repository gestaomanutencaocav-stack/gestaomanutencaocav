'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar as CalendarIcon, 
  List, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Download,
  FileText,
  Camera,
  User,
  MoreVertical,
  Search,
  X,
  Zap,
  Droplets,
  Hammer,
  Wind,
  Flame,
  ArrowUpCircle,
  Umbrella,
  Settings
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isBefore,
  startOfDay,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Inspection, InspectionRecord, Professional } from '@/lib/store';

const AREAS = ['Elétrica', 'Hidráulica', 'Civil', 'Ar Condicionado', 'Incêndio', 'Elevadores', 'Cobertura', 'Outros'];
const PERIODICITIES = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' }
];

export default function InspecoesPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista' | 'calendario'>('dashboard');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  
  // Professional Field State
  const [newProfessional, setNewProfessional] = useState('');
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [executionProfessionals, setExecutionProfessionals] = useState<string[]>([]);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [insRes, recRes, profRes] = await Promise.all([
        fetch('/api/inspecoes'),
        fetch('/api/inspecoes/records'),
        fetch('/api/professionals')
      ]);
      
      if (insRes.ok) setInspections(await insRes.json());
      if (recRes.ok) setRecords(await recRes.json());
      if (profRes.ok) setProfessionals(await profRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats Calculations
  const stats = useMemo(() => {
    const active = inspections.filter(i => i.status === 'ativa').length;
    const now = new Date();
    const monthRecords = records.filter(r => {
      const d = parseISO(r.executionDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    const today = format(now, 'yyyy-MM-dd');
    const pendingToday = inspections.filter(i => i.status === 'ativa' && i.nextDate === today).length;
    
    const delayed = inspections.filter(i => {
      if (i.status !== 'ativa' || !i.nextDate) return false;
      return isBefore(parseISO(i.nextDate), startOfDay(now));
    }).length;

    return { active, monthRecords, pendingToday, delayed };
  }, [inspections, records]);

  const areaStats = useMemo(() => {
    return {
      eletrica: inspections.filter(i => i.area === 'Elétrica').length,
      hidraulica: inspections.filter(i => i.area === 'Hidráulica').length,
      civil: inspections.filter(i => i.area === 'Civil').length,
      climatizacao: inspections.filter(i => i.area === 'Ar Condicionado').length,
    };
  }, [inspections]);

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayInspections = inspections.filter(i => i.nextDate === dateStr && i.status === 'ativa');
    const dayRecords = records.filter(r => r.executionDate === dateStr);
    
    return { dayInspections, dayRecords };
  };

  const handleCreateInspection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      area: formData.get('area') as string,
      periodicity: formData.get('periodicity') as any,
      description: formData.get('description') as string,
      professionals: selectedProfessionals,
      status: formData.get('status') as any,
      nextDate: formData.get('nextDate') as string,
    };

    try {
      const url = selectedInspection ? `/api/inspecoes?id=${selectedInspection.id}` : '/api/inspecoes';
      const method = selectedInspection ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowInspectionModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
    }
  };

  const handleRecordExecution = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInspection) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      inspectionId: selectedInspection.id,
      executionDate: formData.get('executionDate') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      problemsFound: formData.get('problemsFound') as string,
      problemsResolved: formData.get('problemsResolved') as string,
      problemsPending: formData.get('problemsPending') as string,
      professionals: executionProfessionals,
      executionStatus: formData.get('executionStatus') as any,
      observations: formData.get('observations') as string,
      images: [] // Mock for now
    };

    try {
      const res = await fetch('/api/inspecoes/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowExecutionModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error recording execution:', error);
    }
  };

  return (
    <DashboardLayout title="Rotinas de Inspeções">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Rotinas de Inspeções</h1>
            <p className="text-slate-500 font-medium mt-1">Gestão de vistorias preventivas e checklists de infraestrutura</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === 'dashboard' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Zap size={14} />
                Painel
              </button>
              <button 
                onClick={() => setActiveTab('lista')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === 'lista' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List size={14} />
                Listagem
              </button>
              <button 
                onClick={() => setActiveTab('calendario')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === 'calendario' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CalendarIcon size={14} />
                Calendário
              </button>
            </div>
            
            <button 
              onClick={() => { 
                setSelectedInspection(null); 
                setSelectedProfessionals([]);
                setNewProfessional('');
                setShowInspectionModal(true); 
              }}
              className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95"
            >
              <Plus size={18} />
              Nova Inspeção
            </button>
          </div>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <ClipboardCheck size={20} />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">Ativas</span>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total de Inspeções</p>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter mt-1">{stats.active}</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={20} />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-tighter">Este Mês</span>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Realizadas</p>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter mt-1">{stats.monthRecords}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-10 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Clock size={20} />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-tighter">Hoje</span>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Pendentes</p>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter mt-1">{stats.pendingToday}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group border-l-4 border-l-rose-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="size-10 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <AlertTriangle size={20} />
                  </div>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">Atenção</span>
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Atrasadas</p>
                <p className="text-3xl font-black text-rose-600 font-mono tracking-tighter mt-1">{stats.delayed}</p>
              </div>
            </div>

            {/* Area Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-amber-50 p-6 rounded-xl border border-amber-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="text-amber-500" size={24} />
                  <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Elétrica</h3>
                </div>
                <p className="text-2xl font-black text-amber-900 font-mono">{areaStats.eletrica}</p>
                <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Rotinas Ativas</p>
              </div>

              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Droplets className="text-blue-500" size={24} />
                  <h3 className="text-xs font-black text-blue-700 uppercase tracking-widest">Hidráulica</h3>
                </div>
                <p className="text-2xl font-black text-blue-900 font-mono">{areaStats.hidraulica}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Rotinas Ativas</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Hammer className="text-slate-500" size={24} />
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Civil</h3>
                </div>
                <p className="text-2xl font-black text-slate-900 font-mono">{areaStats.civil}</p>
                <p className="text-[10px] font-bold text-slate-600 uppercase mt-1">Rotinas Ativas</p>
              </div>

              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Wind className="text-emerald-500" size={24} />
                  <h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest">Climatização</h3>
                </div>
                <p className="text-2xl font-black text-emerald-900 font-mono">{areaStats.climatizacao}</p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Rotinas Ativas</p>
              </div>
            </div>

            {/* Recent Activity / Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <History className="text-amber-500" size={18} />
                  Últimas Execuções
                </h3>
                <div className="space-y-4">
                  {records.slice(0, 5).map((record) => {
                    const inspection = inspections.find(i => i.id === record.inspectionId);
                    return (
                      <div key={record.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-50 bg-slate-50/50">
                        <div className={`size-10 rounded-lg flex items-center justify-center text-white shadow-sm ${
                          record.executionStatus === 'Realizada' ? 'bg-emerald-500' : 
                          record.executionStatus === 'Parcial' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}>
                          <ClipboardCheck size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{inspection?.name || 'Inspeção Deletada'}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">
                            Realizada por <span className="font-bold text-slate-700">{record.professionals.join(', ')}</span> em {format(parseISO(record.executionDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                            record.executionStatus === 'Realizada' ? 'bg-emerald-100 text-emerald-700' : 
                            record.executionStatus === 'Parcial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {record.executionStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-rose-50 p-6 rounded-xl border border-rose-100 shadow-sm">
                <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={18} />
                  Alertas de Atraso
                </h3>
                <div className="space-y-4">
                  {inspections.filter(i => {
                    if (i.status !== 'ativa' || !i.nextDate) return false;
                    return isBefore(parseISO(i.nextDate), startOfDay(new Date()));
                  }).slice(0, 4).map((i) => (
                    <div key={i.id} className="p-3 bg-white rounded-lg border border-rose-200 shadow-sm">
                      <p className="text-[10px] font-black text-rose-900 uppercase tracking-tight">{i.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-bold text-rose-500 uppercase">Vencido em {format(parseISO(i.nextDate), 'dd/MM')}</span>
                        <button 
                          onClick={() => { setSelectedInspection(i); setShowExecutionModal(true); }}
                          className="text-[8px] font-black bg-rose-500 text-white px-2 py-1 rounded uppercase tracking-widest hover:bg-rose-600 transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {activeTab === 'lista' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar inspeções..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all">
                  <Filter size={18} />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all">
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nome da Inspeção</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Área</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Periodicidade</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Próxima Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspections.map((i) => {
                    const isDelayed = i.status === 'ativa' && i.nextDate && isBefore(parseISO(i.nextDate), startOfDay(new Date()));
                    return (
                      <tr key={i.id} className={`hover:bg-slate-50/50 transition-colors group ${isDelayed ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`size-8 rounded-lg flex items-center justify-center text-white shadow-sm ${
                              i.area === 'Elétrica' ? 'bg-amber-500' : 
                              i.area === 'Hidráulica' ? 'bg-blue-500' : 
                              i.area === 'Civil' ? 'bg-slate-500' : 'bg-emerald-500'
                            }`}>
                              {i.area === 'Elétrica' ? <Zap size={14} /> : 
                               i.area === 'Hidráulica' ? <Droplets size={14} /> : 
                               i.area === 'Civil' ? <Hammer size={14} /> : <Wind size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{i.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">{i.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{i.area}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{i.periodicity}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarIcon size={12} className={isDelayed ? 'text-rose-500' : 'text-slate-400'} />
                            <span className={`text-[10px] font-black font-mono tracking-tighter ${isDelayed ? 'text-rose-600' : 'text-slate-600'}`}>
                              {i.nextDate ? format(parseISO(i.nextDate), 'dd/MM/yyyy') : '--/--/----'}
                            </span>
                            {isDelayed && <span className="size-2 rounded-full bg-rose-500 animate-pulse" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                            i.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {i.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { 
                                setSelectedInspection(i); 
                                setExecutionProfessionals([]);
                                setNewProfessional('');
                                setShowExecutionModal(true); 
                              }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                              title="Registrar Execução"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                            <button 
                              onClick={() => { setSelectedInspection(i); setShowHistoryModal(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                              title="Ver Histórico"
                            >
                              <History size={18} />
                            </button>
                            <button 
                              onClick={() => { 
                                setSelectedInspection(i); 
                                setSelectedProfessionals(i.professionals || []);
                                setNewProfessional('');
                                setShowInspectionModal(true); 
                              }}
                              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                              <Settings size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeTab === 'calendario' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1 text-[10px] font-black text-amber-600 hover:bg-amber-50 rounded-lg transition-colors uppercase tracking-widest"
                  >
                    Hoje
                  </button>
                  <button 
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-100">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, monthStart);
                  const { dayInspections, dayRecords } = getEventsForDay(day);
                  
                  return (
                    <div 
                      key={i} 
                      className={`min-h-[120px] p-2 border-r border-b border-slate-100 last:border-r-0 ${
                        !isCurrentMonth ? 'bg-slate-50 opacity-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-black font-mono ${
                          isToday ? 'bg-amber-500 text-white size-5 flex items-center justify-center rounded shadow-lg shadow-amber-500/20' : 
                          isCurrentMonth ? 'text-slate-600' : 'text-slate-300'
                        }`}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayRecords.map((rec) => {
                          const insp = inspections.find(ins => ins.id === rec.inspectionId);
                          return (
                            <div 
                              key={rec.id}
                              className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded border bg-emerald-50 text-emerald-600 border-emerald-100 truncate"
                            >
                              ✓ {insp?.name || 'Inspeção'}
                            </div>
                          );
                        })}
                        {dayInspections.map((insp) => {
                          const isAlreadyDone = dayRecords.some(r => r.inspectionId === insp.id);
                          if (isAlreadyDone) return null;
                          const isDelayed = isBefore(day, startOfDay(new Date()));
                          return (
                            <div 
                              key={insp.id}
                              className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded border truncate ${
                                isDelayed ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}
                            >
                              ! {insp.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <ClipboardCheck className="text-amber-500" size={18} />
                  Legenda do Calendário
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Realizada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded bg-amber-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pendente</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded bg-rose-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Atrasada</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500 p-6 rounded-xl text-white shadow-lg shadow-amber-500/20">
                <h3 className="font-black text-xs uppercase tracking-widest mb-2">Dica Pro</h3>
                <p className="text-xs font-bold leading-relaxed opacity-90">
                  Clique em uma inspeção atrasada no calendário para registrar sua execução imediatamente.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inspection Modal (Create/Edit) */}
      <AnimatePresence>
        {showInspectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInspectionModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  {selectedInspection ? 'Editar Inspeção' : 'Nova Rotina de Inspeção'}
                </h3>
                <button onClick={() => setShowInspectionModal(false)} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateInspection} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Inspeção</label>
                    <input 
                      name="name"
                      required
                      defaultValue={selectedInspection?.name}
                      placeholder="Ex: Inspeção Elétrica Bloco A"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Área de Infraestrutura</label>
                    <select 
                      name="area"
                      required
                      defaultValue={selectedInspection?.area}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                    >
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periodicidade</label>
                    <select 
                      name="periodicity"
                      required
                      defaultValue={selectedInspection?.periodicity}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none"
                    >
                      {PERIODICITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próxima Data Prevista</label>
                    <input 
                      name="nextDate"
                      type="date"
                      required
                      defaultValue={selectedInspection?.nextDate}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhamento do Serviço</label>
                  <textarea 
                    name="description"
                    rows={4}
                    defaultValue={selectedInspection?.description}
                    placeholder="Descreva os itens a serem verificados..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissionais Designados</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newProfessional}
                      onChange={(e) => setNewProfessional(e.target.value)}
                      placeholder="Nome do profissional"
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newProfessional.trim()) {
                            setSelectedProfessionals([...selectedProfessionals, newProfessional.trim()]);
                            setNewProfessional('');
                          }
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (newProfessional.trim()) {
                          setSelectedProfessionals([...selectedProfessionals, newProfessional.trim()]);
                          setNewProfessional('');
                        }
                      }}
                      className="p-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {selectedProfessionals.length === 0 && (
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest p-1">Nenhum profissional adicionado</span>
                    )}
                    {selectedProfessionals.map((p, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">
                        {p}
                        <button 
                          type="button"
                          onClick={() => setSelectedProfessionals(selectedProfessionals.filter((_, i) => i !== idx))}
                          className="hover:text-rose-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Inicial</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="ativa" defaultChecked={!selectedInspection || selectedInspection.status === 'ativa'} className="text-amber-600 focus:ring-amber-500" />
                      <span className="text-xs font-bold text-slate-700">Ativa</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="inativa" defaultChecked={selectedInspection?.status === 'inativa'} className="text-amber-600 focus:ring-amber-500" />
                      <span className="text-xs font-bold text-slate-700">Inativa</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowInspectionModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                  >
                    {selectedInspection ? 'Salvar Alterações' : 'Criar Inspeção'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Execution Modal (Record Execution) */}
      <AnimatePresence>
        {showExecutionModal && selectedInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExecutionModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-500 text-white">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Registrar Execução</h3>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{selectedInspection.name}</p>
                </div>
                <button onClick={() => setShowExecutionModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleRecordExecution} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Realização</label>
                    <input 
                      name="executionDate"
                      type="date"
                      required
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora de Início</label>
                    <input 
                      name="startTime"
                      type="time"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora de Término</label>
                    <input 
                      name="endTime"
                      type="time"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissionais Responsáveis</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newProfessional}
                        onChange={(e) => setNewProfessional(e.target.value)}
                        placeholder="Nome do profissional"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newProfessional.trim()) {
                              setExecutionProfessionals([...executionProfessionals, newProfessional.trim()]);
                              setNewProfessional('');
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          if (newProfessional.trim()) {
                            setExecutionProfessionals([...executionProfessionals, newProfessional.trim()]);
                            setNewProfessional('');
                          }
                        }}
                        className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      {executionProfessionals.length === 0 && (
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest p-1">Nenhum profissional adicionado</span>
                      )}
                      {executionProfessionals.map((p, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                          {p}
                          <button 
                            type="button"
                            onClick={() => setExecutionProfessionals(executionProfessionals.filter((_, i) => i !== idx))}
                            className="hover:text-rose-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Execução</label>
                    <select 
                      name="executionStatus"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                    >
                      <option value="Realizada">Realizada</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Não Realizada">Não Realizada</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" />
                      Problemas Encontrados
                    </label>
                    <textarea 
                      name="problemsFound"
                      rows={2}
                      placeholder="Descreva eventuais falhas detectadas..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Problemas Resolvidos no Ato
                    </label>
                    <textarea 
                      name="problemsResolved"
                      rows={2}
                      placeholder="O que foi corrigido durante a inspeção?"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} className="text-rose-500" />
                      Problemas Pendentes (Gerar OS)
                    </label>
                    <textarea 
                      name="problemsPending"
                      rows={2}
                      placeholder="Itens que necessitam de intervenção posterior..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Camera size={14} />
                    Evidências Fotográficas
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Clique para anexar fotos</p>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">PNG, JPG ou GIF (MAX. 5MB)</p>
                      </div>
                      <input type="file" className="hidden" multiple accept="image/*" />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações Gerais</label>
                  <textarea 
                    name="observations"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowExecutionModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                  >
                    Finalizar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal (Timeline) */}
      <AnimatePresence>
        {showHistoryModal && selectedInspection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Histórico de Execuções</h3>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{selectedInspection.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
                    <Download size={18} />
                  </button>
                  <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {records.filter(r => r.inspectionId === selectedInspection.id).length === 0 ? (
                    <div className="py-12 text-center">
                      <History className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 text-xs font-medium italic">Nenhuma execução registrada para esta rotina.</p>
                    </div>
                  ) : (
                    records.filter(r => r.inspectionId === selectedInspection.id).map((record, idx) => (
                      <div key={record.id} className="relative flex items-start gap-6 group">
                        <div className={`size-10 rounded-full flex items-center justify-center text-white shadow-lg relative z-10 ${
                          record.executionStatus === 'Realizada' ? 'bg-emerald-500 shadow-emerald-500/20' : 
                          record.executionStatus === 'Parcial' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'
                        }`}>
                          <ClipboardCheck size={20} />
                        </div>
                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:border-slate-200 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                              {format(parseISO(record.executionDate), 'dd/MM/yyyy')} • {record.startTime} - {record.endTime}
                            </span>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                              record.executionStatus === 'Realizada' ? 'bg-emerald-100 text-emerald-700' : 
                              record.executionStatus === 'Parcial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {record.executionStatus}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 mb-3">Realizada por {record.professionals.join(', ')}</p>
                          
                          {(record.problemsFound || record.problemsResolved || record.problemsPending) && (
                            <div className="space-y-2 pt-3 border-t border-slate-200">
                              {record.problemsFound && (
                                <div className="flex gap-2">
                                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-[10px] text-slate-600 leading-relaxed"><span className="font-black uppercase tracking-tighter text-slate-900">Problemas:</span> {record.problemsFound}</p>
                                </div>
                              )}
                              {record.problemsResolved && (
                                <div className="flex gap-2">
                                  <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-[10px] text-slate-600 leading-relaxed"><span className="font-black uppercase tracking-tighter text-slate-900">Resolvido:</span> {record.problemsResolved}</p>
                                </div>
                              )}
                              {record.problemsPending && (
                                <div className="flex gap-2">
                                  <Clock size={12} className="text-rose-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-[10px] text-slate-600 leading-relaxed"><span className="font-black uppercase tracking-tighter text-slate-900">Pendente:</span> {record.problemsPending}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {record.observations && (
                            <p className="mt-3 text-[10px] italic text-slate-500 bg-white p-2 rounded border border-slate-100">
                              &quot;{record.observations}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
