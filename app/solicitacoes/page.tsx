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
    case 'Hidráulico': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'Elétrico': return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'Climatização': return 'bg-slate-50 text-slate-600 border-slate-100';
    case 'Civil': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'Marcenaria': return 'bg-orange-50 text-orange-600 border-orange-100';
    default: return 'bg-slate-50 text-slate-500 border-slate-100';
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
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight uppercase">Solicitações</h1>
            <p className="text-slate-500 font-medium mt-1">Gerencie e acompanhe todas as tarefas de manutenção das instalações</p>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-sm outline-none text-slate-600 font-mono"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="" className="bg-white">Mês (Todos)</option>
                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                  <option key={m} value={i + 1} className="bg-white">{m}</option>
                ))}
              </select>
              <select 
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-500 outline-none focus:ring-2 focus:ring-amber-500/50"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="" className="bg-white">Ano (Todos)</option>
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y} className="bg-white">{y}</option>
                ))}
              </select>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterMonth('');
                  setFilterYear('');
                }}
                className="px-3 py-2.5 text-slate-500 hover:text-amber-600 text-[10px] font-black uppercase tracking-widest transition-colors"
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
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Profissional</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-mono">Carregando solicitações...</td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-mono">Nenhuma solicitação encontrada.</td>
                  </tr>
                ) : filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">
                      <Link href={`/solicitacoes/${req.id}`}>
                        {req.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      <Link href={`/solicitacoes/${req.id}`} className="hover:text-amber-600 transition-colors">
                        {req.description}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium uppercase tracking-tight">{req.unit}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{req.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${getTypeColor(req.type)}`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          req.status === 'Em Andamento' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          req.status === 'Novo' ? 'bg-amber-300' :
                          req.status === 'Autorizado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          'bg-slate-300'
                        }`}></span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{req.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {req.professional ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 overflow-hidden relative border border-slate-200">
                            {req.avatar && (
                              <Image 
                                src={req.avatar} 
                                alt={req.professional} 
                                fill 
                                className="object-cover transition-all"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                          <span className="text-xs text-slate-600 font-bold tracking-tight">{req.professional}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
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
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Exibindo <span className="text-slate-900">1</span> a <span className="text-slate-900">{filteredRequests.length}</span> de <span className="text-slate-900">{filteredRequests.length}</span> solicitações
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-slate-200 rounded-lg bg-white text-slate-300 cursor-not-allowed">
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
    </DashboardLayout>
  );
}
