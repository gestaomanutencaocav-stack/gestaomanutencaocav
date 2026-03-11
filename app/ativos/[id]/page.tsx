'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Settings, 
  History, 
  Wrench, 
  Calendar, 
  Info, 
  Edit2, 
  Trash2, 
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Tag
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  statusColor: string;
  location: string;
  lastMaintenance: string;
  nextMaintenance: string;
  description?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
}

export default function AssetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Asset>>({});

  const fetchAsset = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/ativos/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data);
        setEditData(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/ativos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setIsEditing(false);
        fetchAsset();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este ativo?')) return;
    try {
      const res = await fetch(`/api/ativos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/ativos');
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Carregando Ativo...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Carregando dados técnicos...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!asset) {
    return (
      <DashboardLayout title="Ativo não encontrado">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Ativo não localizado no banco de dados.</p>
          <Link href="/ativos" className="text-amber-500 text-[10px] font-black uppercase tracking-widest hover:underline">Voltar para lista</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Ativo: ${asset.name}`}>
      <div className="max-w-6xl mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="flex flex-wrap justify-between items-start gap-6">
          <div className="space-y-2">
            <Link 
              href="/ativos" 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest mb-4"
            >
              <ChevronLeft size={14} />
              Voltar para Ativos
            </Link>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                asset.status === 'Operacional' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                asset.status === 'Manutenção' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-red-50 text-red-600 border-red-100'
              }`}>
                {asset.status}
              </span>
              <p className="text-slate-400 text-xs font-mono font-black">{asset.id}</p>
            </div>
            <h1 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-tight uppercase">
              {asset.name}
            </h1>
            <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1"><MapPin size={12} className="text-amber-600" /> {asset.location}</span>
              <span className="flex items-center gap-1"><Tag size={12} className="text-amber-600" /> {asset.type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              <Edit2 size={16} className="text-amber-600" />
              {isEditing ? 'Cancelar' : 'Editar Ativo'}
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {isEditing ? (
              <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Settings className="text-amber-600" size={18} />
                  Modo de Edição
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Ativo</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium"
                      value={editData.location}
                      onChange={(e) => setEditData({...editData, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium appearance-none"
                      value={editData.status}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                    >
                      <option className="bg-white">Operacional</option>
                      <option className="bg-white">Manutenção</option>
                      <option className="bg-white">Crítico</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium"
                      value={editData.type}
                      onChange={(e) => setEditData({...editData, type: e.target.value})}
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    onClick={handleUpdate}
                    className="w-full py-4 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Salvar Alterações Técnicas
                  </button>
                </div>
              </section>
            ) : (
              <>
                <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Info className="text-amber-600" size={18} />
                    Especificações Técnicas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Marca</p>
                      <p className="text-slate-900 text-sm font-bold">{asset.brand || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Modelo</p>
                      <p className="text-slate-900 text-sm font-bold">{asset.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Nº de Série</p>
                      <p className="text-slate-900 text-sm font-mono font-bold">{asset.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Ano Fab.</p>
                      <p className="text-slate-900 text-sm font-bold">2022</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Descrição Adicional</p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {asset.description || 'Nenhuma descrição técnica detalhada disponível para este ativo.'}
                    </p>
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History className="text-amber-600" size={18} />
                    Histórico de Manutenções
                  </h3>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-500/30 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <p className="text-slate-900 text-sm font-bold uppercase tracking-tight">Manutenção Preventiva Trimestral</p>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono">15/01/2026 • Técnico: Roberto Silva</p>
                          </div>
                        </div>
                        <button className="text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest">Ver Relatório</button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Status de Ciclo</h3>
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-2">Próxima Manutenção</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-amber-600" size={16} />
                    <p className="text-slate-900 text-lg font-black font-mono">{asset.nextMaintenance}</p>
                  </div>
                  <div className="mt-3 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-3/4 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">Faltam 12 dias</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Última Revisão</span>
                    <span className="text-slate-600 text-[10px] font-black font-mono">{asset.lastMaintenance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">MTBF Estimado</span>
                    <span className="text-slate-600 text-[10px] font-black font-mono">1.200h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">MTTR Médio</span>
                    <span className="text-slate-600 text-[10px] font-black font-mono">2.5h</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-black mb-6 text-slate-900 uppercase tracking-widest">Alertas de Telemetria</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                  <AlertTriangle className="text-red-500 shrink-0" size={14} />
                  <p className="text-[10px] text-red-600 font-bold leading-tight">Vibração acima do normal detectada no compressor principal.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <Clock className="text-amber-600 shrink-0" size={14} />
                  <p className="text-[10px] text-amber-600 font-bold leading-tight">Filtro de ar atingindo 80% da vida útil estimada.</p>
                </div>
              </div>
            </div>

            <button className="w-full py-4 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
              <Wrench size={18} />
              Solicitar Manutenção
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
