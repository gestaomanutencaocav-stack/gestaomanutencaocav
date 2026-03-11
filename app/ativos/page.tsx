'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench,
  MapPin,
  Tag
} from 'lucide-react';
import { Asset } from '@/lib/store';

import Link from 'next/link';

export default function AtivosPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState<Omit<Asset, 'id'>>({
    name: '',
    category: 'Infraestrutura',
    location: '',
    status: 'Operacional',
    lastMaintenance: new Date().toISOString().split('T')[0],
    nextMaintenance: new Date().toISOString().split('T')[0],
    description: '',
    serialNumber: '',
    brand: '',
    model: '',
  });

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/ativos');
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ativo?')) return;
    try {
      const res = await fetch(`/api/ativos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAssets();
      } else {
        alert('Erro ao excluir ativo.');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAsset),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAssets();
        setNewAsset({
          name: '',
          category: 'Infraestrutura',
          location: '',
          status: 'Operacional',
          lastMaintenance: new Date().toISOString().split('T')[0],
          nextMaintenance: new Date().toISOString().split('T')[0],
          description: '',
          serialNumber: '',
          brand: '',
          model: '',
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operacional': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Em Manutenção': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Crítico': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  return (
    <DashboardLayout title="Gestão de Ativos">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight uppercase">Ativos</h1>
            <p className="text-slate-500 font-medium mt-1">Controle de equipamentos e infraestrutura do campus</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus size={20} />
            <span>Novo Ativo</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-300" 
              placeholder="Buscar ativos por nome, local ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-mono italic">Carregando ativos...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-mono italic">Nenhum ativo encontrado.</div>
          ) : filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-amber-500/30 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg transition-transform group-hover:scale-110 ${
                  asset.status === 'Operacional' ? 'bg-emerald-50 text-emerald-600' :
                  asset.status === 'Em Manutenção' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  <Package size={24} />
                </div>
                <button 
                  onClick={() => handleDelete(asset.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">{asset.name}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getStatusColor(asset.status)}`}>
                  {asset.status}
                </span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <Tag size={12} />
                  {asset.category}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <MapPin size={14} className="text-slate-400" />
                  <span>{asset.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <Wrench size={14} className="text-slate-400" />
                  <span>Próxima: {new Date(asset.nextMaintenance).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="text-[10px] text-slate-400 font-black font-mono uppercase tracking-widest">ID: {asset.id}</div>
                <Link 
                  href={`/ativos/${asset.id}`}
                  className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest transition-colors"
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Asset Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Cadastrar Novo Ativo</h2>
            </div>
            <form onSubmit={handleAddAsset} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome do Ativo</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 placeholder:text-slate-300"
                  value={newAsset.name}
                  onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoria</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900"
                    value={newAsset.category}
                    onChange={e => setNewAsset({...newAsset, category: e.target.value})}
                  >
                    <option className="bg-white">Infraestrutura</option>
                    <option className="bg-white">Equipamento</option>
                    <option className="bg-white">Mobiliário</option>
                    <option className="bg-white">Veículo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900"
                    value={newAsset.status}
                    onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
                  >
                    <option className="bg-white">Operacional</option>
                    <option className="bg-white">Em Manutenção</option>
                    <option className="bg-white">Crítico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marca</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 placeholder:text-slate-300"
                    placeholder="Ex: Carrier"
                    value={newAsset.brand}
                    onChange={e => setNewAsset({...newAsset, brand: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 placeholder:text-slate-300"
                    placeholder="Ex: X-Power"
                    value={newAsset.model}
                    onChange={e => setNewAsset({...newAsset, model: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nº de Série</label>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 placeholder:text-slate-300 font-mono"
                  placeholder="Ex: SN-123456"
                  value={newAsset.serialNumber}
                  onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localização</label>
                <input 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 placeholder:text-slate-300"
                  value={newAsset.location}
                  onChange={e => setNewAsset({...newAsset, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Próxima Manutenção</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-900 font-mono"
                  value={newAsset.nextMaintenance}
                  onChange={e => setNewAsset({...newAsset, nextMaintenance: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
