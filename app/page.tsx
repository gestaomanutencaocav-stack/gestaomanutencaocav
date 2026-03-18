'use client';

import React from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CheckSquare, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Info,
  User,
  AlertTriangle,
  BarChart,
  LineChart as LineChartIcon,
  Box,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart as ReBarChart,
  Bar,
  Cell
} from 'recharts';

// Consumption data is now dynamic and fetched from the API
import { motion } from 'motion/react';

export default function Dashboard() {
  const [user, setUser] = React.useState<{ role: string } | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [materialsEstoque, setMaterialsEstoque] = React.useState<any[]>([]);
  const [materialsFinalistico, setMaterialsFinalistico] = React.useState<any[]>([]);
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');
  const [filterDate, setFilterDate] = React.useState('');
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const fetchData = async () => {
    try {
      const timestamp = Date.now();
      const [authRes, reqRes, matEstRes, matFinRes] = await Promise.all([
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/solicitacoes?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/materials?type=estoque&t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/materials?type=finalistico&t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (authRes.ok) setUser(await authRes.json());
      if (reqRes.ok) {
        const data = await reqRes.json();
        console.log('Dashboard fetched requests:', data.length);
        setRequests(data);
      }
      if (matEstRes.ok) setMaterialsEstoque(await matEstRes.json());
      if (matFinRes.ok) setMaterialsFinalistico(await matFinRes.json());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync-forms', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`${data.imported} novas solicitações importadas`);
        fetchData(); // Refresh data
      } else {
        setSyncMessage(`Erro: ${data.error || 'Falha na sincronização'}`);
      }
    } catch (error) {
      setSyncMessage('Erro de conexão ao sincronizar');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const getConsumptionByMonth = (materials: any[]) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      let total = 0;
      materials.forEach(m => {
        const records = m.consumptionRecords || [];
        records.forEach((r: any) => {
          const d = new Date(r.date);
          if (d.getFullYear() === currentYear && d.getMonth() === index) {
            total += r.quantity * m.valorUnitario;
          }
        });
      });
      return { name: month, value: total };
    });
  };

  const estoqueChartData = React.useMemo(() => getConsumptionByMonth(materialsEstoque), [materialsEstoque]);
  const finalisticoChartData = React.useMemo(() => getConsumptionByMonth(materialsFinalistico), [materialsFinalistico]);

  const filteredRequests = requests.filter(req => {
    const reqDate = req.createdAt ? new Date(req.createdAt) : new Date();
    const matchesDate = !filterDate || (req.createdAt && req.createdAt.startsWith(filterDate));
    const matchesMonth = !filterMonth || (reqDate.getMonth() + 1).toString() === filterMonth;
    const matchesYear = !filterYear || reqDate.getFullYear().toString() === filterYear;
    return matchesDate && matchesMonth && matchesYear;
  });

  const dynamicStats = [
    { 
      title: 'Chamados Abertos', 
      value: filteredRequests.filter(r => r.status === 'Novo' || r.status === 'Em Andamento').length.toString(), 
      change: '+12%', 
      trend: 'up', 
      icon: Clock, 
      color: 'blue' 
    },
    { 
      title: 'Aguardando Aprovação', 
      value: filteredRequests.filter(r => r.status === 'Aguardando Aprovação').length.toString(), 
      change: '-2%', 
      trend: 'down', 
      icon: CheckCircle2, 
      color: 'amber' 
    },
    { 
      title: 'Serviços Atrasados', 
      value: filteredRequests.filter(r => r.status === 'Atrasado').length.toString(), 
      change: '+10%', 
      trend: 'up', 
      icon: AlertCircle, 
      color: 'rose' 
    },
    { 
      title: 'Concluídos', 
      value: filteredRequests.filter(r => r.status === 'Concluído' || r.status === 'Autorizado').length.toString(), 
      change: '+15%', 
      trend: 'up', 
      icon: CheckSquare, 
      color: 'emerald' 
    },
  ];

  const categoriesMap = filteredRequests.reduce((acc: any, req) => {
    acc[req.type] = (acc[req.type] || 0) + 1;
    return acc;
  }, {});

  const dynamicCategories = [
    { name: 'Geral', value: categoriesMap['Geral'] || 0 },
    { name: 'Civil', value: categoriesMap['Civil'] || 0 },
    { name: 'Hidráulico', value: categoriesMap['Hidráulico'] || 0 },
    { name: 'Elétrico', value: categoriesMap['Elétrico'] || 0 },
    { name: 'Climatização', value: categoriesMap['Climatização'] || 0 },
    { name: 'Marcenaria', value: categoriesMap['Marcenaria'] || 0 },
  ];

  const dynamicActivities = filteredRequests
    .slice(0, 6)
    .map(req => {
      let icon = CheckCircle2;
      let color = 'slate';
      
      switch (req.status) {
        case 'Novo':
          icon = Plus;
          color = 'blue';
          break;
        case 'Em Andamento':
          icon = Clock;
          color = 'amber';
          break;
        case 'Aguardando Aprovação':
          icon = AlertCircle;
          color = 'amber';
          break;
        case 'Autorizado':
          icon = ShieldCheck;
          color = 'emerald';
          break;
        case 'Negado':
          icon = ShieldAlert;
          color = 'rose';
          break;
        case 'Concluído':
          icon = CheckSquare;
          color = 'emerald';
          break;
        case 'Atrasado':
          icon = AlertTriangle;
          color = 'rose';
          break;
      }

      return {
        title: `Solicitação ${req.status}`,
        description: `${req.type} • ${req.description} • ${req.unit}`,
        time: req.date,
        icon,
        color
      };
    });

  return (
    <DashboardLayout title="Visão Geral">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Bem-vindo, {user?.role === 'gestao' ? 'Gestor Predial' : user?.role === 'encarregado' ? 'Encarregado de Manutenção' : 'Carregando...'}
            </h2>
            <p className="text-slate-500 font-medium">Aqui está o resumo das atividades de hoje.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            {syncMessage && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${syncMessage.startsWith('Erro') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
              >
                {syncMessage}
              </motion.div>
            )}
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-600'}`}
            >
              <FileSpreadsheet className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Forms'}
            </button>
            <div className="flex items-center gap-2 px-2 border-r border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs outline-none text-slate-600 w-28 font-mono"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <select 
              className="bg-transparent text-xs font-bold text-slate-500 outline-none cursor-pointer hover:text-amber-600 transition-colors"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="" className="bg-white">Mês (Todos)</option>
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                <option key={m} value={(i + 1).toString()} className="bg-white">{m}</option>
              ))}
            </select>
            <select 
              className="bg-transparent text-xs font-bold text-slate-500 outline-none cursor-pointer hover:text-amber-600 transition-colors"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="" className="bg-white">Ano (Todos)</option>
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y} className="bg-white">{y}</option>
              ))}
            </select>
            {(filterDate || filterMonth || filterYear) && (
              <button 
                onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(''); }}
                className="text-[10px] font-black text-amber-500 hover:text-amber-400 uppercase ml-2 tracking-widest"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl border border-slate-200 hover:border-amber-500/30 transition-all shadow-sm group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`size-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                  stat.color === 'blue' || stat.color === 'amber' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                  stat.color === 'rose' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                  'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                }`}>
                  <stat.icon size={20} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter ${
                  stat.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.title}</p>
              <p className="text-3xl font-black mt-1 text-slate-900 font-mono tracking-tighter">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Charts & Feed Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Chart Area */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Status de Manutenção por Categoria</h3>
                  <p className="text-sm text-slate-500 font-medium">Volume de ordens de serviço por especialidade</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-500 text-white rounded-lg shadow-lg shadow-amber-500/20">Semana</button>
                  <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">Mês</button>
                </div>
              </div>
              
              <div className="flex items-end justify-between h-64 px-4 gap-4">
                {dynamicCategories.map((cat) => (
                  <div key={cat.name} className="flex flex-col items-center flex-1 gap-3 h-full justify-end group">
                    <div 
                      className={`w-full rounded-t-lg relative transition-all cursor-pointer ${
                        cat.value > 0 ? 'bg-amber-500 shadow-sm' : 'bg-slate-100'
                      }`} 
                      style={{ height: `${Math.max((cat.value / (Math.max(...dynamicCategories.map(c => c.value)) || 1)) * 100, 5)}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 uppercase tracking-widest">
                        {cat.value} ordens
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase text-center leading-tight h-8 flex items-center tracking-tighter">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials Consumption Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Estoque Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <LineChartIcon className="text-amber-600" size={20} />
                      Consumo Mensal: Estoque
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">Consumo em R$ de materiais em estoque</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={estoqueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorEstoque" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                        contentStyle={{ 
                          backgroundColor: '#FFF', 
                          border: '1px solid #E2E8F0', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Consumo"
                        stroke="#F59E0B" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorEstoque)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Finalistico Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <LineChartIcon className="text-slate-900" size={20} />
                      Consumo Mensal: Finalísticos
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">Consumo em R$ de materiais finalísticos</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={finalisticoChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorFinalistico" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#0F172A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 900 }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                        contentStyle={{ 
                          backgroundColor: '#FFF', 
                          border: '1px solid #E2E8F0', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        name="Consumo"
                        stroke="#0F172A" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorFinalistico)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Additional Context Card */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative group">
                <div className="absolute top-0 right-0 p-4 text-amber-500/10 group-hover:text-amber-500/20 transition-colors">
                  <AlertTriangle size={48} />
                </div>
                <h4 className="font-black text-lg mb-2 uppercase tracking-tight text-slate-900">Alertas de Estoque</h4>
                <div className="flex items-center gap-3 mt-4">
                  <AlertTriangle className="text-amber-600" size={24} />
                  <p className="text-sm font-medium text-slate-600">4 Peças críticas atingiram o nível mínimo de segurança.</p>
                </div>
                <button className="mt-4 text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest underline underline-offset-4 transition-colors">
                  Solicitar Insumos Agora
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Atividade Recente</h3>
              <Link href="/solicitacoes" className="text-amber-600 text-[10px] font-black uppercase tracking-widest hover:underline">Ver Tudo</Link>
            </div>
            
            <div className="space-y-6">
              {dynamicActivities.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-400 text-xs font-medium italic">Nenhuma atividade recente registrada.</p>
                </div>
              ) : dynamicActivities.map((activity, index) => (
                <div key={index} className="flex gap-4 relative">
                  {index !== dynamicActivities.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-[-24px] w-[1px] bg-slate-100" />
                  )}
                  <div className={`size-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ${
                    activity.color === 'emerald' ? 'bg-emerald-500' :
                    activity.color === 'blue' ? 'bg-amber-500' :
                    activity.color === 'amber' ? 'bg-amber-500' :
                    activity.color === 'rose' ? 'bg-rose-500' :
                    'bg-slate-400'
                  }`}>
                    <activity.icon size={12} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 tracking-tight">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{activity.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-black font-mono tracking-widest">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <div className="flex items-center gap-3 mb-2">
                <Info className="text-amber-500" size={18} />
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Dica de Manutenção</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Agende inspeções de HVAC 2 semanas antes do pico do verão para reduzir chamados de emergência em até 30%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
