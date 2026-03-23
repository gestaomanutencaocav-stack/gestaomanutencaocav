'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Box,
  DollarSign,
  Package,
  ArrowRight,
  MinusCircle,
  Calendar,
  X,
  Plus,
  Edit2,
  Trash2,
  History,
  Check,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConsumptionRecord {
  date: string;
  quantity: number;
}

interface Material {
  id?: string;
  codigo: string;
  descricao: string;
  unidadeMedida: string;
  quantidadeGeral: number;
  valorUnitario: number;
  valorTotal: number;
  saldoInicial: number;
  saldoAtual: number;
  consumptionRecords: ConsumptionRecord[];
}

interface MaterialsManagerProps {
  title: string;
  description: string;
  type: 'estoque' | 'finalistico';
}

export default function MaterialsManager({ title, description, type }: MaterialsManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [consumptionQty, setConsumptionQty] = useState('');
  const [consumptionDate, setConsumptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);
  
  const [editingUnitValueId, setEditingUnitValueId] = useState<string | null>(null);
  const [tempUnitValue, setTempUnitValue] = useState('');
  
  // Monetary Correction State
  const [correctionPercentage, setCorrectionPercentage] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [correctionHistory, setCorrectionHistory] = useState<any[]>([]);
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/price-corrections?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setCorrectionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, [type]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  }, [type]);

  React.useEffect(() => {
    fetchMaterials();
    if (type === 'finalistico') {
      fetchHistory();
    }
  }, [fetchMaterials, fetchHistory, type]);

  const handleApplyCorrection = async () => {
    if (!correctionPercentage || isApplyingCorrection) return;
    
    setIsApplyingCorrection(true);
    try {
      const res = await fetch('/api/price-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          percentage: Number(correctionPercentage),
          appliedBy: 'Sistema'
        }),
      });

      if (res.ok) {
        await fetchMaterials();
        await fetchHistory();
        setIsConfirmModalOpen(false);
        setIsPreviewModalOpen(false);
        setCorrectionPercentage('');
        alert(`Correção de ${correctionPercentage}% aplicada com sucesso!`);
      } else {
        const err = await res.json();
        alert(`Erro ao aplicar correção: ${err.error}`);
      }
    } catch (error) {
      console.error('Error applying correction:', error);
      alert('Erro ao aplicar correção monetária.');
    } finally {
      setIsApplyingCorrection(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Falha ao ler o arquivo.");

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!jsonData || jsonData.length === 0) {
          alert("A planilha parece estar vazia.");
          setIsUploading(false);
          return;
        }

        const findKey = (item: any, possibleKeys: string[]) => {
          const keys = Object.keys(item);
          // Try exact match first
          let found = keys.find(k => possibleKeys.some(pk => k.toLowerCase() === pk.toLowerCase()));
          if (found) return found;
          // Then try partial match
          return keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
        };

        const parseCurrency = (val: any) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          // Remove R$, spaces, and handle PT-BR format (1.250,50 -> 1250.50)
          const clean = String(val)
            .replace(/R\$/g, '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
          return Number(clean) || 0;
        };

        const mappedData: any[] = jsonData
          .map((item) => {
            const codigoKey = findKey(item, ['código', 'codigo', 'cod', 'id']);
            const descricaoKey = findKey(item, ['descrição', 'descricao', 'material', 'item', 'nome']);
            const unidadeKey = findKey(item, ['unidade', 'u.m', 'um', 'medida']);
            const quantidadeKey = findKey(item, ['quantidade', 'qtd', 'quant']);
            const valorUnitarioKey = findKey(item, ['valor unitário', 'valor unitario', 'vlr unit', 'preço', 'preco']);
            const saldoInicialKey = findKey(item, ['saldo inicial', 'inicial']);
            const saldoAtualKey = findKey(item, ['saldo atual', 'atual', 'saldo']);
            const valorTotalKey = findKey(item, ['valor total', 'vlr total']);

            const codigo = String(item[codigoKey || ''] || '').trim();
            const descricao = String(item[descricaoKey || ''] || '').trim();

            if (!codigo || !descricao) return null;

            const sInicial = parseCurrency(item[saldoInicialKey || ''] || 0);
            const sAtual = parseCurrency(item[saldoAtualKey || ''] || item[quantidadeKey || ''] || sInicial || 0);
            const unitVal = parseCurrency(item[valorUnitarioKey || ''] || 0);
            const vTotal = parseCurrency(item[valorTotalKey || ''] || (sAtual * unitVal));

            return {
              codigo,
              descricao,
              unidadeMedida: String(item[unidadeKey || ''] || 'UN'),
              quantidadeGeral: sInicial || sAtual,
              valorUnitario: unitVal,
              valorTotal: vTotal,
              saldoInicial: sInicial || sAtual,
              saldoAtual: sAtual,
              type: type,
              consumptionRecords: []
            };
          })
          .filter(Boolean);

        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materials: mappedData }),
        });

        if (res.ok) {
          await fetchMaterials();
          alert("Importação concluída com sucesso!");
        } else {
          const err = await res.json();
          const msg = err.details ? `${err.error} (${err.details})` : err.error;
          alert(`Erro ao importar: ${msg || 'Erro desconhecido'}`);
        }
      } catch (error: any) {
        console.error('Error processing file:', error);
        alert(`Erro ao processar arquivo: ${error.message}`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleAddConsumption = async () => {
    if (!selectedMaterial || !consumptionQty || !consumptionDate || !selectedMaterial.id) return;

    const qty = Number(consumptionQty);
    if (isNaN(qty) || qty <= 0) return;

    let newRecords = [...(selectedMaterial.consumptionRecords || [])];
    let newSaldoAtual = selectedMaterial.saldoAtual;

    if (editingRecordIndex !== null) {
      // Editing an existing record
      const oldQty = newRecords[editingRecordIndex].quantity;
      newRecords[editingRecordIndex] = { date: consumptionDate, quantity: qty };
      newSaldoAtual = selectedMaterial.saldoAtual + oldQty - qty;
    } else {
      // Adding a new record
      newRecords.push({ date: consumptionDate, quantity: qty });
      newSaldoAtual = selectedMaterial.saldoAtual - qty;
    }

    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldoAtual: newSaldoAtual,
          valorTotal: newSaldoAtual * selectedMaterial.valorUnitario,
          consumptionRecords: newRecords
        }),
      });

      if (res.ok) {
        fetchMaterials();
        setIsConsumptionModalOpen(false);
        setEditingRecordIndex(null);
        setSelectedMaterial(null);
        setConsumptionQty('');
      }
    } catch (error) {
      console.error('Error updating consumption:', error);
    }
  };

  const handleDeleteConsumption = async (index: number) => {
    if (!selectedMaterial || !selectedMaterial.id) return;
    if (!confirm('Tem certeza que deseja excluir este registro de saída?')) return;

    const recordToDelete = selectedMaterial.consumptionRecords[index];
    const newRecords = selectedMaterial.consumptionRecords.filter((_, i) => i !== index);
    const newSaldoAtual = selectedMaterial.saldoAtual + recordToDelete.quantity;

    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldoAtual: newSaldoAtual,
          valorTotal: newSaldoAtual * selectedMaterial.valorUnitario,
          consumptionRecords: newRecords
        }),
      });

      if (res.ok) {
        // Update local state for the modal to reflect changes immediately if possible
        const updatedMaterial = { 
          ...selectedMaterial, 
          saldoAtual: newSaldoAtual, 
          consumptionRecords: newRecords 
        };
        setSelectedMaterial(updatedMaterial);
        fetchMaterials();
      }
    } catch (error) {
      console.error('Error deleting consumption:', error);
    }
  };

  const handleUpdateUnitValue = async (material: Material) => {
    if (!material.id) return;
    const newVal = Number(tempUnitValue.replace(',', '.'));
    if (isNaN(newVal)) return;

    try {
      const res = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorUnitario: newVal,
          valorTotal: material.saldoAtual * newVal
        }),
      });

      if (res.ok) {
        fetchMaterials();
        setEditingUnitValueId(null);
      }
    } catch (error) {
      console.error('Error updating unit value:', error);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials
      .filter(m => {
        const matchesSearch = m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.descricao.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        if (selectedMonth !== 0) {
          return m.consumptionRecords.some(record => {
            const date = parseISO(record.date);
            return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
          });
        }

        return true;
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  }, [materials, searchTerm, selectedMonth, selectedYear]);

  const monthStats = useMemo(() => {
    let totalConsumedValue = 0;
    let totalConsumedQty = 0;

    materials.forEach(m => {
      const monthConsumption = m.consumptionRecords.filter(record => {
        const date = parseISO(record.date);
        const isYearMatch = date.getFullYear() === selectedYear;
        const isMonthMatch = selectedMonth === 0 || date.getMonth() + 1 === selectedMonth;
        return isYearMatch && isMonthMatch;
      });

      const qty = monthConsumption.reduce((acc, curr) => acc + curr.quantity, 0);
      totalConsumedQty += qty;
      totalConsumedValue += qty * m.valorUnitario;
    });

    return { totalConsumedValue, totalConsumedQty };
  }, [materials, selectedMonth, selectedYear]);

  const totalValueInStock = materials.reduce((acc, curr) => acc + (curr.saldoAtual * curr.valorUnitario), 0);
  const totalItemsInStock = materials.reduce((acc, curr) => acc + curr.saldoAtual, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-widest uppercase">{title}</h1>
          <p className="text-slate-800 font-bold mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".xlsx, .xls, .csv"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Upload size={18} className={`${isUploading ? 'animate-bounce' : 'text-amber-600'}`} />
            <span>{isUploading ? 'Processando...' : 'Importar Planilha'}</span>
          </button>
        </div>
      </div>

      {/* Monetary Correction Section */}
      {type === 'finalistico' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <h2 className="text-slate-900 text-lg font-black uppercase tracking-widest">Correção Monetária</h2>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[280px]">
                <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Percentual de Ajuste</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-12 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    placeholder="Ex: 10.5 para aumento ou -5.2 para redução"
                    value={correctionPercentage}
                    onChange={(e) => setCorrectionPercentage(e.target.value)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-800">%</div>
                </div>
                {correctionPercentage && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-[10px] font-black uppercase tracking-widest mt-2 ${Number(correctionPercentage) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {Number(correctionPercentage) >= 0 ? `Aumento de ${correctionPercentage}%` : `Redução de ${Math.abs(Number(correctionPercentage))}%`}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsPreviewModalOpen(true)}
                  disabled={!correctionPercentage || isNaN(Number(correctionPercentage))}
                  className="px-6 py-3 bg-white border border-amber-500 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Visualizar Impacto
                </button>
                <button 
                  onClick={() => setIsConfirmModalOpen(true)}
                  disabled={!correctionPercentage || isNaN(Number(correctionPercentage))}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aplicar Correção
                </button>
              </div>
            </div>

            {/* History Toggle */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                <History size={14} />
                <span>Histórico de Correções</span>
                <ChevronRight size={14} className={`transition-transform ${!isHistoryCollapsed ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {!isHistoryCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-2">
                      {correctionHistory.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic font-bold uppercase tracking-widest py-4">Nenhuma correção aplicada anteriormente.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                                <th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Percentual</th>
                                <th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Itens Afetados</th>
                                <th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {correctionHistory.map((h) => (
                                <tr key={h.id} className="text-[10px] font-bold text-slate-700">
                                  <td className="py-2">{format(parseISO(h.appliedAt), 'dd/MM/yyyy HH:mm')}</td>
                                  <td className={`py-2 ${h.percentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {h.percentage > 0 ? '+' : ''}{h.percentage}%
                                  </td>
                                  <td className="py-2">{h.itemsAffected} itens</td>
                                  <td className="py-2">{h.appliedBy}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Package size={20} />
              </div>
              <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Estoque Atual (Itens)</p>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">{totalItemsInStock}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign size={20} />
              </div>
              <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Valor em Estoque</p>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValueInStock)}
            </p>
          </div>
          <div className="bg-amber-500 p-6 rounded-xl text-white shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingDown size={20} />
              </div>
              <p className="text-white text-[10px] font-black uppercase tracking-widest">
                Consumo {selectedMonth === 0 ? 'no Ano' : 'no Mês Selecionado'}
              </p>
            </div>
            <p className="text-2xl font-black font-mono">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthStats.totalConsumedValue)}
            </p>
            <p className="text-[10px] font-black mt-1 uppercase tracking-widest">
              {monthStats.totalConsumedQty} unidades retiradas
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
          <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Filtro de Período</p>
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              <option value={0}>Todos os Meses</option>
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400" 
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest min-w-[200px]">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">U.M.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Saldo Inicial</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">V. Unitário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">V. Total (Saldo)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">
                  Consumo {selectedMonth === 0 ? 'no Ano' : 'no Mês'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-800 font-mono italic">
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-800 font-mono italic">
                    {materials.length === 0 ? 'Faça upload de uma planilha para visualizar os dados.' : 'Nenhum item encontrado para a busca.'}
                  </td>
                </tr>
              ) : filteredMaterials.map((item) => {
                const monthConsumption = item.consumptionRecords.filter(record => {
                  const date = parseISO(record.date);
                  const isYearMatch = date.getFullYear() === selectedYear;
                  const isMonthMatch = selectedMonth === 0 || date.getMonth() + 1 === selectedMonth;
                  return isYearMatch && isMonthMatch;
                }).reduce((acc, curr) => acc + curr.quantity, 0);

                return (
                  <tr key={item.codigo} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">{item.codigo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.descricao}</td>
                    <td className="px-6 py-4 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest">{item.unidadeMedida}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-800 font-mono">{item.saldoInicial}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                        item.saldoAtual < item.saldoInicial * 0.2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {item.saldoAtual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 font-mono">
                      {editingUnitValueId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input 
                            type="text"
                            className="w-20 bg-white border border-amber-300 rounded px-1 py-0.5 text-right outline-none focus:ring-1 focus:ring-amber-500"
                            value={tempUnitValue}
                            onChange={(e) => setTempUnitValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateUnitValue(item);
                              if (e.key === 'Escape') setEditingUnitValueId(null);
                            }}
                          />
                          <button onClick={() => handleUpdateUnitValue(item)} className="text-emerald-600 hover:text-emerald-700">
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 group/val">
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}</span>
                          <button 
                            onClick={() => {
                              setEditingUnitValueId(item.id || null);
                              setTempUnitValue(item.valorUnitario.toString());
                            }}
                            className="opacity-0 group-hover/val:opacity-100 text-slate-700 hover:text-amber-600 transition-opacity"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-black text-slate-900 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.saldoAtual * item.valorUnitario)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-black font-mono ${monthConsumption > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {monthConsumption}
                        </span>
                        {monthConsumption > 0 && (
                          <span className="text-[9px] text-slate-800 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthConsumption * item.valorUnitario)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedMaterial(item);
                            setIsHistoryModalOpen(true);
                          }}
                          className="p-2 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all border border-slate-200"
                          title="Ver Histórico"
                        >
                          <History size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedMaterial(item);
                            setConsumptionQty('');
                            setConsumptionDate(format(new Date(), 'yyyy-MM-dd'));
                            setEditingRecordIndex(null);
                            setIsConsumptionModalOpen(true);
                          }}
                          className="p-2 bg-slate-50 text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-slate-200 hover:border-amber-200"
                          title="Registrar Saída"
                        >
                          <MinusCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumption Modal */}
      <AnimatePresence>
        {isConsumptionModalOpen && selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConsumptionModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                    {editingRecordIndex !== null ? 'Editar Saída' : 'Registrar Saída'}
                  </h3>
                  <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p>
                </div>
                <button onClick={() => {
                  setIsConsumptionModalOpen(false);
                  setEditingRecordIndex(null);
                }} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Quantidade de Saída</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                    <input 
                      type="number"
                      step="any"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-16 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all"
                      placeholder="Ex: 5"
                      value={consumptionQty}
                      onChange={(e) => setConsumptionQty(e.target.value)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800 uppercase tracking-widest">
                      {selectedMaterial.unidadeMedida}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-800 mt-2 font-medium italic">
                    Saldo disponível: {selectedMaterial.saldoAtual} {selectedMaterial.unidadeMedida}
                    {editingRecordIndex !== null && ` (Original: ${selectedMaterial.consumptionRecords[editingRecordIndex].quantity})`}
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Data da Saída</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all font-mono"
                      value={consumptionDate}
                      onChange={(e) => setConsumptionDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => {
                      setIsConsumptionModalOpen(false);
                      setEditingRecordIndex(null);
                    }}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAddConsumption}
                    disabled={!consumptionQty || !consumptionDate || Number(consumptionQty) <= 0 || (editingRecordIndex === null && Number(consumptionQty) > Number(selectedMaterial.saldoAtual))}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingRecordIndex !== null ? 'Salvar Alteração' : 'Confirmar Saída'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Histórico de Saídas</h3>
                  <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                {selectedMaterial.consumptionRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-700 italic text-sm">Nenhum registro de saída encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {selectedMaterial.consumptionRecords
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900">{format(parseISO(record.date), 'dd/MM/yyyy')}</p>
                              <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Data da Retirada</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm font-black text-amber-600 font-mono">{record.quantity} {selectedMaterial.unidadeMedida}</p>
                              <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Quantidade</p>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  const realIdx = selectedMaterial.consumptionRecords.indexOf(record);
                                  setEditingRecordIndex(realIdx);
                                  setConsumptionQty(record.quantity.toString());
                                  setConsumptionDate(record.date);
                                  setIsHistoryModalOpen(false);
                                  setIsConsumptionModalOpen(true);
                                }}
                                className="p-2 text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  const realIdx = selectedMaterial.consumptionRecords.indexOf(record);
                                  handleDeleteConsumption(realIdx);
                                }}
                                className="p-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Correction Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Preview de Impacto ({correctionPercentage}%)</h3>
                  <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Visualização dos primeiros 10 itens</p>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Código</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Descrição</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Valor Atual</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Novo Valor</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Diferença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.slice(0, 10).map((m) => {
                        const factor = 1 + (Number(correctionPercentage) / 100);
                        const newValue = m.valorUnitario * factor;
                        const diff = newValue - m.valorUnitario;
                        return (
                          <tr key={m.codigo} className="text-xs font-bold text-slate-700">
                            <td className="px-4 py-3 font-mono text-amber-600">{m.codigo}</td>
                            <td className="px-4 py-3">{m.descricao}</td>
                            <td className="px-4 py-3 text-right font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valorUnitario)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newValue)}</td>
                            <td className={`px-4 py-3 text-right font-mono ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {diff > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diff)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Total Atual</p>
                    <p className="text-lg font-black text-slate-900 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValueInStock)}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Total Após Correção</p>
                    <p className="text-lg font-black text-slate-900 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValueInStock * (1 + Number(correctionPercentage) / 100))}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Diferença Total</p>
                    <p className="text-lg font-black text-amber-600 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValueInStock * (Number(correctionPercentage) / 100))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Fechar Preview
                </button>
                <button 
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setIsConfirmModalOpen(true);
                  }}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                >
                  Aplicar Correção
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isApplyingCorrection && setIsConfirmModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmar Correção</h3>
                <p className="text-sm text-slate-600 font-bold mb-6">
                  Você está prestes a aplicar uma correção de <span className={Number(correctionPercentage) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{correctionPercentage}%</span> em todos os <span className="text-slate-900">{materials.length}</span> itens.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-left">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Exemplo de Impacto:</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Atual</p>
                      <p className="text-sm font-black text-slate-700 font-mono">R$ 100,00</p>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 mx-2" />
                    <div className="text-center flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Novo</p>
                      <p className="text-sm font-black text-emerald-600 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(100 * (1 + Number(correctionPercentage) / 100))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-left mb-6">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase tracking-wider">
                    Esta ação alterará o valor unitário de todos os {materials.length} itens da lista. Esta operação não pode ser desfeita automaticamente.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsConfirmModalOpen(false)}
                    disabled={isApplyingCorrection}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleApplyCorrection}
                    disabled={isApplyingCorrection}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isApplyingCorrection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Aplicando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirmar Correção</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
