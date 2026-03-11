'use client';

import React, { useState, useEffect } from 'react';
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
  Legend
} from 'recharts';
import { 
  Download, 
  FileSpreadsheet, 
  Filter, 
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RelatoriosPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  useEffect(() => {
    fetch('/api/solicitacoes')
      .then(res => res.json())
      .then(data => {
        setRequests(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredRequests = requests.filter(req => {
    const typeMatch = filterType === 'Todos' || req.type === filterType;
    const statusMatch = filterStatus === 'Todos' || req.status === filterStatus;
    return typeMatch && statusMatch;
  });

  // Data for Type Chart
  const typeData = Object.entries(
    filteredRequests.reduce((acc: Record<string, number>, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Data for Status Chart
  const statusData = Object.entries(
    filteredRequests.reduce((acc: Record<string, number>, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const exportToExcel = () => {
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
    
    // Generate buffer and download
    XLSX.writeFile(workbook, `Relatorio_Manutencao_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const stats = [
    { title: 'Total de Demandas', value: filteredRequests.length, icon: FileText, color: 'blue' },
    { title: 'Concluídas', value: filteredRequests.filter(r => r.status === 'Concluído' || r.status === 'Autorizado').length, icon: TrendingUp, color: 'emerald' },
    { title: 'Em Aberto', value: filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length, icon: Calendar, color: 'amber' },
  ];

  return (
    <DashboardLayout title="Relatórios e Estatísticas">
      <div className="space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Análise de Manutenção</h2>
            <p className="text-slate-500 dark:text-slate-400">Visualize o desempenho e exporte dados detalhados.</p>
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            <FileSpreadsheet size={20} />
            <span>Exportar Planilha (Excel)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-500 uppercase">Filtros:</span>
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Civil">Civil</option>
            <option value="Hidráulico">Hidráulico</option>
            <option value="Elétrico">Elétrico</option>
            <option value="Coberta">Coberta</option>
            <option value="Pintura">Pintura</option>
            <option value="Marcenaria">Marcenaria</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Novo">Novo</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Autorizado">Autorizado</option>
            <option value="Concluído">Concluído</option>
            <option value="Atrasado">Atrasado</option>
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                  stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                }`}>
                  <stat.icon size={24} />
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.title}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart: Requests by Type */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Demandas por Categoria</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Requests by Status */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieChartIcon size={20} className="text-emerald-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">Distribuição por Status</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">Prévia dos Dados</h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
              {filteredRequests.length} registros filtrados
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredRequests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">{req.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 truncate max-w-xs">{req.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{req.unit}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredRequests.length > 5 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500 italic">
                      ... e mais {filteredRequests.length - 5} registros. Clique em exportar para ver todos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
