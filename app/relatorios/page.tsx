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
  Area
} from 'recharts';
import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, startOfDay, endOfDay, differenceInMinutes, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

const COLORS = ['#f59e0b', '#10b981', '#64748b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];
const SLATE_COLOR = '#64748b';
const AMBER_COLOR = '#f59e0b';
const EMERALD_COLOR = '#10b981';
const RED_COLOR = '#ef4444';

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'inspecoes'>('solicitacoes');
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Maintenance Filters
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterUnit, setFilterUnit] = useState('Todos');

  // Inspection Filters
  const [inspPeriod, setInspPeriod] = useState('month');
  const [inspArea, setInspArea] = useState('Todos');
  const [inspPeriodicity, setInspPeriodicity] = useState('Todos');
  const [inspStatus, setInspStatus] = useState('Todos');
  const [inspProfessional, setInspProfessional] = useState('Todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reqRes, inspRes, recRes] = await Promise.all([
          fetch('/api/solicitacoes').then(res => res.json()),
          fetch('/api/inspecoes').then(res => res.json()),
          fetch('/api/inspecoes/records').then(res => res.json())
        ]);
        setRequests(reqRes || []);
        setInspections(inspRes || []);
        setRecords(recRes || []);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Maintenance Logic ---
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const typeMatch = filterType === 'Todos' || req.type === filterType;
      const statusMatch = filterStatus === 'Todos' || req.status === filterStatus;
      const unitMatch = filterUnit === 'Todos' || req.unit === filterUnit;
      return typeMatch && statusMatch && unitMatch;
    });
  }, [requests, filterType, filterStatus, filterUnit]);

  const units = useMemo(() => {
    const u = Array.from(new Set(requests.map(r => r.unit))).filter(Boolean);
    return ['Todos', ...u.sort()];
  }, [requests]);

  const typeData = useMemo(() => {
    return Object.entries(
      filteredRequests.reduce((acc: Record<string, number>, req) => {
        acc[req.type] = (acc[req.type] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  const statusData = useMemo(() => {
    return Object.entries(
      filteredRequests.reduce((acc: Record<string, number>, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  // --- Inspection Logic ---
  const enrichedRecords = useMemo(() => {
    return records.map(rec => {
      const inspection = inspections.find(i => i.id === rec.inspectionId);
      
      // Calculate execution time
      let execTime = 0;
      if (rec.startTime && rec.endTime) {
        try {
          // If they are full ISO strings
          const start = parseISO(rec.startTime);
          const end = parseISO(rec.endTime);
          if (isValid(start) && isValid(end)) {
            execTime = differenceInMinutes(end, start);
          } else {
            // If they are just "HH:mm" strings, we use the executionDate
            const dateStr = rec.executionDate.split('T')[0];
            const startFull = parseISO(`${dateStr}T${rec.startTime}`);
            const endFull = parseISO(`${dateStr}T${rec.endTime}`);
            if (isValid(startFull) && isValid(endFull)) {
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
      // Period filter
      let dateMatch = true;
      const recDate = parseISO(rec.executionDate);
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
          start: startOfDay(parseISO(customStartDate)), 
          end: endOfDay(parseISO(customEndDate)) 
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

  // KPIs Calculations
  const inspKPIs = useMemo(() => {
    const now = new Date();
    const currentMonthRecords = enrichedRecords.filter(r => {
      const d = parseISO(r.executionDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalProblemsFound = currentMonthRecords.reduce((sum, r) => sum + (r.problemsFound || 0), 0);
    const totalProblemsResolved = currentMonthRecords.reduce((sum, r) => sum + (r.problemsResolved || 0), 0);
    const totalProblemsPending = enrichedRecords.reduce((sum, r) => sum + (r.problemsPending || 0), 0);
    
    const realizedCount = currentMonthRecords.filter(r => r.executionStatus === 'Concluído').length;
    // Mocking predicted for now
    const predictedCount = Math.max(realizedCount + 2, 10); 
    const complianceRate = (realizedCount / predictedCount) * 100;

    const delayedCount = inspections.filter(i => i.status === 'Atrasado').length;
    const avgExecutionTime = enrichedRecords.length > 0 
      ? enrichedRecords.reduce((sum, r) => sum + (r.executionTime || 0), 0) / enrichedRecords.length 
      : 0;

    return {
      totalRegistered: inspections.length,
      realizedThisMonth: realizedCount,
      complianceRate: complianceRate.toFixed(1),
      problemsFound: totalProblemsFound,
      problemsResolved: totalProblemsResolved,
      problemsPending: totalProblemsPending,
      delayed: delayedCount,
      avgTime: Math.round(avgExecutionTime)
    };
  }, [inspections, enrichedRecords]);

  // Chart 1: Realized vs Predicted (Last 6 months)
  const realizedVsPredictedData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const monthRecords = enrichedRecords.filter(r => {
        const d = parseISO(r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      const realized = monthRecords.filter(r => r.executionStatus === 'Concluído').length;
      const predicted = realized + Math.floor(Math.random() * 5); // Mocked predicted
      data.push({ name: monthName, realizada: realized, prevista: predicted });
    }
    return data;
  }, [enrichedRecords]);

  // Chart 2: Distribution by Area
  const areaDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    inspections.forEach(insp => {
      distribution[insp.area] = (distribution[insp.area] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [inspections]);

  // Chart 3: Top Areas with Problems
  const topProblemAreasData = useMemo(() => {
    const problemCounts: Record<string, number> = {};
    enrichedRecords.forEach(rec => {
      problemCounts[rec.area] = (problemCounts[rec.area] || 0) + (rec.problemsFound || 0);
    });
    return Object.entries(problemCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [enrichedRecords]);

  // Chart 4: Compliance Evolution (Last 12 months)
  const complianceEvolutionData = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const realized = enrichedRecords.filter(r => {
        const d = parseISO(r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear() && r.executionStatus === 'Concluído';
      }).length;
      const predicted = realized + 2; // Mocked
      const rate = (realized / predicted) * 100;
      data.push({ name: monthName, taxa: Math.round(rate) });
    }
    return data;
  }, [enrichedRecords]);

  // Chart 5: Problems Status over time
  const problemsStatusData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM', { locale: ptBR });
      const monthRecords = enrichedRecords.filter(r => {
        const d = parseISO(r.executionDate);
        return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
      });
      const found = monthRecords.reduce((s, r) => s + (r.problemsFound || 0), 0);
      const resolved = monthRecords.reduce((s, r) => s + (r.problemsResolved || 0), 0);
      const pending = monthRecords.reduce((s, r) => s + (r.problemsPending || 0), 0);
      data.push({ name: monthName, encontrados: found, resolvidos: resolved, pendentes: pending });
    }
    return data;
  }, [enrichedRecords]);

  // --- Export Functions ---
  const exportToExcel = () => {
    if (activeTab === 'solicitacoes') {
      const worksheet = XLSX.utils.json_to_sheet(filteredRequests.map(req => ({
        'ID': req.id,
        'Descrição': req.description,
        'Unidade': req.unit,
        'Servidor Responsável': req.responsibleServer || 'N/A',
        'Data': req.date,
        'Tipo': req.type,
        'Status': req.status,
        'Profissional': req.professional || 'Não Atribuído'
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitações");
      XLSX.writeFile(workbook, `Relatorio_Manutencao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else {
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: KPIs
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

      // Sheet 2: Inspections List
      const wsInsp = XLSX.utils.json_to_sheet(inspections.map(i => ({
        'Nome': i.name,
        'Área': i.area,
        'Periodicidade': i.periodicity,
        'Status': i.status,
        'Próxima Data': i.nextDate
      })));
      XLSX.utils.book_append_sheet(workbook, wsInsp, "Lista de Inspeções");

      // Sheet 3: Execution History
      const wsHist = XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
        'Inspeção': r.inspectionName,
        'Área': r.area,
        'Data': format(parseISO(r.executionDate), 'dd/MM/yyyy'),
        'Profissionais': r.professionals.join(', '),
        'Status': r.executionStatus,
        'Problemas Enc.': r.problemsFound,
        'Problemas Res.': r.problemsResolved,
        'Problemas Pend.': r.problemsPending,
        'Tempo (min)': r.executionTime
      })));
      XLSX.utils.book_append_sheet(workbook, wsHist, "Histórico de Execuções");

      XLSX.writeFile(workbook, `Relatorio_Inspecoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    // Temporarily show all records for export if they are hidden
    const prevShowAllRequests = showAllRequests;
    const prevShowAllRecords = showAllRecords;
    
    if (activeTab === 'solicitacoes') setShowAllRequests(true);
    else setShowAllRecords(true);

    // Wait for state update and re-render
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reportRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#f8fafc' // slate-50
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        // If the report is longer than one A4 page, we might need multiple pages
        // But for simplicity in this dashboard view, we'll just scale it to fit or add pages
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Relatorio_${activeTab === 'solicitacoes' ? 'Manutencao' : 'Inspecoes'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
      } finally {
        // Restore previous state
        setShowAllRequests(prevShowAllRequests);
        setShowAllRecords(prevShowAllRecords);
      }
    }, 500);
  };

  const clearFilters = () => {
    if (activeTab === 'solicitacoes') {
      setFilterType('Todos');
      setFilterStatus('Todos');
      setFilterUnit('Todos');
    } else {
      setInspPeriod('month');
      setInspArea('Todos');
      setInspPeriodicity('Todos');
      setInspStatus('Todos');
      setInspProfessional('Todos');
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  return (
    <DashboardLayout title="Relatórios e Estatísticas">
      <div className="space-y-8 pb-12">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-widest text-slate-900 dark:text-white uppercase">Relatórios do Sistema</h2>
            <p className="text-slate-700 dark:text-slate-400 font-medium">Análise detalhada de desempenho e exportação de dados.</p>
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`px-6 py-3 text-sm font-black tracking-widest uppercase transition-all relative cursor-pointer ${
              activeTab === 'solicitacoes' 
                ? 'text-blue-600' 
                : 'text-slate-700 hover:text-slate-900'
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
              activeTab === 'inspecoes' 
                ? 'text-amber-600' 
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Rotinas de Inspeções
            {activeTab === 'inspecoes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-amber-600 rounded-t-full" />
            )}
          </button>
        </div>

        <div ref={reportRef} className="space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'solicitacoes' ? (
              <motion.div
                key="solicitacoes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Maintenance Filters */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtros</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Categoria</label>
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos">Todas</option>
                      <option value="Civil">Civil</option>
                      <option value="Hidráulico">Hidráulico</option>
                      <option value="Elétrico">Elétrico</option>
                      <option value="Coberta">Coberta</option>
                      <option value="Pintura">Pintura</option>
                      <option value="Marcenaria">Marcenaria</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Status</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Todos">Todos</option>
                      <option value="Novo">Novo</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Autorizado">Autorizado</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Unidade</label>
                    <select 
                      value={filterUnit}
                      onChange={(e) => setFilterUnit(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={clearFilters}
                    className="mt-auto mb-1 text-xs font-bold text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>

                {/* Maintenance Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: 'Total de Demandas', value: filteredRequests.length, icon: FileText, color: 'blue' },
                    { title: 'Concluídas', value: filteredRequests.filter(r => r.status === 'Concluído' || r.status === 'Autorizado').length, icon: CheckCircle2, color: 'emerald' },
                    { title: 'Em Aberto', value: filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length, icon: Clock, color: 'amber' },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${
                          stat.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                          stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                          'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                        }`}>
                          <stat.icon size={24} />
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-400 text-xs font-black uppercase tracking-widest">{stat.title}</p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Maintenance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-blue-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Demandas por Categoria</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <PieChartIcon size={20} className="text-emerald-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Distribuição por Status</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            formatter={(value) => <span className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-tighter">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-blue-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Resumo de Análise</h3>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">
                        Com base nos dados filtrados, observamos que a categoria <span className="font-black text-blue-600">
                          {typeData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}
                        </span> é a que possui maior volume de solicitações, representando <span className="font-black">
                          {filteredRequests.length > 0 ? Math.round((typeData.sort((a, b) => b.value - a.value)[0]?.value / filteredRequests.length) * 100) : 0}%
                        </span> do total.
                      </p>
                      <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">
                        Atualmente, <span className="font-black text-amber-600">
                          {filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length}
                        </span> solicitações estão aguardando resolução, o que requer atenção da equipe técnica para evitar atrasos no cronograma.
                      </p>
                    </div>
                  </div>

                  {/* Maintenance Detailed Table */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Listagem Detalhada de Solicitações</h3>
                      <span className="text-[10px] font-black text-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                        {filteredRequests.length} registros encontrados
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">ID / Data</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Descrição</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Unidade</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Tipo</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Profissional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {filteredRequests.length > 0 ? (
                            (showAllRequests ? filteredRequests : filteredRequests.slice(0, 10)).map((req) => (
                              <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-900 dark:text-white">#{req.id.slice(-4)}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{format(parseISO(req.date), 'dd/MM/yyyy')}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{req.description}</p>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">{req.unit}</td>
                                <td className="px-6 py-4">
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg uppercase tracking-widest">
                                    {req.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                    req.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                    req.status === 'Atrasado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">
                                  {req.professional || <span className="italic opacity-50">Não atribuído</span>}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-slate-700 font-medium italic">
                                Nenhuma solicitação encontrada para os filtros aplicados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredRequests.length > 10 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                        <button 
                          onClick={() => setShowAllRequests(!showAllRequests)}
                          className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                        >
                          {showAllRequests ? 'Ver menos' : 'Ver todos os registros'} <ArrowRight size={14} className={showAllRequests ? 'rotate-180' : ''} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inspecoes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Inspection Filters */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center shadow-sm">
                  <div className="flex items-center gap-2 mr-2">
                    <Filter size={18} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtros</span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Período</label>
                    <select 
                      value={inspPeriod}
                      onChange={(e) => setInspPeriod(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
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
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Início</label>
                        <input 
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Fim</label>
                        <input 
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Área</label>
                    <select 
                      value={inspArea}
                      onChange={(e) => setInspArea(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Todos">Todas</option>
                      <option value="Elétrica">Elétrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="Civil">Civil</option>
                      <option value="Ar Condicionado">Ar Condicionado</option>
                      <option value="Segurança">Segurança</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Periodicidade</label>
                    <select 
                      value={inspPeriodicity}
                      onChange={(e) => setInspPeriodicity(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Todos">Todas</option>
                      <option value="Diária">Diária</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Profissional</label>
                    <select 
                      value={inspProfessional}
                      onChange={(e) => setInspProfessional(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {allProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={clearFilters}
                    className="mt-auto mb-1 text-xs font-bold text-slate-700 hover:text-slate-900 underline underline-offset-4 cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>

                {/* Inspection KPIs */}
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
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          kpi.color === 'slate' ? 'bg-slate-100 text-slate-600 dark:bg-slate-900/30' :
                          kpi.color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                          kpi.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                          kpi.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                          'bg-red-100 text-red-600 dark:bg-red-900/30'
                        }`}>
                          <kpi.icon size={16} />
                        </div>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-widest leading-tight">{kpi.title}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Inspection Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Chart 1: Realized vs Predicted */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-amber-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Realizadas vs Previstas (6 Meses)</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={realizedVsPredictedData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                            cursor={{ fill: '#f1f5f9' }}
                          />
                          <Legend iconType="circle" />
                          <Bar name="Previstas" dataKey="prevista" fill={SLATE_COLOR} radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar name="Realizadas" dataKey="realizada" fill={AMBER_COLOR} radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Distribution by Area */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <PieChartIcon size={20} className="text-blue-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Distribuição por Área</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={areaDistributionData}
                            cx="40%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {areaDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                          />
                          <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                            iconType="circle"
                            formatter={(value) => <span className="text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-tighter">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Top Problem Areas */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <BarChart3 size={20} className="text-red-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Ranking de Problemas por Área</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={topProblemAreasData}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} width={100} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                          />
                          <Bar dataKey="value" fill={RED_COLOR} radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 4: Compliance Evolution */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <TrendingUp size={20} className="text-emerald-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Evolução da Conformidade (12 Meses)</h3>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={complianceEvolutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="taxa" 
                            stroke={EMERALD_COLOR} 
                            strokeWidth={4} 
                            dot={{ r: 6, fill: EMERALD_COLOR, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 5: Problems Status Stacked */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-8">
                      <Activity size={20} className="text-slate-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Status de Problemas por Mês</h3>
                    </div>
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={problemsStatusData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700 }}
                          />
                          <Legend iconType="circle" />
                          <Bar name="Resolvidos" dataKey="resolvidos" stackId="a" fill={EMERALD_COLOR} radius={[0, 0, 0, 0]} />
                          <Bar name="Pendentes" dataKey="pendentes" stackId="a" fill={AMBER_COLOR} radius={[0, 0, 0, 0]} />
                          <Bar name="Encontrados" dataKey="encontrados" stackId="a" fill={RED_COLOR} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={20} className="text-amber-600" />
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Análise de Desempenho Operacional</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">
                          A taxa de conformidade atual é de <span className="font-black text-emerald-600">{inspKPIs.complianceRate}%</span>. 
                          A área de <span className="font-black text-red-600">{topProblemAreasData[0]?.name || 'N/A'}</span> apresenta o maior índice de problemas detectados, sugerindo a necessidade de uma revisão preventiva mais profunda ou substituição de componentes críticos.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">
                          O tempo médio de execução das inspeções é de <span className="font-black text-blue-600">{inspKPIs.avgTime} minutos</span>. 
                          Manter este indicador sob controle é fundamental para garantir que todas as rotinas diárias sejam cumpridas sem sobrecarregar a equipe.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Inspection Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Histórico Detalhado de Execuções</h3>
                    <span className="text-[10px] font-black text-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
                      {filteredRecords.length} registros encontrados
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Inspeção</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Área</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Profissional</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest text-center">Probs. (E/R/P)</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">Tempo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredRecords.length > 0 ? (
                          (showAllRecords ? filteredRecords : filteredRecords.slice(0, 10)).map((rec) => (
                            <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">{rec.inspectionName}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-tighter">{rec.area}</td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">
                                {format(parseISO(rec.executionDate), 'dd/MM/yyyy')}
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">{rec.professionals.join(', ')}</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{rec.problemsFound}</span>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">{rec.problemsResolved}</span>
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">{rec.problemsPending}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                  rec.executionStatus === 'Concluído' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                  rec.executionStatus === 'Atrasado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30'
                                }`}>
                                  {rec.executionStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-400">{rec.executionTime} min</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-700 font-medium italic">
                              Nenhum registro encontrado para os filtros aplicados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredRecords.length > 10 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                      <button 
                        onClick={() => setShowAllRecords(!showAllRecords)}
                        className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                      >
                        {showAllRecords ? 'Ver menos' : 'Ver todos os registros'} <ArrowRight size={14} className={showAllRecords ? 'rotate-180' : ''} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
