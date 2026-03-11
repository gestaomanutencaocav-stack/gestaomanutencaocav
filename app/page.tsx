'use client';

import React from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';

const activities = [
  {
    title: 'Reparo de Ar-Condicionado Concluído',
    description: 'Prédio B, 3º Andar • Atribuído a João D.',
    time: 'Há 12 minutos',
    icon: CheckCircle2,
    color: 'emerald'
  },
  {
    title: 'Nova Solicitação Enviada',
    description: 'Inspeção emergencial no Elevador #4.',
    time: 'Há 45 minutos',
    icon: Plus,
    color: 'blue'
  },
  {
    title: 'Alerta de Estoque',
    description: 'Filtro Tipo-X esgotado no Armazém Central.',
    time: 'Há 2 horas',
    icon: AlertTriangle,
    color: 'amber'
  },
  {
    title: 'Técnico Despachado',
    description: 'Sara M. enviada para Hidráulica na Ala Norte.',
    time: 'Há 4 horas',
    icon: User,
    color: 'slate'
  }
];

export default function Dashboard() {
  const [user, setUser] = React.useState<{ role: string } | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [filterMonth, setFilterMonth] = React.useState('');
  const [filterYear, setFilterYear] = React.useState('');
  const [filterDate, setFilterDate] = React.useState('');

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));

    fetch('/api/solicitacoes')
      .then(res => res.json())
      .then(data => setRequests(data))
      .catch(() => setRequests([]));
  }, []);

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
    { name: 'Civil', value: categoriesMap['Civil'] || 0 },
    { name: 'Hidráulico', value: categoriesMap['Hidráulico'] || 0 },
    { name: 'Elétrico', value: categoriesMap['Elétrico'] || 0 },
    { name: 'Coberta', value: categoriesMap['Coberta'] || 0 },
    { name: 'Pintura', value: categoriesMap['Pintura'] || 0 },
    { name: 'Marcenaria', value: categoriesMap['Marcenaria'] || 0 },
  ];

  return (
    <DashboardLayout title="Visão Geral">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Bem-vindo, {user?.role === 'gestao' ? 'Gestor' : user?.role === 'encarregado' ? 'Encarregado' : 'Carregando...'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">Aqui está o resumo das atividades de hoje.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 px-2 border-r border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Data</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs outline-none text-slate-700 dark:text-slate-300 w-28"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <select 
              className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">Mês (Todos)</option>
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">Ano (Todos)</option>
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {(filterDate || filterMonth || filterYear) && (
              <button 
                onClick={() => { setFilterDate(''); setFilterMonth(''); setFilterYear(''); }}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase ml-2"
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
              className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`size-10 rounded-lg flex items-center justify-center ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                  stat.color === 'amber' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                  stat.color === 'rose' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  <stat.icon size={20} />
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                  stat.trend === 'up' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-rose-600 bg-rose-100 dark:bg-rose-900/30'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.title}</p>
              <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Charts & Feed Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Chart Area */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Status de Manutenção por Categoria</h3>
                  <p className="text-sm text-slate-500">Volume de ordens de serviço por especialidade</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg">Semana</button>
                  <button className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">Mês</button>
                </div>
              </div>
              
              <div className="flex items-end justify-between h-64 px-4 gap-4">
                {dynamicCategories.map((cat) => (
                  <div key={cat.name} className="flex flex-col items-center flex-1 gap-3 h-full justify-end group">
                    <div 
                      className={`w-full rounded-t-lg relative transition-all cursor-pointer ${
                        cat.value > 0 ? 'bg-blue-600' : 'bg-blue-600/10'
                      }`} 
                      style={{ height: `${Math.max((cat.value / (Math.max(...dynamicCategories.map(c => c.value)) || 1)) * 100, 5)}%` }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {cat.value} ordens
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight h-8 flex items-center">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Context Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-600 p-6 rounded-xl text-white shadow-lg shadow-blue-600/20">
                <h4 className="font-bold text-lg mb-2">Disponibilidade da Frota</h4>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 bg-white/20 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '88%' }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="bg-white h-full" 
                    />
                  </div>
                  <span className="font-bold">88%</span>
                </div>
                <p className="text-white/70 text-sm mt-3">2 veículos em oficina para manutenção preventiva.</p>
              </div>
              
              <div className="bg-slate-900 p-6 rounded-xl text-white border border-blue-500/20 shadow-xl">
                <h4 className="font-bold text-lg mb-2">Alertas de Estoque</h4>
                <div className="flex items-center gap-3 mt-4">
                  <AlertTriangle className="text-amber-400" size={24} />
                  <p className="text-sm">4 Peças críticas atingiram o nível mínimo de segurança.</p>
                </div>
                <button className="mt-4 text-xs font-bold text-blue-400 hover:text-blue-300 underline transition-colors">
                  Solicitar Insumos Agora
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Atividade Recente</h3>
              <button className="text-blue-600 text-xs font-bold hover:underline">Ver Tudo</button>
            </div>
            
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={index} className="flex gap-4 relative">
                  {index !== activities.length - 1 && (
                    <div className="absolute left-[11px] top-8 bottom-[-24px] w-[2px] bg-slate-200 dark:bg-slate-700" />
                  )}
                  <div className={`size-6 rounded-full flex items-center justify-center relative z-10 shadow-sm ${
                    activity.color === 'emerald' ? 'bg-emerald-500' :
                    activity.color === 'blue' ? 'bg-blue-600' :
                    activity.color === 'amber' ? 'bg-amber-500' :
                    'bg-slate-400'
                  }`}>
                    <activity.icon size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{activity.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.description}</p>
                    <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3 mb-2">
                <Info className="text-blue-600" size={18} />
                <h4 className="text-sm font-bold text-blue-600">Dica de Manutenção</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Agende inspeções de HVAC 2 semanas antes do pico do verão para reduzir chamados de emergência em até 30%.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
