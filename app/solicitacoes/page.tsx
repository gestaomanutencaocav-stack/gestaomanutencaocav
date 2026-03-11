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
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MaintenanceRequest {
  id: string;
  description: string;
  unit: string;
  date: string;
  createdAt: string;
  type: string;
  status: string;
  statusColor: string;
  professional: string | null;
  avatar: string | null;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Hidráulico': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'Elétrico': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'Climatização': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    case 'Civil': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'Marcenaria': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
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

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/solicitacoes?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.professional?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const reqDate = req.createdAt ? new Date(req.createdAt) : new Date();
    
    const matchesDate = !filterDate || (req.createdAt && req.createdAt.startsWith(filterDate));
    const matchesMonth = !filterMonth || (reqDate.getMonth() + 1).toString() === filterMonth;
    const matchesYear = !filterYear || reqDate.getFullYear().toString() === filterYear;

    return matchesSearch && matchesDate && matchesMonth && matchesYear;
  });

  return (
    <DashboardLayout title="Solicitações de Manutenção">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">Solicitações</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie e acompanhe todas as tarefas de manutenção das instalações</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            <span>Nova Solicitação</span>
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all" 
                  placeholder="Buscar por ID, descrição ou profissional..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-xs font-bold text-slate-400 uppercase">Data</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-slate-300"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600/20"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">Mês (Todos)</option>
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select 
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600/20"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">Ano (Todos)</option>
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterMonth('');
                  setFilterYear('');
                }}
                className="px-3 py-2.5 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px]">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unidade Demandante</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profissional</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Carregando solicitações...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Nenhuma solicitação encontrada.</td>
                  </tr>
                ) : filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">
                      <Link href={`/solicitacoes/${req.id}`}>
                        {req.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      <Link href={`/solicitacoes/${req.id}`} className="hover:text-blue-600 transition-colors">
                        {req.description}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{req.unit}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{req.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(req.type)}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          req.status === 'Em Andamento' ? 'bg-amber-500' :
                          req.status === 'Novo' ? 'bg-blue-600' :
                          req.status === 'Autorizado' ? 'bg-emerald-500' :
                          'bg-slate-400'
                        }`}></span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{req.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {req.professional ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                            {req.avatar && (
                              <Image 
                                src={req.avatar} 
                                alt={req.professional} 
                                fill 
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-300">{req.professional}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-slate-400 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Exibindo <span className="font-medium text-slate-900 dark:text-white">1</span> a <span className="font-medium text-slate-900 dark:text-white">{filteredRequests.length}</span> de <span className="font-medium text-slate-900 dark:text-white">{filteredRequests.length}</span> solicitações
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-400 cursor-not-allowed">
                <ChevronLeft size={20} />
              </button>
              <button className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">1</button>
              <button className="p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-blue-600 transition-all">
                <ChevronRight size={20} />
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
    </DashboardLayout>
  );
}
