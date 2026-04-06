'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RequestModal from '@/components/RequestModal';
import { 
  Search, 
  Plus, 
  Building2, 
  Activity, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Hammer,
  ShieldCheck,
  ShieldAlert,
  X,
  Trash2,
  Clock,
  CheckCircle,
  CheckCheck,
  XCircle
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Professional {
  name: string;
  role: string;
}

interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  date: string;
  createdAt: string;
  type: string;
  status: string;
  statusColor: string;
  professionals: (string | Professional)[];
  avatar: string | null;
  displayId?: string;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Hidráulico': return 'bg-blue-50 text-slate-900 border-blue-100';
    case 'Elétrico': return 'bg-amber-50 text-slate-900 border-amber-100';
    case 'Climatização': return 'bg-slate-50 text-slate-900 border-slate-100';
    case 'Civil': return 'bg-emerald-50 text-slate-900 border-emerald-100';
    case 'Marcenaria': return 'bg-orange-50 text-slate-900 border-orange-100';
    default: return 'bg-slate-50 text-slate-900 border-slate-100';
  }
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Auth Modal State for Quick Action
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<'Autorizado' | 'Negado'>('Autorizado');
  const [authName, setAuthName] = useState('');
  const [authPosition, setAuthPosition] = useState('');
  const [authJustification, setAuthJustification] = useState('');
  const [authUrgency, setAuthUrgency] = useState<'Baixa' | 'Média' | 'Alta' | 'Emergencial'>('Média');

  const fetchRequests = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const [reqRes, userRes] = await Promise.all([
        fetch(`/api/solicitacoes?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/auth/me?t=${timestamp}`, { cache: 'no-store' })
      ]);
      
      if (reqRes.ok) {
        const data = await reqRes.json();
        console.log('Fetched requests:', data.length);
        setRequests(data);
      } else {
        const errorData = await reqRes.json();
        console.error('Failed to fetch requests:', errorData);
        alert('Erro ao carregar solicitações. Por favor, recarregue a página.');
      }
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserRole(userData.role);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      alert('Erro de conexão ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthSubmit = async () => {
    if (!selectedRequestId || !authName || !authPosition) return;
    
    try {
      const res = await fetch(`/api/solicitacoes/${selectedRequestId}`, {
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
        setSelectedRequestId(null);
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
    try {
      const res = await fetch(`/api/solicitacoes/${id}`, { 
        method: 'DELETE',
        cache: 'no-store'
      });
      if (res.ok) {
        await fetchRequests();
      } else {
        alert('Erro ao excluir a solicitação.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao excluir a solicitação.');
    }
  };

  const filteredRequests = React.useMemo(() => {
    // Group all requests by year to calculate sequential IDs
    const groupedByYear: { [year: string]: MaintenanceRequest[] } = {};
    requests.forEach(req => {
      const year = new Date(req.createdAt || req.date).getFullYear().toString();
      if (!groupedByYear[year]) groupedByYear[year] = [];
      groupedByYear[year].push(req);
    });

    // Assign sequential IDs within each year
    const requestsWithDisplayId = requests.map(req => {
      const year = new Date(req.createdAt || req.date).getFullYear().toString();
      const yearRequests = groupedByYear[year].sort((a, b) => 
        new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
      );
      const index = yearRequests.findIndex(r => r.id === req.id);
      const sequence = (index + 1).toString().padStart(2, '0');
      return { ...req, displayId: `${sequence}/${year}` };
    });

        return requestsWithDisplayId.filter(req => {
          const matchesSearch = req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (req.professionals && req.professionals.some(p => {
              if (typeof p === 'string') return p.toLowerCase().includes(searchTerm.toLowerCase());
              return p.name.toLowerCase().includes(searchTerm.toLowerCase());
            }));
      
      const reqDate = req.createdAt ? new Date(req.createdAt) : new Date();
      
      const matchesDate = !filterDate || (req.createdAt && req.createdAt.startsWith(filterDate));
      const matchesMonth = !filterMonth || (reqDate.getMonth() + 1).toString() === filterMonth;
      const matchesYear = !filterYear || reqDate.getFullYear().toString() === filterYear;
      const matchesType = filterType === 'Todos' || req.type === filterType;
      const matchesStatus = filterStatus === 'Todos' || req.status === filterStatus;

      return matchesSearch && matchesDate && matchesMonth && matchesYear && matchesType && matchesStatus;
    });
  }, [requests, searchTerm, filterDate, filterMonth, filterYear, filterType, filterStatus]);

  return (
    <DashboardLayout title="Solicitações de Manutenção">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-widest uppercase">Solicitações</h1>
            <p className="text-slate-800 font-medium mt-1">Gerencie e acompanhe todas as tarefas de manutenção das instalações</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus size={20} />
            <span>Nova Solicitação</span>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400" 
                  placeholder="Buscar por ID, descrição ou profissional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Data</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm outline-none text-slate-800 font-mono"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="" className="bg-white text-slate-700">Mês (Todos)</option>
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={m} value={i + 1} className="bg-white text-slate-800">{m}</option>
                ))}
              </select>
              <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="" className="bg-white text-slate-700">Ano (Todos)</option>
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y} className="bg-white text-slate-800">{y}</option>
                ))}
              </select>
              <select 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="Todos">Tipo (Todos)</option>
                {['Civil', 'Hidráulico', 'Elétrico', 'Coberta', 'Pintura', 'Marcenaria'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="Todos">Status (Todos)</option>
                {['Novo', 'Em Andamento', 'Autorizado', 'Concluído', 'Negado'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterMonth('');
                  setFilterYear('');
                  setFilterType('Todos');
                  setFilterStatus('Todos');
                }}
                className="px-3 py-2.5 text-slate-700 hover:text-amber-600 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest min-w-[200px]">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest">Profissionais</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-700 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-700 font-mono">Carregando solicitações...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-700 font-mono">Nenhuma solicitação encontrada.</td>
                  </tr>
                ) : filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">
                      <Link href={`/solicitacoes/${req.id}`}>
                        {req.displayId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">
                      <Link href={`/solicitacoes/${req.id}`} className="hover:text-amber-600 transition-colors">
                        {req.description}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-medium uppercase tracking-tight">{req.unit}</td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-mono">{req.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${getTypeColor(req.type)}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'Pendente' || req.status === 'Novo' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-700 border border-yellow-200">
                          <Clock size={12} />
                          Pendente
                        </span>
                      ) : req.status === 'Autorizado' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} />
                          Autorizado
                        </span>
                      ) : req.status === 'Em Andamento' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200">
                          <Wrench size={12} />
                          Em Andamento
                        </span>
                      ) : req.status === 'Concluído' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 border border-slate-200">
                          <CheckCheck size={12} />
                          Concluído
                        </span>
                      ) : req.status === 'Cancelado' || req.status === 'Negado' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-700 border border-red-200">
                          <XCircle size={12} />
                          {req.status === 'Negado' ? 'Cancelado' : req.status}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            req.status === 'Em Andamento' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                            req.status === 'Novo' ? 'bg-amber-300' :
                            req.status === 'Autorizado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            'bg-slate-300'
                          }`}></span>
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{req.status}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {req.professionals && req.professionals.length > 0 ? (
                        <span className="text-xs text-slate-800 font-bold tracking-tight">
                          {req.professionals.map(p => typeof p === 'string' ? p : p.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold tracking-tight">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {userRole && req.status === 'Novo' && (
                          <div className="flex gap-1 mr-2">
                            <button 
                              onClick={() => { 
                                setSelectedRequestId(req.id); 
                                setAuthAction('Autorizado'); 
                                setIsAuthModalOpen(true); 
                              }}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors border border-emerald-100"
                              title="Autorizar"
                            >
                              <ShieldCheck size={16} />
                            </button>
                            <button 
                              onClick={() => { 
                                setSelectedRequestId(req.id); 
                                setAuthAction('Negado'); 
                                setIsAuthModalOpen(true); 
                              }}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition-colors border border-rose-100"
                              title="Negar"
                            >
                              <ShieldAlert size={16} />
                            </button>
                          </div>
                        )}
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors text-slate-700 hover:text-red-500 border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-200">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-200">
            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
              Exibindo <span className="text-slate-900 font-black">1</span> a <span className="text-slate-900 font-black">{filteredRequests.length}</span> de <span className="text-slate-900 font-black">{filteredRequests.length}</span> solicitações
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-slate-200 rounded-lg bg-white text-slate-800 cursor-not-allowed">
                <ChevronLeft size={18} />
              </button>
              <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-500 text-white font-black text-xs">1</button>
              <button className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:border-amber-500/50 hover:text-amber-600 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <RequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchRequests} 
      />

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
                  <h3 className={`text-lg font-black tracking-widest uppercase ${
                    authAction === 'Autorizado' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {authAction === 'Autorizado' ? 'Autorizar Ordem de Serviço' : 'Negar Ordem de Serviço'}
                  </h3>
                  <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Autenticação do Servidor Responsável</p>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Nome do Agente</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Seu nome completo"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Cargo / Função</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Ex: Gestor de Manutenção"
                      value={authPosition}
                      onChange={(e) => setAuthPosition(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Nível de Urgência</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Baixa', 'Média', 'Alta', 'Emergencial'].map((u) => (
                      <button
                        key={u}
                        onClick={() => setAuthUrgency(u as any)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          authUrgency === u 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 font-black' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2">Justificativa (Opcional)</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all min-h-[100px] placeholder:text-slate-400"
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
