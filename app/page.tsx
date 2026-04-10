'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Clock, CheckCircle2, AlertTriangle, Activity,
  TrendingUp, TrendingDown, Plus, BarChart as BarChartIcon,
  PieChart as PieChartIcon, Building2, ChevronRight,
  LayoutDashboard, Calendar as CalendarIcon
} from 'lucide-react';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';
import { motion } from 'framer-motion';
import {
  format, subMonths, isSameMonth, differenceInDays, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const [authRes, reqRes] = await Promise.all([
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/solicitacoes?t=${timestamp}`, { cache: 'no-store' })
      ]);
      if (authRes.ok) setUser(await authRes.json());
      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const requestsWithDisplayId = useMemo(() => {
    if (!Array.isArray(requests) || requests.length === 0) return [];
    const groupedByYear: { [year: string]: any[] } = {};
    requests.forEach(req => {
      const year = new Date(req.createdAt || req.date).getFullYear().toString();
      if (!groupedByYear[year]) groupedByYear[year] = [];
      groupedByYear[year].push(req);
    });
    return requests.map(req => {
      const year = new Date(req.createdAt || req.date).getFullYear().toString();
      const yearRequests = [...(groupedByYear[year] || [])].sort((a, b) =>
        new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
      );
      const index = yearRequests.findIndex(r => r.id === req.id);
      const sequence = (index + 1).toString().padStart(2, '0');
      return { ...req, displayId: `${sequence}/${year}` };
    });
  }, [requests]);

  const kpis = useMemo(() => {
    if (!Array.isArray(requests) || requests.length === 0) return null;
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const totalOS = requests.length;
    const closedOS = requests.filter(r => r.status === 'Concluído').length;
    const resolutionRate = (closedOS / totalOS) * 100;
    const currentMonthOS = requests.filter(r => {
      try { return isSameMonth(parseISO(r.createdAt || r.date), now); } catch { return false; }
    });
    const lastMonthOS = requests.filter(r => {
      try { return isSameMonth(parseISO(r.createdAt || r.date), lastMonth); } catch { return false; }
    });
    const currentMonthRate = currentMonthOS.length > 0 ? (currentMonthOS.filter(r => r.status === 'Concluído').length / currentMonthOS.length) * 100 : 0;
    const lastMonthRate = lastMonthOS.length > 0 ? (lastMonthOS.filter(r => r.status === 'Concluído').length / lastMonthOS.length) * 100 : 0;
    const openOSList = requests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento');
    const totalDaysOpen = openOSList.reduce((acc, r) => {
      try { return acc + differenceInDays(now, parseISO(r.createdAt || r.date)); } catch { return acc; }
    }, 0);
    const avgLeadTime = openOSList.length > 0 ? totalDaysOpen / openOSList.length : 0;
    const preventiveCount = requests.filter(r => r.type === 'Preventiva' || r.status === 'Autorizado' || r.status === 'Concluído').length;
    return {
      resolutionRate,
      rateTrend: currentMonthRate - lastMonthRate,
      openOSCount: openOSList.length,
      avgLeadTime,
      preventiveRate: (preventiveCount / totalOS) * 100
    };
  }, [requests]);

  const chartsData = useMemo(() => {
    if (!Array.isArray(requests) || requests.length === 0) return null;
    const openRequests = requests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento');
    const categoryCounts: Record<string, number> = {};
    openRequests.forEach(r => {
      const type = r.type || 'Não Classificado';
      categoryCounts[type] = (categoryCounts[type] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    const monthlyEvolution = last6Months.map(d => {
      const monthRequests = requests.filter(r => {
        try { return isSameMonth(parseISO(r.createdAt || r.date), d); } catch { return false; }
      });
      return {
        name: format(d, 'MMM', { locale: ptBR }),
        abertas: monthRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length,
        concluidas: monthRequests.filter(r => r.status === 'Concluído').length
      };
    });
    const statusCounts: Record<string, number> = {};
    requests.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    const unitCounts: Record<string, { open: number; closed: number; total: number }> = {};
    requests.forEach(r => {
      const unit = r.unit || 'Sem Unidade';
      if (!unitCounts[unit]) unitCounts[unit] = { open: 0, closed: 0, total: 0 };
      if (r.status === 'Novo' || r.status === 'Em Andamento') unitCounts[unit].open++;
      if (r.status === 'Concluído') unitCounts[unit].closed++;
      unitCounts[unit].total++;
    });
    const unitDistribution = Object.entries(unitCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    return { topCategories, monthlyEvolution, statusDistribution, unitDistribution };
  }, [requests]);

  const criticalAlerts = useMemo(() => {
    if (!Array.isArray(requests) || requests.length === 0) return [];
    const now = new Date();
    return requestsWithDisplayId
      .filter(r => r.status === 'Novo' || r.status === 'Em Andamento')
      .map(r => ({
        ...r,
        diasEmAberto: (() => {
          try { return differenceInDays(now, parseISO(r.createdAt || r.date)); } catch { return 0; }
        })()
      }))
      .sort((a, b) => b.diasEmAberto - a.diasEmAberto)
      .slice(0, 5);
  }, [requestsWithDisplayId]);

  const ongoingRequests = useMemo(() => {
    return requestsWithDisplayId.filter(r => r.status === 'Em Andamento');
  }, [requestsWithDisplayId, requests]);

  const STATUS_COLORS: Record<string, string> = {
    'Novo': '#F59E0B', 'Em Andamento': '#3B82F6',
    'Concluído': '#10B981', 'Negado': '#EF4444', 'Autorizado': '#64748B'
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard Executivo">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard Executivo">
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
              <LayoutDashboard className="text-amber-500" size={28} />
              Visão Geral de Manutenção
            </h2>
            <p className="text-slate-900 font-bold uppercase text-xs tracking-widest mt-1">
              Indicadores de Performance — CAV/UFPE
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${syncMessage.startsWith('Erro') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
              >
                {syncMessage}
              </motion.div>
            )}
            <Link href="/solicitacoes">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border bg-white text-slate-900 border-slate-200 hover:border-amber-500 hover:text-amber-600">
                <Activity className="w-4 h-4" />
                Ver Solicitações
              </button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20"><CheckCircle2 size={20} /></div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${(kpis?.rateTrend ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {(kpis?.rateTrend ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(kpis?.rateTrend ?? 0).toFixed(1)}%
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Taxa de Resolução</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h4 className="text-3xl font-black text-slate-900 font-mono">{(kpis?.resolutionRate ?? 0).toFixed(1)}%</h4>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${(kpis?.resolutionRate ?? 0) >= 70 ? 'bg-emerald-100 text-emerald-700' : (kpis?.resolutionRate ?? 0) >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                {(kpis?.resolutionRate ?? 0) >= 70 ? 'Excelente' : (kpis?.resolutionRate ?? 0) >= 40 ? 'Regular' : 'Crítico'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">vs. mês anterior</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Clock size={20} /></div>
              {(kpis?.openOSCount ?? 0) > 10 && <div className="size-3 bg-rose-500 rounded-full animate-ping" />}
            </div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">OS em Aberto</p>
            <h4 className="text-3xl font-black text-slate-900 font-mono mt-1">{kpis?.openOSCount ?? 0}</h4>
            <p className={`text-[10px] font-black uppercase mt-2 ${(kpis?.openOSCount ?? 0) > 10 ? 'text-rose-600' : 'text-slate-500'}`}>
              {(kpis?.openOSCount ?? 0) > 10 ? 'Requerem atenção imediata' : 'Volume sob controle'}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl bg-amber-500 text-white flex items-center justify-center"><CalendarIcon size={20} /></div>
              <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${(kpis?.avgLeadTime ?? 0) <= 7 ? 'bg-emerald-50 text-emerald-700' : (kpis?.avgLeadTime ?? 0) <= 15 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                {(kpis?.avgLeadTime ?? 0) <= 7 ? 'Rápido' : (kpis?.avgLeadTime ?? 0) <= 15 ? 'Moderado' : 'Lento'}
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tempo Médio em Aberto</p>
            <h4 className="text-3xl font-black text-slate-900 font-mono mt-1">{(kpis?.avgLeadTime ?? 0).toFixed(1)} <span className="text-sm">dias</span></h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Média de dias em aberto</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl bg-slate-900 text-white flex items-center justify-center"><Activity size={20} /></div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{(kpis?.preventiveRate ?? 0).toFixed(0)}%</span>
            </div>
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Manutenção Preventiva</p>
            <div className="mt-3">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${kpis?.preventiveRate ?? 0}%` }} className="h-full bg-amber-500" />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">Corretiva</span>
                <span className="text-[9px] font-black text-amber-600 uppercase">Preventiva</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Top Categorias (OS Abertas)</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Distribuição por especialidade</p>
              </div>
              <BarChartIcon size={20} className="text-slate-300" />
            </div>
            <div className="h-64 w-full">
              {!chartsData || chartsData.topCategories.length === 0 ? (
                <div className="h-full flex items-center justify-center italic text-slate-500 text-xs">Nenhuma solicitação registrada</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.topCategories} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#0F172A', fontSize: 10, fontWeight: 900 }} width={100} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '10px', fontWeight: '900' }} />
                    <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Evolução Mensal</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Abertas vs. Concluídas (6 meses)</p>
              </div>
              <TrendingUp size={20} className="text-slate-300" />
            </div>
            <div className="h-64 w-full">
              {!chartsData ? (
                <div className="h-full flex items-center justify-center italic text-slate-500 text-xs">Nenhuma solicitação registrada</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData.monthlyEvolution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#0F172A', fontSize: 10, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#0F172A', fontSize: 10, fontWeight: 900 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '10px', fontWeight: '900' }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', paddingBottom: '20px' }} />
                    <Line type="monotone" dataKey="abertas" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="concluidas" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Distribuição por Status</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Visão geral do fluxo</p>
              </div>
              <PieChartIcon size={20} className="text-slate-300" />
            </div>
            <div className="h-64 w-full">
              {!chartsData ? (
                <div className="h-full flex items-center justify-center italic text-slate-500 text-xs">Nenhuma solicitação registrada</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartsData.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {chartsData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#CBD5E1'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '10px', fontWeight: '900' }} />
                    <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">OS por Unidade (Top 6)</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Abertas vs. Concluídas</p>
              </div>
              <Building2 size={20} className="text-slate-300" />
            </div>
            <div className="h-64 w-full">
              {!chartsData ? (
                <div className="h-full flex items-center justify-center italic text-slate-500 text-xs">Nenhuma solicitação registrada</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.unitDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#0F172A', fontSize: 9, fontWeight: 900 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#0F172A', fontSize: 9, fontWeight: 900 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '10px', fontWeight: '900' }} />
                    <Bar dataKey="open" name="Abertas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="closed" name="Concluídas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Critical Alerts Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="text-rose-500" size={18} />
                OS Críticas em Aberto
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Top 5 solicitações com maior tempo de espera</p>
            </div>
            <Link href="/solicitacoes" className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 hover:text-amber-600 transition-all border border-slate-200">
              Ver Todas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dias em Aberto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {criticalAlerts.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center italic text-slate-500 text-xs">Nenhuma OS crítica em aberto</td></tr>
                ) : criticalAlerts.map((req) => (
                  <tr key={req.id} className={`transition-colors ${req.diasEmAberto > 30 ? 'bg-rose-50/50 hover:bg-rose-50' : req.diasEmAberto > 15 ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">{req.displayId}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[300px]">{req.description}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{req.type}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{req.unit}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-black font-mono ${req.diasEmAberto > 30 ? 'text-rose-600' : req.diasEmAberto > 15 ? 'text-amber-600' : 'text-slate-900'}`}>{req.diasEmAberto} dias</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${req.status === 'Novo' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{req.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ongoing Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Activity className="text-blue-500" size={18} />
                OS em Andamento
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Solicitações que estão sendo executadas no momento</p>
            </div>
            <Link href="/solicitacoes" className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200">
              Ver Todas <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profissional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ongoingRequests.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center italic text-slate-500 text-xs">Nenhuma OS em andamento no momento</td></tr>
                ) : ongoingRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-blue-600 font-mono">{req.displayId}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[300px]">{req.description}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{req.type}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{format(parseISO(req.createdAt || req.date), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{req.unit}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {req.professionals && req.professionals.length > 0 ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-black uppercase">
                              {req.professionals[0].name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[120px]">
                              {req.professionals[0].name}
                              {req.professionals.length > 1 && ` +${req.professionals.length - 1}`}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Não atribuído</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
