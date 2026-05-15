'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  DollarSign,
  Briefcase,
  Building2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays, startOfDay, endOfDay, differenceInMinutes, isValid, differenceInDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';

interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  responsibleServer?: string;
  date: string;
  createdAt: string;
  type: string;
  status: string;
  professional: string | null;
  professionals?: Array<{ name: string; role: string }> | null;
}

interface Inspection {
  id: string;
  name: string;
  area: string;
  periodicity: string;
  description: string;
  professionals: string[];
  nextDate: string;
  status: string;
}

interface InspectionRecord {
  id: string;
  inspectionId: string;
  executionDate: string;
  startTime: string;
  endTime: string;
  problemsFound: number;
  problemsResolved: number;
  problemsPending: number;
  professionals: string[];
  executionStatus: string;
  images: string[];
  observations: string;
  createdAt: string;
}

interface ContractInfo {
  id: string;
  contract_number: string;
  company_name: string;
  cnpj: string;
  start_date: string;
  end_date: string;
  renewals_count: number;
  contracting_party: string;
  status: string;
}

interface FinancialRecord {
  id: string;
  year: number;
  month: number;
  invoice_number: string;
  process_number?: string;
  payment_value: number;
  materials_value: number;
  materials_citl_value: number;
  total_invoice: number;
  discounts: number;
  total_after_discounts: number;
  fiscal_note: string;
  created_at?: string;
  contract_id?: string;
}

interface Repactuacao {
  id: string;
  process_number: string;
  year: number;
  date: string;
  triggering_factor: string;
  status: 'Em Análise' | 'Aprovado' | 'Negado' | 'Aguardando Documentação' | 'Concluído';
}

const COLORS = ['#f59e0b', '#10b981', '#64748b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];
const SLATE_COLOR = '#64748b';
const AMBER_COLOR = '#f59e0b';
const EMERALD_COLOR = '#10b981';
const RED_COLOR = '#ef4444';

function KPIProdutividadeProfissional({ requests }: { requests: MaintenanceRequest[] }) {
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    const profStats: Record<string, { 
      name: string; 
      total: number; 
      completed: number; 
      inProgress: number; 
      pending: number; 
    }> = {};

    requests.forEach(req => {
      const names = new Set<string>();
      
      // Extract from professionals array
      if (req.professionals && Array.isArray(req.professionals)) {
        req.professionals.forEach(p => {
          if (p.name && p.name.trim()) names.add(p.name.trim());
        });
      }
      
      // Fallback to professional string
      if (req.professional) {
        req.professional.split(',').forEach(p => {
          const name = p.split('—')[0].trim();
          if (name) names.add(name);
        });
      }

      names.forEach(name => {
        if (!profStats[name]) {
          profStats[name] = { name, total: 0, completed: 0, inProgress: 0, pending: 0 };
        }
        
        profStats[name].total += 1;
        if (req.status === 'Concluído' || req.status === 'Autorizado') {
          profStats[name].completed += 1;
        } else if (req.status === 'Em Andamento' || req.status === 'Novo') {
          profStats[name].inProgress += 1;
        } else {
          profStats[name].pending += 1;
        }
      });
    });

    const list = Object.values(profStats).map(s => ({
      ...s,
      completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    const maxDemand = list.length > 0 ? list[0] : null;
    const minDemand = list.length > 0 ? list[list.length - 1] : null;

    return { list, maxDemand, minDemand };
  }, [requests]);

  if (stats.list.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <Activity className="text-amber-500" size={20} /> Produtividade por Profissional
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ranking de desempenho e carga de trabalho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.maxDemand && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4"
          >
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Maior Demanda</p>
              <p className="text-lg font-black text-slate-900">{stats.maxDemand.name}</p>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-tighter">{stats.maxDemand.total} Serviços atribuídos</p>
            </div>
          </motion.div>
        )}
        {stats.minDemand && stats.minDemand !== stats.maxDemand && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-4"
          >
            <div className="p-3 bg-rose-100 text-rose-600 rounded-lg">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Menor Demanda</p>
              <p className="text-lg font-black text-slate-900">{stats.minDemand.name}</p>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-tighter">{stats.minDemand.total} Serviços atribuídos</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        {(showAll ? stats.list : stats.list.slice(0, 5)).map((prof, idx) => (
          <motion.div 
            key={prof.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{prof.name}</span>
                <div className="flex gap-3 mt-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{prof.total} Total</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{prof.completed} Concluídos</span>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{prof.inProgress} Em Andamento</span>
                </div>
              </div>
              <span className="text-xs font-black text-amber-600">{prof.completionRate}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${prof.completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-amber-500"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {stats.list.length > 5 && (
        <div className="pt-4 flex justify-center">
          <button 
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer"
          >
            {showAll ? 'Ver menos' : 'Ver todos os profissionais'} 
            <ChevronDown size={16} className={`transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
}

function GraficoDinamicoSolicitacoes({ requests }: { requests: MaintenanceRequest[] }) {
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(0);
  const [filterType, setFilterType] = useState('Todas');
  const [filterProfissional, setFilterProfissional] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'categoria' | 'evolucao'>('categoria');

  const years = useMemo(() => {
    const yrs = new Set<number>();
    requests.forEach(req => {
      const date = new Date(req.createdAt || req.date);
      if (!isNaN(date.getFullYear())) yrs.add(date.getFullYear());
    });
    return Array.from(yrs).sort((a, b) => b - a);
  }, [requests]);

  const types = useMemo(() => {
    const tps = new Set<string>();
    requests.forEach(req => {
      if (req.type) tps.add(req.type);
    });
    return Array.from(tps).sort();
  }, [requests]);

  const profissionais = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(req => {
      // Fonte 1: campo professionals (jsonb array)
      if (Array.isArray(req.professionals)) {
        req.professionals.forEach(p => {
          if (p?.name && p.name !== 'NULL' && p.name !== 'EMPTY') {
            set.add(p.name.trim());
          }
        });
      }
      // Fonte 2: fallback campo professional (text)
      if (req.professional && req.professional !== 'NULL' && req.professional !== 'EMPTY') {
        req.professional.split(',').forEach(p => {
          const name = p.split('—')[0].trim();
          if (name) set.add(name);
        });
      }
    });
    return ['Todos', ...Array.from(set).sort()];
  }, [requests]);

  const filteredData = useMemo(() => {
    return requests.filter(req => {
      const date = new Date(req.createdAt || req.date);
      const monthMatch = filterMonth === 0 || (date.getMonth() + 1 === filterMonth);
      const yearMatch = filterYear === 0 || (date.getFullYear() === filterYear);
      const typeMatch = filterType === 'Todas' || req.type === filterType;
      const profMatch = filterProfissional === 'Todos' || (() => {
        // Verificar campo professionals (jsonb)
        if (Array.isArray(req.professionals)) {
          return req.professionals.some(p => p?.name?.trim() === filterProfissional);
        }
        // Fallback campo professional (text)
        if (req.professional) {
          return req.professional.split(',').some(p => 
            p.split('—')[0].trim() === filterProfissional
          );
        }
        return false;
      })();
      return monthMatch && yearMatch && typeMatch && profMatch;
    });
  }, [requests, filterMonth, filterYear, filterType, filterProfissional]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const completed = filteredData.filter(r => r.status === 'Concluído' || r.status === 'Autorizado').length;
    const inProgress = filteredData.filter(r => r.status === 'Em Andamento' || r.status === 'Novo').length;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;

    return { total, completed, inProgress, completedPercent, inProgressPercent };
  }, [filteredData]);

  const chartByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(req => {
      counts[req.type] = (counts[req.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const chartByEvolution = useMemo(() => {
    const data: Record<string, { name: string; concluida: number; emAndamento: number; outros: number; total: number }> = {};
    
    // Sort requests by date first to have chronological evolution
    const sorted = [...filteredData].sort((a, b) => 
      new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
    );

    sorted.forEach(req => {
      const date = new Date(req.createdAt || req.date);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      const name = format(date, 'MMM/yy', { locale: ptBR });
      
      if (!data[key]) {
        data[key] = { name, concluida: 0, emAndamento: 0, outros: 0, total: 0 };
      }
      
      data[key].total += 1;
      if (req.status === 'Concluído' || req.status === 'Autorizado') {
        data[key].concluida += 1;
      } else if (req.status === 'Em Andamento' || req.status === 'Novo') {
        data[key].emAndamento += 1;
      } else {
        data[key].outros += 1;
      }
    });

    return Object.values(data);
  }, [filteredData]);

  const clearFilters = () => {
    setFilterMonth(0);
    setFilterYear(0);
    setFilterType('Todas');
    setFilterProfissional('Todos');
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="text-amber-500" size={20} /> Análise Dinâmica de Solicitações
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gráficos interativos com filtros personalizados</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select 
            value={filterMonth} 
            onChange={e => setFilterMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value={0}>Mês: Todos</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}</option>
            ))}
          </select>

          <select 
            value={filterYear} 
            onChange={e => setFilterYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value={0}>Ano: Todos</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <option value="Todas">Categoria: Todas</option>
            {types.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select 
            value={filterProfissional} 
            onChange={e => setFilterProfissional(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            {profissionais.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button 
            onClick={clearFilters}
            className="px-3 py-2 text-[10px] font-black text-slate-400 hover:text-amber-600 uppercase tracking-widest transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-slate-50 border border-slate-100 rounded-xl"
        >
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total no Período</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Concluídas</p>
            <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md">{stats.completedPercent}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.completed}</p>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-amber-50 border border-amber-100 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Em Aberto</p>
            <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md">{stats.inProgressPercent}%</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.inProgress}</p>
        </motion.div>
      </div>

      <div className="space-y-6">
        <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('categoria')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'categoria' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Por Categoria
          </button>
          <button 
            onClick={() => setActiveTab('evolucao')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'evolucao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Evolução Mensal
          </button>
        </div>

        <div className="h-96 w-full pt-4">
          {filteredData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
              <BarChart3 size={48} strokeWidth={1} />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhuma solicitação encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'categoria' ? (
                <BarChart data={chartByCategory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="total" fill="#f59e0b" barSize={36} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <ComposedChart data={chartByEvolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Bar yAxisId="left" dataKey="concluida" name="Concluídas" stackId="a" fill="#10b981" barSize={30} radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="emAndamento" name="Em Andamento" stackId="a" fill="#f59e0b" />
                  <Bar yAxisId="left" dataKey="outros" name="Outros" stackId="a" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="total" name="Total Acumulado" stroke="#ef4444" strokeWidth={3} dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return format(isoDate, 'dd/MM/yyyy');
      }
      return dateStr;
    } catch {
      return dateStr || 'N/A';
    }
  };

  const safeParseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'inspecoes' | 'gestao-contratual' | 'materiais'>('solicitacoes');
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [selectedContractIdRelatorio, setSelectedContractIdRelatorio] = useState<string>('todos');
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [repactuacoes, setRepactuacoes] = useState<Repactuacao[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterUnit, setFilterUnit] = useState('Todos');
  const [filterMonth, setFilterMonth] = useState(0); // 0 = todos
  const [filterYear, setFilterYear] = useState(0);   // 0 = todos

  const [inspPeriod, setInspPeriod] = useState('month');
  const [inspArea, setInspArea] = useState('Todos');
  const [inspPeriodicity, setInspPeriodicity] = useState('Todos');
  const [inspStatus, setInspStatus] = useState('Todos');
  const [inspProfessional, setInspProfessional] = useState('Todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [contractFilterYear, setContractFilterYear] = useState('Todos');

  const [filterMaterialMonth, setFilterMaterialMonth] = useState(0);
  const [filterMaterialYear, setFilterMaterialYear] = useState(new Date().getFullYear());

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reqRes, inspRes, recRes, contractsRes, financialRes, repactuacoesRes, materialsRes] = await Promise.all([
          fetch('/api/solicitacoes'),
          fetch('/api/inspecoes'),
          fetch('/api/inspecoes/records'),
          supabase.from('contract_info').select('*').order('start_date', { ascending: false }),
          supabase.from('financial_records').select('*').order('year', { ascending: false }).order('month', { ascending: false }),
          supabase.from('repactuacoes').select('*').order('date', { ascending: false }),
          fetch('/api/materials?type=finalistico')
        ]);
        
        const reqData = reqRes.ok ? await reqRes.json() : [];
        const inspData = inspRes.ok ? await inspRes.json() : [];
        const recData = recRes.ok ? await recRes.json() : [];
        const materialsData = materialsRes.ok ? await materialsRes.json() : [];
 
        setRequests(Array.isArray(reqData) ? reqData : []);
        setInspections(Array.isArray(inspData) ? inspData : []);
        setRecords(Array.isArray(recData) ? recData : []);
        setMaterials(Array.isArray(materialsData) ? materialsData : []);
        
        if (contractsRes.data) {
          setContracts(contractsRes.data);
          setContract(contractsRes.data[0] || null);
        }
        if (financialRes.data) setFinancialRecords(financialRes.data.map(r => ({ ...r, month: Number(r.month) })));
        if (repactuacoesRes.data) setRepactuacoes(repactuacoesRes.data);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const typeMatch = filterType === 'Todos' || req.type === filterType;
      const statusMatch = filterStatus === 'Todos' || req.status === filterStatus;
      const unitMatch = filterUnit === 'Todos' || req.unit === filterUnit;

      // Filtro de período
      let periodMatch = true;
      if (filterMonth > 0 || filterYear > 0) {
        const reqDate = new Date(req.createdAt || req.date);
        if (filterMonth > 0) {
          periodMatch = periodMatch && (reqDate.getMonth() + 1 === filterMonth);
        }
        if (filterYear > 0) {
          periodMatch = periodMatch && (reqDate.getFullYear() === filterYear);
        }
      }

      return typeMatch && statusMatch && unitMatch && periodMatch;
    });
  }, [requests, filterType, filterStatus, filterUnit, filterMonth, filterYear]);

  const units = useMemo(() => {
    const u = Array.from(new Set(requests.map(r => r.unit))).filter(Boolean);
    return ['Todos', ...u.sort()];
  }, [requests]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    (filteredRequests || []).forEach(req => {
      if (req && req.type) {
        counts[req.type] = (counts[req.type] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    (filteredRequests || []).forEach(req => {
      if (req && req.status) {
        counts[req.status] = (counts[req.status] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  const enrichedRecords = useMemo(() => {
    return records.map(rec => {
      const inspection = inspections.find(i => i.id === rec.inspectionId);
      
      let execTime = 0;
      if (rec.startTime && rec.endTime) {
        try {
          const start = safeParseDate(rec.startTime);
          const end = safeParseDate(rec.endTime);
          if (isValid(start) && isValid(end) && start.getTime() !== 0) {
            execTime = differenceInMinutes(end, start);
          } else {
            const dateStr = rec.executionDate.split('T')[0];
            const startFull = safeParseDate(`${dateStr}T${rec.startTime}`);
            const endFull = safeParseDate(`${dateStr}T${rec.endTime}`);
            if (isValid(startFull) && isValid(endFull) && startFull.getTime() !== 0) {
              execTime = differenceInMinutes(endFull, startFull);
            }
          }
        } catch (e) {
          console.error('Error calculating execution time', e);
        }
      }

      return {
        ...rec,
        inspectionName: inspection?.name || 'N/A',
        area: inspection?.area || 'N/A',
        periodicity: inspection?.periodicity || 'N/A',
        executionTime: Math.abs(execTime)
      };
    });
  }, [records, inspections]);

  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter(rec => {
      let dateMatch = true;
      const recDate = safeParseDate(rec.createdAt || rec.executionDate);
      const now = new Date();

      if (inspPeriod === 'week') {
        dateMatch = isWithinInterval(recDate, { start: subDays(now, 7), end: now });
      } else if (inspPeriod === 'month') {
        dateMatch = isWithinInterval(recDate, { start: startOfMonth(now), end: endOfMonth(now) });
      } else if (inspPeriod === 'quarter') {
        dateMatch = isWithinInterval(recDate, { start: subMonths(now, 3), end: now });
      } else if (inspPeriod === 'year') {
        dateMatch = isWithinInterval(recDate, { start: subMonths(now, 12), end: now });
      } else if (inspPeriod === 'custom' && customStartDate && customEndDate) {
        dateMatch = isWithinInterval(recDate, { 
          start: startOfDay(safeParseDate(customStartDate)), 
          end: endOfDay(safeParseDate(customEndDate)) 
        });
      }

      const areaMatch = inspArea === 'Todos' || rec.area === inspArea;
      const statusMatch = inspStatus === 'Todos' || rec.executionStatus === inspStatus;
      const periodicityMatch = inspPeriodicity === 'Todos' || rec.periodicity === inspPeriodicity;
      const profMatch = inspProfessional === 'Todos' || rec.professionals.includes(inspProfessional);

      return dateMatch && areaMatch && statusMatch && periodicityMatch && profMatch;
    });
  }, [enrichedRecords, inspPeriod, inspArea, inspPeriodicity, inspStatus, inspProfessional, customStartDate, customEndDate]);

  const allProfessionals = useMemo(() => {
    const profs = new Set<string>();
    records.forEach(r => r.professionals.forEach(p => profs.add(p)));
    return ['Todos', ...Array.from(profs).sort()];
  }, [records]);

  const inspKPIs = useMemo(() => {
    const recs = enrichedRecords || [];
    const now = new Date();
    const currentMonthRecords = recs.filter(r => {
      if (!r) return false;
      const d = safeParseDate(r.createdAt || r.executionDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalProblemsFound = currentMonthRecords.reduce((sum, r) => sum + (Number(r.problemsFound) || 0), 0);
    const totalProblemsResolved = currentMonthRecords.reduce((sum, r) => sum + (Number(r.problemsResolved) || 0), 0);
    const totalProblemsPending = recs.reduce((sum, r) => sum + (Number(r.problemsPending) || 0), 0);
    
    const realizedCount = currentMonthRecords.filter(r => r.executionStatus === 'Concluído').length;
    const predictedCount = Math.max(realizedCount + 2, 10); 
    const complianceRate = (realizedCount / predictedCount) * 100;

    const delayedCount = (inspections || []).filter(i => i && i.status === 'Atrasado').length;
    const avgExecutionTime = recs.length > 0 
      ? recs.reduce((sum, r) => sum + (Number(r.executionTime) || 0), 0) / recs.length 
      : 0;

    return {
      totalRegistered: (inspections || []).length,
      realizedThisMonth: realizedCount,
      complianceRate: complianceRate.toFixed(1),
      problemsFound: totalProblemsFound,
      problemsResolved: totalProblemsResolved,
      problemsPending: totalProblemsPending,
      delayed: delayedCount,
      avgTime: Math.round(avgExecutionTime)
    };
  }, [inspections, enrichedRecords]);

  const realizedVsPredictedData = useMemo(() => {
    const recs = enrichedRecords || [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const monthRecords = recs.filter(r => {
        if (!r) return false;
        const d = safeParseDate(r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      const realized = monthRecords.filter(r => r.executionStatus === 'Concluído').length;
      const predicted = realized + Math.floor(Math.random() * 5);
      data.push({ name: monthName, realizada: realized, prevista: predicted });
    }
    return data;
  }, [enrichedRecords]);

  const areaDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    (inspections || []).forEach(insp => {
      if (insp && insp.area) {
        distribution[insp.area] = (distribution[insp.area] || 0) + 1;
      }
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [inspections]);

  const topProblemAreasData = useMemo(() => {
    const recs = enrichedRecords || [];
    const problemCounts: Record<string, number> = {};
    recs.forEach(rec => {
      if (rec && rec.area) {
        problemCounts[rec.area] = (problemCounts[rec.area] || 0) + (Number(rec.problemsFound) || 0);
      }
    });
    return Object.entries(problemCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [enrichedRecords]);

  const complianceEvolutionData = useMemo(() => {
    const recs = enrichedRecords || [];
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const realized = recs.filter(r => {
        if (!r) return false;
        const d = safeParseDate(r.createdAt || r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear() && r.executionStatus === 'Concluído';
      }).length;
      const predicted = realized + 2;
      const rate = predicted > 0 ? (realized / predicted) * 100 : 0;
      data.push({ name: monthName, taxa: Math.round(rate) });
    }
    return data;
  }, [enrichedRecords]);

  const problemsStatusData = useMemo(() => {
    const recs = enrichedRecords || [];
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const monthRecords = recs.filter(r => {
        if (!r) return false;
        const d = safeParseDate(r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      const found = monthRecords.reduce((s, r) => s + (Number(r.problemsFound) || 0), 0);
      const resolved = monthRecords.reduce((s, r) => s + (Number(r.problemsResolved) || 0), 0);
      const pending = monthRecords.reduce((s, r) => s + (Number(r.problemsPending) || 0), 0);
      data.push({ name: monthName, encontrados: found, resolvidos: resolved, pendentes: pending });
    }
    return data;
  }, [enrichedRecords]);

  const exportToExcel = () => {
    if (activeTab === 'solicitacoes') {
      const worksheet = XLSX.utils.json_to_sheet(filteredRequests.map(req => ({
        'Status': req.status,
        'Descrição': req.description,
        'Unidade': req.unit,
        'Tipo': req.type,
        'Data': formatDate(req.createdAt || req.date),
        'Profissionais': req.professional || 'Não Atribuído',
        'Prazo': req.date
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitações");
      XLSX.writeFile(workbook, `Relatorio_Manutencao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else if (activeTab === 'inspecoes') {
      const workbook = XLSX.utils.book_new();
      const kpiData = [
        { Indicador: 'Total de Inspeções Cadastradas', Valor: inspKPIs.totalRegistered },
        { Indicador: 'Inspeções Realizadas (Mês)', Valor: inspKPIs.realizedThisMonth },
        { Indicador: 'Taxa de Conformidade (%)', Valor: inspKPIs.complianceRate },
        { Indicador: 'Problemas Encontrados (Mês)', Valor: inspKPIs.problemsFound },
        { Indicador: 'Problemas Resolvidos (Mês)', Valor: inspKPIs.problemsResolved },
        { Indicador: 'Problemas Pendentes (Total)', Valor: inspKPIs.problemsPending },
        { Indicador: 'Inspeções Atrasadas', Valor: inspKPIs.delayed },
        { Indicador: 'Média de Tempo (min)', Valor: inspKPIs.avgTime }
      ];
      const wsKPI = XLSX.utils.json_to_sheet(kpiData);
      XLSX.utils.book_append_sheet(workbook, wsKPI, "Resumo KPIs");
      const wsInsp = XLSX.utils.json_to_sheet(inspections.map(i => ({
        'Nome': i.name,
        'Área': i.area,
        'Periodicidade': i.periodicity,
        'Status': i.status,
        'Próxima Data': i.nextDate
      })));
      XLSX.utils.book_append_sheet(workbook, wsInsp, "Lista de Inspeções");
      const wsHist = XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
        'Inspeção': r.inspectionName,
        'Área': r.area,
        'Data': formatDate(r.createdAt || r.executionDate),
        'Profissionais': r.professionals.join(', '),
        'Status': r.executionStatus,
        'Problemas Enc.': r.problemsFound,
        'Problemas Res.': r.problemsResolved,
        'Problemas Pend.': r.problemsPending,
        'Tempo (min)': r.executionTime
      })));
      XLSX.utils.book_append_sheet(workbook, wsHist, "Histórico de Execuções");
      XLSX.writeFile(workbook, `Relatorio_Inspecoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else if (activeTab === 'gestao-contratual') {
      const workbook = XLSX.utils.book_new();

      // Aba 1 — Dados do Contrato selecionado
      const selectedContract = selectedContractIdRelatorio !== 'todos'
        ? contracts.find(c => c.id === selectedContractIdRelatorio)
        : contracts.find(c => c.status === 'Ativo') || contracts[0];

      if (selectedContract) {
        const contractData = [{
          'Contrato nº': selectedContract.contract_number,
          'Empresa': selectedContract.company_name,
          'CNPJ': selectedContract.cnpj,
          'Início': selectedContract.start_date,
          'Fim': selectedContract.end_date,
          'Status': selectedContract.status,
          'Renovações': selectedContract.renewals_count,
          'Contratante': selectedContract.contracting_party
        }];
        const wsContract = XLSX.utils.json_to_sheet(contractData);
        XLSX.utils.book_append_sheet(workbook, wsContract, "Dados do Contrato");
      }

      // Aba 2 — Execução Financeira filtrada
      const wsFinancial = XLSX.utils.json_to_sheet(filteredFinancialRecords.map(r => ({
        'Ano': r.year,
        'Mês': r.month,
        'Fatura nº': r.invoice_number,
        'Nº Processo': r.process_number || '-',
        'Valor Pagamento': r.payment_value,
        'Materiais': r.materials_value,
        'Materiais + CITL': r.materials_citl_value,
        'Total Fatura': r.total_invoice,
        'Descontos': r.discounts,
        'Total Líquido': r.total_after_discounts,
        'Nota Fiscal': r.fiscal_note
      })));
      XLSX.utils.book_append_sheet(workbook, wsFinancial, "Execução Financeira");

      // Aba 3 — Resumo Anual
      const wsSummary = XLSX.utils.json_to_sheet(yearlyCompositionData.map(row => ({
        'Ano': row.year,
        'Total Executado': row.total,
        'Materiais': row.materiais,
        'Descontos': row.descontos,
        'Média Mensal': (row.total / 12).toFixed(2)
      })));
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumo Anual");

      XLSX.writeFile(workbook, `Relatorio_Contratual_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else if (activeTab === 'materiais') {
      const workbook = XLSX.utils.book_new();
      
      // Aba 1: Curva ABC
      const wsABC = XLSX.utils.json_to_sheet(curvaABC.map(item => ({
        'Código': item.code,
        'Descrição': item.name,
        'Unidade': item.unit,
        'Preço Unitário': item.unit_price,
        'Estoque Atual': item.current_stock,
        'Valor em Estoque': item.valorEstoque,
        '% do Total': item.percentual.toFixed(2) + '%',
        '% Acumulado': item.percentualAcumulado.toFixed(2) + '%',
        'Classe': item.classe
      })));
      XLSX.utils.book_append_sheet(workbook, wsABC, "Curva ABC");

      // Aba 2: Estoque de Segurança
      const wsSeguranca = XLSX.utils.json_to_sheet(estoqueSeguranca.map(item => ({
        'Descrição': item.name,
        'Consumo Mensal': item.average_monthly_consumption,
        'Estoque Atual': item.current_stock,
        'Estoque Segurança': item.estoqueSeguranca,
        'Ponto de Pedido': item.pontoPedido,
        'Lote Econômico': item.loteEconomico,
        'Status': item.statusEstoque
      })));
      XLSX.utils.book_append_sheet(workbook, wsSeguranca, "Estoque Segurança");

      // Aba 3: Itens Críticos
      const wsCriticos = XLSX.utils.json_to_sheet(estoqueSeguranca.filter(i => i.statusEstoque !== 'Normal').map(item => ({
        'Descrição': item.name,
        'Classe': item.classe,
        'Estoque Atual': item.current_stock,
        'Estoque Segurança': item.estoqueSeguranca,
        'Status': item.statusEstoque,
        'Valor em Estoque': item.valorEstoque
      })));
      XLSX.utils.book_append_sheet(workbook, wsCriticos, "Itens Críticos");

      XLSX.writeFile(workbook, `Relatorio_Materiais_ABC_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) {
      alert('Conteúdo não encontrado.');
      return;
    }

    try {
      // Esconder elementos que quebram o html2canvas
      const fixedElements = document.querySelectorAll('[class*="fixed"], [class*="sticky"]');
      const hiddenElements: { el: Element; display: string }[] = [];
      fixedElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style) {
          hiddenElements.push({ el, display: htmlEl.style.display });
          htmlEl.style.display = 'none';
        }
      });

      const element = reportRef.current;

      const canvas = await html2canvas(element, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Remover elementos problemáticos do clone
          const selects = clonedDoc.querySelectorAll('select');
          selects.forEach(s => {
            const div = clonedDoc.createElement('div');
            div.textContent = s.value;
            div.style.cssText = 'font-size:10px;font-weight:bold;padding:4px;border:1px solid #e2e8f0;border-radius:4px;';
            s.parentNode?.replaceChild(div, s);
          });
          // Remover inputs e substituir por texto
          const inputs = clonedDoc.querySelectorAll('input');
          inputs.forEach(input => {
            const span = clonedDoc.createElement('span');
            span.textContent = input.value || input.placeholder || '';
            span.style.cssText = 'font-size:10px;font-weight:bold;';
            input.parentNode?.replaceChild(span, input);
          });
          // Remover botões
          const buttons = clonedDoc.querySelectorAll('button');
          buttons.forEach(btn => btn.remove());
        }
      });

      // Restaurar elementos ocultos
      hiddenElements.forEach(({ el, display }) => {
        (el as HTMLElement).style.display = display;
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pdfWidth - margin * 2;
      const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

      // Cabeçalho
      pdf.setFillColor(153, 27, 27);
      pdf.rect(0, 0, pdfWidth, 20, 'F');
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CAV/UFPE — Relatório Gerencial de Manutenção Predial', pdfWidth / 2, 10, { align: 'center' });
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pdfWidth / 2, 16, { align: 'center' });

      const startY = 24;
      const pageContentHeight = pdfHeight - startY - 8;
      const totalPages = Math.ceil(imgHeightMm / pageContentHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const srcY = (page * pageContentHeight * canvas.height) / imgHeightMm;
        const srcHeight = Math.min(
          (pageContentHeight * canvas.height) / imgHeightMm,
          canvas.height - srcY
        );

        // Criar slice do canvas para esta página
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight);
        }

        const sliceHeight = (srcHeight * contentWidth) / canvas.width;
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.85),
          'JPEG',
          margin,
          page === 0 ? startY : 8,
          contentWidth,
          sliceHeight
        );

        // Rodapé
        pdf.setFontSize(7);
        pdf.setTextColor(148, 163, 184);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Página ${page + 1} de ${totalPages} — Sistema Integrado de Gestão de Manutenção Predial e Contratos — CAV/UFPE`,
          pdfWidth / 2,
          pdfHeight - 3,
          { align: 'center' }
        );
      }

      const tabName = activeTab === 'solicitacoes' ? 'Solicitacoes'
        : activeTab === 'inspecoes' ? 'Inspecoes'
        : activeTab === 'gestao-contratual' ? 'Contratual'
        : 'Materiais';

      pdf.save(`Relatorio_${tabName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } catch (error: any) {
      console.error('Erro detalhado ao gerar PDF:', error);
      alert(`Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}. Tente novamente ou use a exportação Excel.`);
    }
  };

  const clearFilters = () => {
    if (activeTab === 'solicitacoes') {
      setFilterType('Todos');
      setFilterStatus('Todos');
      setFilterUnit('Todos');
      setFilterMonth(0);
      setFilterYear(0);
    } else if (activeTab === 'inspecoes') {
      setInspPeriod('month');
      setInspArea('Todos');
      setInspPeriodicity('Todos');
      setInspStatus('Todos');
      setInspProfessional('Todos');
      setCustomStartDate('');
      setCustomEndDate('');
    } else if (activeTab === 'gestao-contratual') {
      setContractFilterYear('Todos');
      setSelectedContractIdRelatorio('todos');
    }
  };

  // --- Contract Dashboard Logic ---
  const filteredFinancialRecords = useMemo(() => {
    return financialRecords.filter(rec => {
      if (!rec || !rec.year) return false;
      const yearMatch = contractFilterYear === 'Todos' || rec.year.toString() === contractFilterYear;
      const contractMatch = selectedContractIdRelatorio === 'todos' || rec.contract_id === selectedContractIdRelatorio;
      return yearMatch && contractMatch;
    });
  }, [financialRecords, contractFilterYear, selectedContractIdRelatorio]);

  const contractYears = useMemo(() => {
    const years = Array.from(new Set(financialRecords.filter(r => r && r.year).map(r => r.year.toString()))).sort((a, b) => b.localeCompare(a));
    return ['Todos', ...years];
  }, [financialRecords]);

  // CORREÇÃO: contractKPIs agora usa filteredFinancialRecords
  const contractKPIs = useMemo(() => {
    const records = filteredFinancialRecords || [];
    const totalExecuted = records.reduce((sum, r) => sum + (Number(r.total_after_discounts) || 0), 0);
    const currentYear = new Date().getFullYear();
    const currentYearExecuted = records.filter(r => Number(r.year) === currentYear).reduce((sum, r) => sum + (Number(r.total_after_discounts) || 0), 0);
    const avgInvoice = records.length > 0 ? totalExecuted / records.length : 0;
    const totalDiscounts = records.reduce((sum, r) => sum + (Number(r.discounts) || 0), 0);
    const maxInvoice = records.length > 0 ? Math.max(...records.map(r => Number(r.total_after_discounts) || 0)) : 0;
    const minInvoice = records.length > 0 ? Math.min(...records.map(r => Number(r.total_after_discounts) || 0)) : 0;
    const totalMaterials = records.reduce((sum, r) => sum + (Number(r.materials_value) || 0), 0);
    const discountPercentage = totalExecuted > 0 ? (totalDiscounts / (totalExecuted + totalDiscounts)) * 100 : 0;
    
    let remainingDays = 0;
    const selectedContract = selectedContractIdRelatorio !== 'todos'
      ? contracts.find(c => c.id === selectedContractIdRelatorio)
      : contracts.find(c => c.status === 'Ativo') || contracts[0];

    if (selectedContract?.end_date) {
      remainingDays = differenceInDays(safeParseDate(selectedContract.end_date), new Date());
    }

    return {
      totalExecuted,
      currentYearExecuted,
      avgInvoice,
      totalDiscounts,
      maxInvoice,
      minInvoice,
      totalMaterials,
      discountPercentage,
      remainingDays: Math.max(0, remainingDays)
    };
  }, [filteredFinancialRecords, contracts, selectedContractIdRelatorio]);

  const monthlyEvolutionData = useMemo(() => {
    const records = filteredFinancialRecords || [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = subMonths(now, i);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthName = months[monthIdx];
      const record = records.find(r => Number(r.year) === year && Number(r.month) === monthIdx + 1);
      data.push({
        name: `${monthName}/${year.toString().slice(-2)}`,
        valor: record ? (Number(record.total_after_discounts) || 0) : 0,
        materiais: record ? (Number(record.materials_value) || 0) : 0,
        servicos: record ? (Number(record.payment_value) || 0) : 0
      });
    }
    return data;
  }, [filteredFinancialRecords]);

  const yearlyCompositionData = useMemo(() => {
    const records = filteredFinancialRecords || [];
    const years = Array.from(new Set(records.map(r => r.year))).filter(Boolean).sort();
    return years.map(year => {
      const yearRecs = records.filter(r => r.year === year);
      return {
        year: year.toString(),
        total: yearRecs.reduce((sum, r) => sum + (Number(r.total_after_discounts) || 0), 0),
        materiais: yearRecs.reduce((sum, r) => sum + (Number(r.materials_value) || 0), 0),
        descontos: yearRecs.reduce((sum, r) => sum + (Number(r.discounts) || 0), 0)
      };
    });
  }, [filteredFinancialRecords]);
// --- Indicador: Custo por Demanda ---
const custoPorDemandaData = useMemo(() => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const now = new Date();
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    const year = d.getFullYear();
    const monthIdx = d.getMonth(); // 0-based
    const monthNum = monthIdx + 1; // 1-based

    const financialRecord = filteredFinancialRecords.find(
      r => Number(r.year) === year && Number(r.month) === monthNum
    );

    const totalLiquido = financialRecord ? Number(financialRecord.total_after_discounts) || 0 : 0;

    const totalDemandas = requests.filter(req => {
      const reqDate = new Date(req.createdAt || req.date);
      return reqDate.getFullYear() === year && reqDate.getMonth() === monthIdx;
    }).length;

    const custoPorDemanda = totalDemandas > 0 ? totalLiquido / totalDemandas : 0;

    data.push({
      name: `${months[monthIdx]}/${year.toString().slice(-2)}`,
      totalLiquido,
      totalDemandas,
      custoPorDemanda: Math.round(custoPorDemanda * 100) / 100,
    });
  }

  return data;
}, [filteredFinancialRecords, requests]);
  const invoiceComponentData = useMemo(() => {
    const records = filteredFinancialRecords || [];
    const totalPayment = records.reduce((sum, r) => sum + (Number(r.payment_value) || 0), 0);
    const totalMaterials = records.reduce((sum, r) => sum + (Number(r.materials_value) || 0), 0);
    const totalCITL = records.reduce((sum, r) => sum + (Number(r.materials_citl_value) || 0), 0);
    return [
      { name: 'Mão de Obra / Fato Gerador', value: totalPayment },
      { name: 'Materiais', value: totalMaterials },
      { name: 'Materiais + CITL', value: totalCITL }
    ];
  }, [filteredFinancialRecords]);

  const topInvoicesData = useMemo(() => {
    const records = filteredFinancialRecords || [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return [...records]
      .sort((a, b) => (Number(b.total_after_discounts) || 0) - (Number(a.total_after_discounts) || 0))
      .slice(0, 5)
      .map(r => ({
        name: `${months[Number(r.month) - 1] || r.month}/${r.year}`,
        valor: Number(r.total_after_discounts) || 0
      }));
  }, [filteredFinancialRecords]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // --- Materiais / Curva ABC Logic ---
  const curvaABC = useMemo(() => {
    if (!Array.isArray(materials) || materials.length === 0) return [];

    const itemsComValor = materials.map(item => {
      // Calcular consumo filtrado por mês/ano
      const consumptionRecords = Array.isArray(item.consumptionRecords) ? item.consumptionRecords : [];
      const consumoFiltrado = consumptionRecords
        .filter((r: any) => {
          const d = new Date(r.date);
          const monthMatch = filterMaterialMonth === 0 || (d.getMonth() + 1 === filterMaterialMonth);
          const yearMatch = d.getFullYear() === filterMaterialYear;
          return monthMatch && yearMatch;
        })
        .reduce((sum: number, r: any) => sum + (Number(r.quantity) || 0), 0);

      return {
        ...item,
        // Mapear campos do banco para os campos usados nos cálculos
        name: item.descricao || item.name || '',
        code: item.codigo || item.code || '',
        unit: item.unidadeMedida || item.unit || '',
        unit_price: item.valorUnitario || item.unit_price || 0,
        current_stock: item.saldoAtual || item.current_stock || 0,
        average_monthly_consumption: item.averageMonthlyConsumption || item.average_monthly_consumption || 0,
        consumoNoperiodo: consumoFiltrado,
        valorEstoque: (Number(item.saldoAtual || item.current_stock) || 0) * (Number(item.valorUnitario || item.unit_price) || 0)
      };
    });

    const itemsOrdenados = [...itemsComValor].sort((a, b) => b.valorEstoque - a.valorEstoque);
    const valorTotalGeral = itemsOrdenados.reduce((sum, item) => sum + item.valorEstoque, 0);

    let acumulado = 0;
    return itemsOrdenados.map(item => {
      const percentual = valorTotalGeral > 0 ? (item.valorEstoque / valorTotalGeral) * 100 : 0;
      acumulado += percentual;
      let classe: 'A' | 'B' | 'C' = 'C';
      if (acumulado <= 80) classe = 'A';
      else if (acumulado <= 95) classe = 'B';
      return { ...item, percentual, percentualAcumulado: acumulado, classe };
    });
  }, [materials, filterMaterialMonth, filterMaterialYear]);

  const estoqueSeguranca = useMemo(() => {
    if (!Array.isArray(curvaABC) || curvaABC.length === 0) return [];
    return curvaABC.map(item => {
      const consumoMensal = Number(item.average_monthly_consumption) || 0;
      const leadTime = 30; // 30 dias padrão
      
      // Fator de segurança baseado na classe ABC
      const fatorSeguranca = item.classe === 'A' ? 2.0 : item.classe === 'B' ? 1.5 : 1.2;
      
      const estoqueSeg = Math.ceil(consumoMensal * (leadTime / 30) * (fatorSeguranca - 1));
      const pontoPedido = Math.ceil(consumoMensal * (leadTime / 30) + estoqueSeg);
      
      // Lote Econômico Simplificado
      const custoPedido = 50; // Mock
      const custoEstoque = (Number(item.unit_price) || 0) * 0.2; // 20% do valor unitário ao ano
      const lec = custoEstoque > 0 ? Math.sqrt((2 * consumoMensal * 12 * custoPedido) / custoEstoque) : 0;

      let status: 'Normal' | 'Atenção' | 'Crítico' = 'Normal';
      if (item.current_stock <= estoqueSeg) status = 'Crítico';
      else if (item.current_stock <= pontoPedido) status = 'Atenção';

      return {
        ...item,
        estoqueSeguranca: estoqueSeg,
        pontoPedido,
        loteEconomico: Math.ceil(lec),
        statusEstoque: status
      };
    });
  }, [curvaABC]);

  const abcChartData = useMemo(() => {
    if (!Array.isArray(curvaABC) || curvaABC.length === 0) return { counts: [], values: [] };
    const counts: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };
    const values: Record<'A' | 'B' | 'C', number> = { A: 0, B: 0, C: 0 };
    
    curvaABC.forEach(item => {
      const classe = item.classe as 'A' | 'B' | 'C';
      counts[classe]++;
      values[classe] += item.valorEstoque;
    });

    return {
      counts: [
        { name: 'Classe A', value: counts.A, fill: '#8b5cf6' },
        { name: 'Classe B', value: counts.B, fill: '#a78bfa' },
        { name: 'Classe C', value: counts.C, fill: '#c4b5fd' }
      ],
      values: [
        { name: 'Classe A (80%)', value: values.A, fill: '#8b5cf6' },
        { name: 'Classe B (15%)', value: values.B, fill: '#a78bfa' },
        { name: 'Classe C (5%)', value: values.C, fill: '#c4b5fd' }
      ]
    };
  }, [curvaABC]);

  const criticosData = useMemo(() => {
    if (!Array.isArray(estoqueSeguranca) || estoqueSeguranca.length === 0) return [];
    return estoqueSeguranca
      .filter(item => item.statusEstoque !== 'Normal')
      .sort((a, b) => {
        if (a.statusEstoque === 'Crítico' && b.statusEstoque !== 'Crítico') return -1;
        if (a.statusEstoque !== 'Crítico' && b.statusEstoque === 'Crítico') return 1;
        return b.valorEstoque - a.valorEstoque;
      })
      .slice(0, 20);
  }, [estoqueSeguranca]);

  return (
    <DashboardLayout title="Relatórios e Estatísticas">
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-widest text-slate-900 uppercase">Relatórios do Sistema</h2>
            <p className="text-slate-900 font-bold">Análise detalhada de desempenho e exportação de dados.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              <span className="text-sm">Excel</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-slate-800/20 active:scale-95 cursor-pointer"
            >
              <FileText size={18} />
              <span className="text-sm">PDF</span>
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`px-6 py-3 text-sm font-black tracking-widest uppercase transition-all relative cursor-pointer ${
              activeTab === 'solicitacoes' ? 'text-blue-600' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Solicitações
            {activeTab === 'solicitacoes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('inspecoes')}
            className={`px-6 py-3 text-sm font-black tracking-widest uppercase transition-all relative cursor-pointer ${
              activeTab === 'inspecoes' ? 'text-amber-600' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Rotinas de Inspeções
            {activeTab === 'inspecoes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('gestao-contratual')}
            className={`px-6 py-3 text-sm font-black tracking-widest uppercase transition-all relative cursor-pointer ${
              activeTab === 'gestao-contratual' ? 'text-emerald-600' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Gestão Contratual
            {activeTab === 'gestao-contratual' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('materiais')}
            className={`px-6 py-3 text-sm font-black tracking-widest uppercase transition-all relative cursor-pointer ${
              activeTab === 'materiais' ? 'text-violet-600' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Materiais
            {activeTab === 'materiais' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-violet-600 rounded-t-full" />
            )}
          </button>
        </div>

        <div ref={reportRef} className="space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'solicitacoes' ? (
              <motion.div key="solicitacoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-700" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtros</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Categoria</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value="Todos">Todas</option>
                      <option value="Civil">Civil</option>
                      <option value="Hidráulico">Hidráulico</option>
                      <option value="Elétrico">Elétrico</option>
                      <option value="Coberta">Coberta</option>
                      <option value="Pintura">Pintura</option>
                      <option value="Marcenaria">Marcenaria</option>
                      <option value="Ar-condicionado">Ar-condicionado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value="Todos">Todos</option>
                      <option value="Novo">Novo</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Autorizado">Autorizado</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Atrasado">Atrasado</option>
                      <option value="Não Contratual">Não Contratual</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Unidade</label>
                    <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Mês</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value={0}>Todos</option>
                      <option value={1}>Janeiro</option>
                      <option value={2}>Fevereiro</option>
                      <option value={3}>Março</option>
                      <option value={4}>Abril</option>
                      <option value={5}>Maio</option>
                      <option value={6}>Junho</option>
                      <option value={7}>Julho</option>
                      <option value={8}>Agosto</option>
                      <option value={9}>Setembro</option>
                      <option value={10}>Outubro</option>
                      <option value={11}>Novembro</option>
                      <option value={12}>Dezembro</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano</label>
                    <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value={0}>Todos</option>
                      <option value={2022}>2022</option>
                      <option value={2023}>2023</option>
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>

                  <button onClick={clearFilters} className="mt-auto mb-1 text-xs font-bold text-slate-900 hover:text-amber-600 underline underline-offset-4 cursor-pointer transition-colors">Limpar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: 'Total de Demandas', value: filteredRequests.length, icon: FileText, color: 'blue' },
                    { title: 'Concluídas', value: filteredRequests.filter(r => r.status === 'Concluído' || r.status === 'Autorizado').length, icon: CheckCircle2, color: 'emerald' },
                    { title: 'Em Aberto', value: filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length, icon: Clock, color: 'amber' },
                  ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          <stat.icon size={24} />
                        </div>
                      </div>
                      <p className="text-slate-900 text-xs font-black uppercase tracking-widest">{stat.title}</p>
                      <p className="text-4xl font-black text-slate-900 mt-1">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                <KPIProdutividadeProfissional requests={filteredRequests} />
                <GraficoDinamicoSolicitacoes requests={filteredRequests} />

                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <PieChartIcon size={20} className="text-emerald-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Distribuição por Status</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs font-bold text-slate-900 uppercase tracking-tighter">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-blue-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Resumo de Análise</h3>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-800 leading-relaxed">
                        Com base nos dados filtrados, observamos que a categoria <span className="font-black text-blue-600">{[...typeData].sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}</span> é a que possui maior volume de solicitações, representando <span className="font-black">{filteredRequests.length > 0 ? Math.round(([...typeData].sort((a, b) => b.value - a.value)[0]?.value / filteredRequests.length) * 100) : 0}%</span> do total.
                      </p>
                      <p className="text-sm text-slate-800 leading-relaxed">
                        Atualmente, <span className="font-black text-amber-600">{filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length}</span> solicitações estão aguardando resolução, o que requer atenção da equipe técnica para evitar atrasos no cronograma.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Listagem Detalhada de Solicitações</h3>
                      <span className="text-[10px] font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest">{filteredRequests.length} registros encontrados</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">ID / Data</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Descrição</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Unidade</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Tipo</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Profissional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredRequests.length > 0 ? (
                            (showAllRequests ? filteredRequests : filteredRequests.slice(0, 10)).map((req) => (
                              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-900">#{req.id.slice(-4)}</span>
                                    <span className="text-[10px] font-bold text-slate-900">{formatDate(req.createdAt || req.date)}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4"><p className="text-sm font-bold text-slate-800 line-clamp-1">{req.description}</p></td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-900">{req.unit}</td>
                                <td className="px-6 py-4"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">{req.type}</span></td>
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                    req.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 
                                    req.status === 'Atrasado' ? 'bg-red-100 text-red-700' : 
                                    req.status === 'Não Contratual' ? 'bg-slate-100 text-slate-600' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>{req.status}</span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700">{req.professional || <span className="italic opacity-50">Não atribuído</span>}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-700 font-medium italic">Nenhuma solicitação encontrada para os filtros aplicados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredRequests.length > 10 && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                        <button onClick={() => setShowAllRequests(!showAllRequests)} className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                          {showAllRequests ? 'Ver menos' : 'Ver todos os registros'} <ArrowRight size={14} className={showAllRequests ? 'rotate-180' : ''} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'inspecoes' ? (
              <motion.div key="inspecoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-900" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Filtros</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Período</label>
                    <select value={inspPeriod} onChange={(e) => setInspPeriod(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value="week">Últimos 7 dias</option>
                      <option value="month">Mês Atual</option>
                      <option value="quarter">Trimestre</option>
                      <option value="year">Ano</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                  {inspPeriod === 'custom' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Início</label>
                        <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Fim</label>
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" />
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Área</label>
                    <select value={inspArea} onChange={(e) => setInspArea(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value="Todos">Todas</option>
                      <option value="Elétrica">Elétrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="Civil">Civil</option>
                      <option value="Ar Condicionado">Ar Condicionado</option>
                      <option value="Segurança">Segurança</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Periodicidade</label>
                    <select value={inspPeriodicity} onChange={(e) => setInspPeriodicity(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value="Todos">Todas</option>
                      <option value="Diária">Diária</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Profissional</label>
                    <select value={inspProfessional} onChange={(e) => setInspProfessional(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      {allProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button onClick={clearFilters} className="mt-auto mb-1 text-xs font-bold text-slate-900 hover:text-amber-600 underline underline-offset-4 cursor-pointer transition-colors">Limpar</button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Total Cadastradas', value: inspKPIs.totalRegistered, icon: FileText, color: 'slate' },
                    { title: 'Realizadas (Mês)', value: inspKPIs.realizedThisMonth, icon: CheckCircle2, color: 'amber' },
                    { title: 'Taxa Conformidade', value: `${inspKPIs.complianceRate}%`, icon: TrendingUp, color: 'emerald' },
                    { title: 'Tempo Médio', value: `${inspKPIs.avgTime} min`, icon: Clock, color: 'blue' },
                    { title: 'Probs. Encontrados', value: inspKPIs.problemsFound, icon: AlertCircle, color: 'red' },
                    { title: 'Probs. Resolvidos', value: inspKPIs.problemsResolved, icon: CheckCircle2, color: 'emerald' },
                    { title: 'Probs. Pendentes', value: inspKPIs.problemsPending, icon: Activity, color: 'amber' },
                    { title: 'Inspeções Atrasadas', value: inspKPIs.delayed, icon: AlertCircle, color: 'red' },
                  ].map((kpi, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${kpi.color === 'slate' ? 'bg-slate-100 text-slate-600' : kpi.color === 'amber' ? 'bg-amber-100 text-amber-600' : kpi.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : kpi.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                          <kpi.icon size={16} />
                        </div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">{kpi.title}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-amber-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Realizadas vs Previstas (6 Meses)</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={realizedVsPredictedData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} cursor={{ fill: '#f1f5f9' }} />
                          <Legend iconType="circle" />
                          <Bar name="Previstas" dataKey="prevista" fill={SLATE_COLOR} radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar name="Realizadas" dataKey="realizada" fill={AMBER_COLOR} radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <PieChartIcon size={20} className="text-blue-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Distribuição por Área</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={areaDistributionData} cx="40%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                            {areaDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-red-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Ranking de Problemas por Área</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topProblemAreasData}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} width={100} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Bar dataKey="value" fill={RED_COLOR} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <TrendingUp size={20} className="text-emerald-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Evolução da Conformidade (12 Meses)</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={complianceEvolutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Line type="monotone" dataKey="taxa" stroke={EMERALD_COLOR} strokeWidth={4} dot={{ r: 6, fill: EMERALD_COLOR, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-8">
                      <Activity size={20} className="text-slate-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Status de Problemas por Mês</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={problemsStatusData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Legend iconType="circle" />
                          <Bar name="Resolvidos" dataKey="resolvidos" stackId="a" fill={EMERALD_COLOR} radius={[0, 0, 0, 0]} />
                          <Bar name="Pendentes" dataKey="pendentes" stackId="a" fill={AMBER_COLOR} radius={[0, 0, 0, 0]} />
                          <Bar name="Encontrados" dataKey="encontrados" stackId="a" fill={RED_COLOR} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-amber-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Análise de Desempenho Operacional</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <p className="text-sm text-slate-800 leading-relaxed">A taxa de conformidade atual é de <span className="font-black text-emerald-600">{inspKPIs.complianceRate}%</span>. A área de <span className="font-black text-red-600">{topProblemAreasData[0]?.name || 'N/A'}</span> apresenta o maior índice de problemas detectados, sugerindo a necessidade de uma revisão preventiva mais profunda ou substituição de componentes críticos.</p>
                      <p className="text-sm text-slate-800 leading-relaxed">O tempo médio de execução das inspeções é de <span className="font-black text-blue-600">{inspKPIs.avgTime} minutos</span>. Manter este indicador sob controle é fundamental para garantir que todas as rotinas diárias sejam cumpridas sem sobrecarregar a equipe.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Histórico Detalhado de Execuções</h3>
                    <span className="text-[10px] font-black text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest">{filteredRecords.length} registros encontrados</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Inspeção</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Área</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Profissional</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Probs. (E/R/P)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Tempo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRecords.length > 0 ? (
                          (showAllRecords ? filteredRecords : filteredRecords.slice(0, 10)).map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-black text-slate-900">{rec.inspectionName}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-tighter">{rec.area}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700">{formatDate(rec.createdAt || rec.executionDate)}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-900">{rec.professionals.join(', ')}</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{rec.problemsFound}</span>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{rec.problemsResolved}</span>
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{rec.problemsPending}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${rec.executionStatus === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : rec.executionStatus === 'Atrasado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{rec.executionStatus}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-900">{rec.executionTime} min</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-700 font-medium italic">Nenhum registro encontrado para os filtros aplicados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredRecords.length > 10 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                      <button onClick={() => setShowAllRecords(!showAllRecords)} className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        {showAllRecords ? 'Ver menos' : 'Ver todos os registros'} <ArrowRight size={14} className={showAllRecords ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'gestao-contratual' ? (
              <motion.div key="gestao-contratual" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-700" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtros</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano de Exercício</label>
                    <select
                      value={contractFilterYear}
                      onChange={(e) => setContractFilterYear(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      {contractYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Contrato</label>
                    <select 
                      value={selectedContractIdRelatorio} 
                      onChange={e => setSelectedContractIdRelatorio(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 min-w-[200px]"
                    >
                      <option value="todos">Todos os Contratos</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.contract_number} — {c.company_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={clearFilters}
                    className="mt-auto mb-1 text-xs font-bold text-slate-900 hover:text-amber-600 underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Limpar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Executado</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.totalExecuted)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Executado Ano Atual</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.currentYearExecuted)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Média Mensal</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.avgInvoice)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Descontos</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.totalDiscounts)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Maior Fatura</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.maxInvoice)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Menor Fatura</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.minInvoice)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Custo Materiais</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{formatCurrency(contractKPIs.totalMaterials)}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dias para Vencimento</p>
                    <p className="text-lg font-black text-slate-900 font-mono">{contractKPIs.remainingDays}</p>
                  </div>
                </div>{/* Custo por Demanda — mês atual */}
{(() => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentPoint = custoPorDemandaData.find(
    d => d.name.startsWith(
      ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][now.getMonth()]
    )
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="size-9 rounded-xl bg-violet-600 text-white flex items-center justify-center">
          <TrendingUp size={16} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mês atual</span>
      </div>
      <p className="text-2xl font-black text-slate-900">
        {formatCurrency(currentPoint?.custoPorDemanda || 0)}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
        Custo por Demanda
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {currentPoint?.totalDemandas || 0} demandas · {formatCurrency(currentPoint?.totalLiquido || 0)} líquido
      </p>
    </div>
  );
})()}
{/* Custo por Demanda — Evolução Mensal */}
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm flex items-center gap-2">
      <TrendingUp size={16} className="text-violet-600" />
      Custo Unitário por Demanda — Evolução Mensal
    </h3>
    <p className="text-xs text-slate-500 mt-1">
      Total Líquido do contrato 31/21 ÷ Total de demandas abertas no mês
    </p>
  </div>
  <div className="p-6">
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={custoPorDemandaData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
        <YAxis yAxisId="custo" orientation="left" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="demandas" orientation="right" tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip formatter={(value: number, name: string) => {
          if (name === 'custoPorDemanda') return [formatCurrency(value), 'Custo/Demanda'];
          if (name === 'totalDemandas') return [value, 'Demandas'];
          return [formatCurrency(value), 'Total Líquido'];
        }} />
        <Legend formatter={(value) =>
          value === 'custoPorDemanda' ? 'Custo por Demanda (R$)'
          : value === 'totalDemandas' ? 'Nº Demandas'
          : 'Total Líquido (R$)'
        } />
        <Bar yAxisId="demandas" dataKey="totalDemandas" fill="#e2e8f0" radius={[4,4,0,0]} name="totalDemandas" />
        <Line yAxisId="custo" type="monotone" dataKey="custoPorDemanda" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} name="custoPorDemanda" />
        <Line yAxisId="custo" type="monotone" dataKey="totalLiquido" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="totalLiquido" />
      </ComposedChart>
    </ResponsiveContainer>

    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-600">Mês</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-600 text-right">Total Líquido</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-600 text-right">Demandas</th>
            <th className="px-4 py-3 font-black uppercase tracking-widest text-slate-600 text-right">Custo/Demanda</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {custoPorDemandaData.filter(d => d.totalLiquido > 0 || d.totalDemandas > 0).map((row, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 font-bold text-slate-700">{row.name}</td>
              <td className="px-4 py-2.5 text-right text-slate-600">{row.totalLiquido > 0 ? formatCurrency(row.totalLiquido) : '—'}</td>
              <td className="px-4 py-2.5 text-right text-slate-600">{row.totalDemandas}</td>
              <td className="px-4 py-2.5 text-right font-black text-violet-700">{row.custoPorDemanda > 0 ? formatCurrency(row.custoPorDemanda) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Evolução de Faturamento (24 meses)</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyEvolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={AMBER_COLOR} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={AMBER_COLOR} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Area type="monotone" dataKey="valor" stroke={AMBER_COLOR} fillOpacity={1} fill="url(#colorUv)" name="Valor Total" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Composição Anual</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearlyCompositionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="year" fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Bar dataKey="materiais" fill={EMERALD_COLOR} name="Materiais" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="descontos" fill={RED_COLOR} name="Descontos" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Distribuição de Componentes</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={invoiceComponentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={110}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {invoiceComponentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Top 5 Maiores Faturas</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topInvoicesData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} fontWeight="bold" tick={{ fill: SLATE_COLOR }} axisLine={false} tickLine={false} tickFormatter={formatCurrency} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Bar dataKey="valor" fill={AMBER_COLOR} radius={4} name="Valor" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Resumo Anual de Execução</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano</th>
                          <th scope="col" className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Executado</th>
                          <th scope="col" className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Materiais</th>
                          <th scope="col" className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Descontos</th>
                          <th scope="col" className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Média Mensal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {yearlyCompositionData.map(row => (
                          <tr key={row.year} className="text-xs font-bold text-slate-700">
                            <td className="px-6 py-4 whitespace-nowrap font-mono">{row.year}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{formatCurrency(row.total)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{formatCurrency(row.materiais)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{formatCurrency(row.descontos)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono">{formatCurrency(row.total / 12)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'materiais' ? (
              <motion.div key="materiais" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-700" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtros de Consumo</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Mês</label>
                    <select value={filterMaterialMonth} onChange={e => setFilterMaterialMonth(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      <option value={0}>Todo Ano</option>
                      <option value={1}>Janeiro</option>
                      <option value={2}>Fevereiro</option>
                      <option value={3}>Março</option>
                      <option value={4}>Abril</option>
                      <option value={5}>Maio</option>
                      <option value={6}>Junho</option>
                      <option value={7}>Julho</option>
                      <option value={8}>Agosto</option>
                      <option value={9}>Setembro</option>
                      <option value={10}>Outubro</option>
                      <option value={11}>Novembro</option>
                      <option value={12}>Dezembro</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano</label>
                    <select value={filterMaterialYear} onChange={e => setFilterMaterialYear(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50">
                      {[2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setFilterMaterialMonth(0); setFilterMaterialYear(new Date().getFullYear()); }}
                    className="mt-auto mb-1 text-xs font-bold text-slate-900 hover:text-amber-600 underline underline-offset-4 cursor-pointer transition-colors">
                    Limpar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Total de Itens', value: (curvaABC || []).length, icon: Briefcase, color: 'slate' },
                    { title: 'Valor Total Estoque', value: formatCurrency((curvaABC || []).reduce((s, i) => s + i.valorEstoque, 0)), icon: DollarSign, color: 'emerald' },
                    { title: 'Itens Classe A', value: (curvaABC || []).filter(i => i.classe === 'A').length, icon: TrendingUp, color: 'violet' },
                    { title: 'Itens Críticos', value: (estoqueSeguranca || []).filter(i => i.statusEstoque === 'Crítico').length, icon: AlertCircle, color: 'red' },
                  ].map((kpi, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${kpi.color === 'slate' ? 'bg-slate-100 text-slate-600' : kpi.color === 'violet' ? 'bg-violet-100 text-violet-600' : kpi.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          <kpi.icon size={16} />
                        </div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-tight">{kpi.title}</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 truncate">{kpi.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-violet-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Distribuição de Itens por Classe</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(abcChartData.counts || [])}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} cursor={{ fill: '#f1f5f9' }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <PieChartIcon size={20} className="text-violet-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Distribuição de Valor por Classe</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={(abcChartData.values || [])} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                            {(abcChartData.values || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-8">
                      <TrendingUp size={20} className="text-violet-600" />
                      <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Análise de Pareto (Top 20 Itens por Valor)</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(curvaABC || []).slice(0, 20)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" height={80} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(v) => `R$${v/1000}k`} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#8b5cf6' }} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(value, name) => name === 'percentualAcumulado' ? [`${Number(value).toFixed(2)}%`, 'Acumulado'] : [formatCurrency(Number(value)), 'Valor em Estoque']} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }} />
                          <Bar yAxisId="left" dataKey="valorEstoque" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Gestão de Estoque e Reposição</h3>
                    <span className="text-[10px] font-black text-red-600 bg-white px-3 py-1.5 rounded-lg border border-red-200 uppercase tracking-widest">{estoqueSeguranca.filter(i => i.statusEstoque !== 'Normal').length} itens requerem atenção</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Material</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Consumo Mensal</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Estoque Atual</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Estoque Seg.</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Ponto Pedido</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Lote Econ.</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(estoqueSeguranca || []).filter(i => i.statusEstoque !== 'Normal').map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900">{item.name}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classe {item.classe}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-900">{item.average_monthly_consumption} {item.unit}</td>
                            <td className="px-6 py-4 text-center text-xs font-black text-slate-900">{item.current_stock}</td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{item.estoqueSeguranca}</td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{item.pontoPedido}</td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-blue-600">{item.loteEconomico}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${item.statusEstoque === 'Crítico' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.statusEstoque}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Classificação Curva ABC Completa</h3>
                    <span className="text-[10px] font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-widest">{curvaABC.length} itens catalogados</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Pos.</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Material</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">Valor Estoque</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">
                            Consumo {filterMaterialMonth > 0 ? `${filterMaterialMonth}/${filterMaterialYear}` : filterMaterialYear}
                          </th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">% do Total</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">% Acumulada</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">Classe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(showAllMaterials ? (curvaABC || []) : (curvaABC || []).slice(0, 15)).map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-xs font-black text-slate-400">#{idx + 1}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">{item.name}</span>
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">{item.code}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-slate-900">{formatCurrency(item.valorEstoque)}</td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-amber-600">
                              {item.consumoNoperiodo > 0 ? item.consumoNoperiodo : '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{item.percentual.toFixed(2)}%</td>
                            <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{item.percentualAcumulado.toFixed(2)}%</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.classe === 'A' ? 'bg-violet-100 text-violet-700' : item.classe === 'B' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{item.classe}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {curvaABC.length > 15 && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                      <button onClick={() => setShowAllMaterials(!showAllMaterials)} className="text-xs font-black text-violet-600 hover:text-violet-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        {showAllMaterials ? 'Ver menos' : 'Ver todos os registros'} <ArrowRight size={14} className={showAllMaterials ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
