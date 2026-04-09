'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
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
  Edit2,
  Edit3,
  Trash2,
  History,
  Check,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Download,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ConsumptionRecord {
  date: string;
  quantity: number;
  month?: number;
  year?: number;
}

interface PriceHistory {
  id: string;
  materialId: string;
  materialCodigo: string;
  referenceMonth: number;
  referenceYear: number;
  unitPrice: number;
  previousPrice: number | null;
  variationPercent: number | null;
  justification: string | null;
  materialType: string;
  createdAt: string;
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
  priceVariation?: number;
  isHistoricalPrice?: boolean;
  averageMonthlyConsumption?: number;
}

interface MaterialsManagerProps {
  title: string;
  description: string;
  type: 'estoque' | 'finalistico';
}

// Extrai mês e ano de um ConsumptionRecord considerando os campos month/year e o campo date
function getRecordMonthYear(r: ConsumptionRecord): { month: number | null; year: number | null } {
  if (r.month != null && r.year != null) return { month: r.month, year: r.year };
  if (r.date) {
    try {
      const d = parseISO(r.date);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    } catch { return { month: null, year: null }; }
  }
  return { month: null, year: null };
}

export default function MaterialsManager({ title, description, type }: MaterialsManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // selectedMonth = 0 significa "Todo Ano" (sem filtro de mês)
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [consumptionQty, setConsumptionQty] = useState('');
  const [consumptionDate, setConsumptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingRecordIndex, setEditingRecordIndex] = useState<number | null>(null);
  const [editingUnitValueId, setEditingUnitValueId] = useState<string | null>(null);
  const [tempUnitValue, setTempUnitValue] = useState('');

  // Edição inline de consumo — usa refs para evitar stale closure
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const editingCellRef = useRef<string | null>(null);
  const editingValueRef = useRef<string>('');
  const materialsRef = useRef<Material[]>([]);

  // Mantém materialsRef sincronizado com o state
  React.useEffect(() => {
    materialsRef.current = materials;
  }, [materials]);

  const setEditingCellWithRef = useCallback((val: string | null) => {
    editingCellRef.current = val;
    setEditingCell(val);
  }, []);

  const setEditingValueWithRef = useCallback((val: string) => {
    editingValueRef.current = val;
    setEditingValue(val);
  }, []);

  // Price History
  const [isPriceUpdateModalOpen, setIsPriceUpdateModalOpen] = useState(false);
  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [newPrice, setNewPrice] = useState('');
  const [priceJustification, setPriceJustification] = useState('');
  const [refMonth, setRefMonth] = useState(new Date().getMonth() + 1);
  const [refYear, setRefYear] = useState(new Date().getFullYear());
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Monetary Correction
  const [correctionPercentage, setCorrectionPercentage] = useState('');
  const [correctionStartDate, setCorrectionStartDate] = useState('');
  const [correctionEndDate, setCorrectionEndDate] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [correctionHistory, setCorrectionHistory] = useState<any[]>([]);
  const [isApplyingCorrection, setIsApplyingCorrection] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/price-corrections?type=${type}`);
      if (res.ok) setCorrectionHistory(await res.json());
    } catch (e) { console.error(e); }
  }, [type]);

  // Sempre busca todos os materiais — sem filtro de mês na API
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/materials?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [type]);

  React.useEffect(() => {
    fetchMaterials();
    if (type === 'finalistico') fetchHistory();
  }, [fetchMaterials, fetchHistory, type]);

  // Calcula consumo de um material no mês/ano selecionado
  const getMonthConsumption = useCallback((item: Material): number => {
    if (!Array.isArray(item.consumptionRecords)) return 0;
    return item.consumptionRecords
      .filter(r => {
        const { month, year } = getRecordMonthYear(r);
        if (selectedMonth === 0) return year === selectedYear;
        return month === selectedMonth && year === selectedYear;
      })
      .reduce((acc, r) => acc + r.quantity, 0);
  }, [selectedMonth, selectedYear]);

  // filteredMaterials:
  // - se mês selecionado (selectedMonth > 0): mostra apenas materiais com consumo > 0 naquele mês
  // - se "Todo Ano" (selectedMonth === 0): mostra todos
  // - sempre aplica filtro de busca por texto
  const filteredMaterials = useMemo(() => {
    return materials
      .filter(m => {
        const matchesSearch =
          m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.descricao.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (selectedMonth > 0) {
          // Só mostra se tiver consumo no mês selecionado
          const hasConsumption = Array.isArray(m.consumptionRecords) &&
            m.consumptionRecords.some(r => {
              const { month, year } = getRecordMonthYear(r);
              return month === selectedMonth && year === selectedYear && r.quantity > 0;
            });
          return hasConsumption;
        }

        return true; // "Todo Ano" — mostra todos
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  }, [materials, searchTerm, selectedMonth, selectedYear]);

  const monthStats = useMemo(() => {
    let totalConsumedValue = 0;
    let totalConsumedQty = 0;
    materials.forEach(m => {
      const qty = getMonthConsumption(m);
      totalConsumedQty += qty;
      totalConsumedValue += qty * m.valorUnitario;
    });
    return { totalConsumedValue, totalConsumedQty };
  }, [materials, getMonthConsumption]);

  const totalValueInStock = materials.reduce((acc, curr) => acc + (curr.saldoAtual * curr.valorUnitario), 0);
  const totalItemsInStock = materials.reduce((acc, curr) => acc + curr.saldoAtual, 0);

  const handleApplyCorrection = async () => {
    if (!correctionPercentage || isApplyingCorrection) return;
    setIsApplyingCorrection(true);
    try {
      const res = await fetch('/api/price-corrections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, percentage: Number(correctionPercentage), appliedBy: 'Sistema', startDate: correctionStartDate, endDate: correctionEndDate }),
      });
      if (res.ok) {
        await fetchMaterials(); await fetchHistory();
        setIsConfirmModalOpen(false); setIsPreviewModalOpen(false); setCorrectionPercentage('');
        alert(`Correção de ${correctionPercentage}% aplicada com sucesso!`);
      } else { const err = await res.json(); alert(`Erro: ${err.error}`); }
    } catch (e) { alert('Erro ao aplicar correção monetária.'); }
    finally { setIsApplyingCorrection(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Falha ao ler o arquivo.');
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];
        if (!rows.length) { alert('Planilha vazia.'); setIsUploading(false); return; }
        const fk = (item: any, keys: string[]) => {
          const k = Object.keys(item);
          return k.find(x => keys.some(p => x.toLowerCase() === p.toLowerCase())) ||
                 k.find(x => keys.some(p => x.toLowerCase().includes(p.toLowerCase())));
        };
        const pc = (val: any) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          return Number(String(val).replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.')) || 0;
        };
        const mapped = rows.map(item => {
          const codigo = String(item[fk(item,['código','codigo','cod','id'])||'']||'').trim();
          const descricao = String(item[fk(item,['descrição','descricao','material','item','nome'])||'']||'').trim();
          if (!codigo || !descricao) return null;
          const sI = pc(item[fk(item,['saldo inicial','inicial'])||'']||0);
          const sA = pc(item[fk(item,['saldo atual','atual','saldo'])||'']||item[fk(item,['quantidade','qtd','quant'])||'']||sI||0);
          const uv = pc(item[fk(item,['valor unitário','valor unitario','vlr unit','preço','preco'])||'']||0);
          const vt = pc(item[fk(item,['valor total','vlr total'])||'']||(sA*uv));
          return { codigo, descricao, unidadeMedida: String(item[fk(item,['unidade','u.m','um','medida'])||'']||'UN'), quantidadeGeral: sI||sA, valorUnitario: uv, valorTotal: vt, saldoInicial: sI||sA, saldoAtual: sA, type, consumptionRecords: [] };
        }).filter(Boolean);
        const res = await fetch('/api/materials', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ materials: mapped }) });
        if (res.ok) { await fetchMaterials(); alert('Importação concluída!'); }
        else { const err = await res.json(); alert(`Erro: ${err.details?`${err.error} (${err.details})`:err.error||'Desconhecido'}`); }
      } catch (err: any) { alert(`Erro: ${err.message}`); }
      finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.onerror = () => { alert('Erro ao ler arquivo.'); setIsUploading(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleAddConsumption = async () => {
    if (!selectedMaterial || !consumptionQty || !consumptionDate || !selectedMaterial.id) return;
    const qty = Number(consumptionQty);
    if (isNaN(qty) || qty <= 0) return;
    let recs = [...(selectedMaterial.consumptionRecords || [])];
    let newSaldo = selectedMaterial.saldoAtual;
    if (editingRecordIndex !== null) {
      const old = recs[editingRecordIndex].quantity;
      recs[editingRecordIndex] = { date: consumptionDate, quantity: qty };
      newSaldo = selectedMaterial.saldoAtual + old - qty;
    } else {
      recs.push({ date: consumptionDate, quantity: qty });
      newSaldo = selectedMaterial.saldoAtual - qty;
    }
    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoAtual: newSaldo, valorTotal: newSaldo * selectedMaterial.valorUnitario, consumptionRecords: recs }),
      });
      if (res.ok) { await fetchMaterials(); setIsConsumptionModalOpen(false); setEditingRecordIndex(null); setSelectedMaterial(null); setConsumptionQty(''); }
    } catch (e) { console.error(e); }
  };

  const handleDeleteConsumption = async (index: number) => {
    if (!selectedMaterial?.id) return;
    if (!confirm('Excluir este registro?')) return;
    const rec = selectedMaterial.consumptionRecords[index];
    const recs = selectedMaterial.consumptionRecords.filter((_, i) => i !== index);
    const newSaldo = selectedMaterial.saldoAtual + rec.quantity;
    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saldoAtual: newSaldo, valorTotal: newSaldo * selectedMaterial.valorUnitario, consumptionRecords: recs }),
      });
      if (res.ok) { setSelectedMaterial({ ...selectedMaterial, saldoAtual: newSaldo, consumptionRecords: recs }); fetchMaterials(); }
    } catch (e) { console.error(e); }
  };

  const handleUpdatePrice = async () => {
    if (!selectedMaterial?.id || !newPrice || isSavingPrice) return;
    setIsSavingPrice(true);
    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}/price-history`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceMonth: refMonth, referenceYear: refYear, unitPrice: Number(newPrice), justification: priceJustification }),
      });
      if (res.ok) { await fetchMaterials(); setIsPriceUpdateModalOpen(false); setNewPrice(''); setPriceJustification(''); }
      else { const err = await res.json(); alert(`Erro: ${err.error||'Desconhecido'}`); }
    } catch (e) { alert('Erro ao atualizar preço.'); }
    finally { setIsSavingPrice(false); }
  };

  const fetchPriceHistory = async (materialId: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/materials/${materialId}/price-history`);
      if (res.ok) setPriceHistory(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoadingHistory(false); }
  };

  const exportPriceHistoryToExcel = (material: Material, history: PriceHistory[]) => {
    const ws = XLSX.utils.json_to_sheet(history.map(h => ({
      'Mês/Ano': `${h.referenceMonth}/${h.referenceYear}`, 'Preço Unitário': h.unitPrice,
      'Variação %': h.variationPercent ? `${h.variationPercent.toFixed(2)}%` : '-',
      'Justificativa': h.justification || '-', 'Data': format(parseISO(h.createdAt), 'dd/MM/yyyy HH:mm')
    })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `Historico_Precos_${material.codigo}.xlsx`);
  };

  const handleUpdateUnitValue = async (material: Material) => {
    if (!material.id) return;
    const val = Number(tempUnitValue.replace(',', '.'));
    if (isNaN(val)) return;
    try {
      const res = await fetch(`/api/materials/${material.id}/price-history`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceMonth: selectedMonth || new Date().getMonth() + 1, referenceYear: selectedYear, unitPrice: val, justification: 'Alteração inline na tabela' }),
      });
      if (res.ok) { fetchMaterials(); setEditingUnitValueId(null); }
    } catch (e) { console.error(e); }
  };

  // CORREÇÃO DEFINITIVA da edição inline de consumo
  // Usa materialsRef para evitar stale closure
  // Mesmo padrão do handleAddConsumption que funciona
  const handleSaveConsumo = useCallback(async (materialId: string, newQty: number) => {
    if (!materialId || materialId === 'undefined') {
      alert('ID do material não encontrado. Recarregue a página.');
      setEditingCellWithRef(null);
      return;
    }

    // Usa materialsRef.current — sempre o estado mais recente
    const material = materialsRef.current.find(m => m.id === materialId);
    if (!material) {
      console.error('Material não encontrado no ref. IDs disponíveis:', materialsRef.current.map(m => m.id));
      setEditingCellWithRef(null);
      return;
    }

    if (isNaN(newQty) || newQty < 0) {
      alert('Quantidade inválida.');
      setEditingCellWithRef(null);
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Copia registros existentes
    const existingRecords: ConsumptionRecord[] = Array.isArray(material.consumptionRecords)
      ? [...material.consumptionRecords]
      : [];

    // Remove o registro do mês atual se existir
    const filteredRecords = existingRecords.filter(r => {
      const { month, year } = getRecordMonthYear(r);
      return !(month === currentMonth && year === currentYear);
    });

    // Adiciona novo registro se qty > 0
    if (newQty > 0) {
      filteredRecords.push({
        date: now.toISOString(),
        quantity: newQty,
        month: currentMonth,
        year: currentYear
      });
    }

    // Recalcula saldo
    const totalConsumed = filteredRecords.reduce((acc, r) => acc + r.quantity, 0);
    const newSaldoAtual = material.saldoInicial - totalConsumed;
    const avgConsumption = filteredRecords.length > 0 ? totalConsumed / filteredRecords.length : 0;

    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consumptionRecords: filteredRecords,
          saldoAtual: newSaldoAtual,
          valorTotal: newSaldoAtual * material.valorUnitario,
          averageMonthlyConsumption: avgConsumption
        }),
      });

      if (res.ok) {
        setEditingCellWithRef(null);
        await fetchMaterials();
      } else {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error saving consumption:', error);
      alert('Erro de conexão ao salvar consumo.');
    }
  }, [fetchMaterials, setEditingCellWithRef]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-widest uppercase">{title}</h1>
          <p className="text-slate-800 font-bold mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm disabled:opacity-50">
            <Upload size={18} className={isUploading ? 'animate-bounce' : 'text-amber-600'} />
            <span>{isUploading ? 'Processando...' : 'Importar Planilha'}</span>
          </button>
        </div>
      </div>

      {/* Correção Monetária */}
      {type === 'finalistico' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={20} /></div>
            <h2 className="text-slate-900 text-lg font-black uppercase tracking-widest">Correção Monetária</h2>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Percentual de Ajuste</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-12 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none" placeholder="Ex: 10.5 para aumento ou -5.2 para redução" value={correctionPercentage} onChange={e => setCorrectionPercentage(e.target.value)} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-800">%</div>
              </div>
              {correctionPercentage && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`text-[10px] font-black uppercase tracking-widest mt-2 ${Number(correctionPercentage) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{Number(correctionPercentage) >= 0 ? `Aumento de ${correctionPercentage}%` : `Redução de ${Math.abs(Number(correctionPercentage))}%`}</motion.p>}
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Data Base Início</label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} /><input type="date" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none" value={correctionStartDate} onChange={e => setCorrectionStartDate(e.target.value)} /></div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Data Base Término</label>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} /><input type="date" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none" value={correctionEndDate} onChange={e => setCorrectionEndDate(e.target.value)} /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsPreviewModalOpen(true)} disabled={!correctionPercentage || isNaN(Number(correctionPercentage))} className="px-6 py-3 bg-white border border-amber-500 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-50 transition-all disabled:opacity-50">Visualizar Impacto</button>
              <button onClick={() => setIsConfirmModalOpen(true)} disabled={!correctionPercentage || isNaN(Number(correctionPercentage))} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">Aplicar Correção</button>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-900">
              <History size={14} /><span>Histórico de Correções</span><ChevronRight size={14} className={`transition-transform ${!isHistoryCollapsed ? 'rotate-90' : ''}`} />
            </button>
            <AnimatePresence>
              {!isHistoryCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-4">
                    {correctionHistory.length === 0 ? <p className="text-[10px] text-slate-500 italic py-4">Nenhuma correção aplicada.</p> : (
                      <table className="w-full text-left border-collapse">
                        <thead><tr className="border-b border-slate-100"><th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Data</th><th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">%</th><th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Itens</th><th className="py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Usuário</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">{correctionHistory.map(h => (<tr key={h.id} className="text-[10px] font-bold text-slate-700"><td className="py-2">{format(parseISO(h.appliedAt),'dd/MM/yyyy HH:mm')}</td><td className={`py-2 ${h.percentage>=0?'text-emerald-600':'text-rose-600'}`}>{h.percentage>0?'+':''}{h.percentage}%</td><td className="py-2">{h.itemsAffected}</td><td className="py-2">{h.appliedBy}</td></tr>))}</tbody>
                      </table>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* KPIs + Seletor de mês */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Package size={20} /></div><p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Estoque Atual (Itens)</p></div>
            <p className="text-2xl font-black text-slate-900 font-mono">{totalItemsInStock}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20} /></div><p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Valor em Estoque</p></div>
            <p className="text-2xl font-black text-slate-900 font-mono">{fmt(totalValueInStock)}</p>
          </div>
          <div className="bg-amber-500 p-6 rounded-xl text-white shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 bg-white/20 rounded-lg"><TrendingDown size={20} /></div><p className="text-white text-[10px] font-black uppercase tracking-widest">Consumo {selectedMonth === 0 ? 'no Ano' : 'no Mês Selecionado'}</p></div>
            <p className="text-2xl font-black font-mono">{fmt(monthStats.totalConsumedValue)}</p>
            <p className="text-[10px] font-black mt-1 uppercase tracking-widest">{monthStats.totalConsumedQty} unidades retiradas</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
          <p className="text-slate-800 text-[10px] font-black uppercase tracking-widest">Filtrar por período:</p>
          <div className="flex gap-2">
            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
              <option value={0}>Todo Ano</option>
              {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {[2021,2022,2023,2024,2025,2026,2027,2028,2029,2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest">
            {selectedMonth === 0 ? `Mostrando todos — ${selectedYear}` : `Filtrando por: ${meses[selectedMonth-1]}/${selectedYear}`}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
            <input className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none placeholder:text-slate-400" placeholder="Buscar por código ou descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest min-w-[200px]">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">U.M.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">V. Unitário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">V. Total (Saldo)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-center">
                  <div className="flex items-center justify-center gap-1 relative group/h">
                    <span>Consumo {selectedMonth === 0 ? 'no Ano' : 'no Mês'}</span>
                    <Edit3 size={10} className="text-slate-400" />
                    <div className="absolute bottom-full mb-2 hidden group-hover/h:block bg-slate-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">Clique no valor para editar</div>
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-800 font-mono italic">Carregando dados...</td></tr>
              ) : filteredMaterials.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-800 font-mono italic">
                  {materials.length === 0 ? 'Faça upload de uma planilha para visualizar os dados.' : selectedMonth > 0 ? `Nenhum material consumido em ${meses[selectedMonth-1]}/${selectedYear}.` : 'Nenhum item encontrado.'}
                </td></tr>
              ) : filteredMaterials.map(item => {
                const monthConsumption = getMonthConsumption(item);
                return (
                  <tr key={item.codigo} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">{item.codigo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{item.descricao}</span>
                        {item.isHistoricalPrice && <span className="text-[9px] text-amber-600 font-black uppercase tracking-widest">Preço Histórico</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest">{item.unidadeMedida}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black font-mono ${item.saldoAtual < item.saldoInicial * 0.2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{item.saldoAtual}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-800 font-mono">
                      {editingUnitValueId === item.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input type="text" className="w-20 bg-white border border-amber-300 rounded px-1 py-0.5 text-right outline-none focus:ring-1 focus:ring-amber-500" value={tempUnitValue} onChange={e => setTempUnitValue(e.target.value)} autoFocus onKeyDown={e => { if (e.key==='Enter') handleUpdateUnitValue(item); if (e.key==='Escape') setEditingUnitValueId(null); }} />
                          <button onClick={() => handleUpdateUnitValue(item)} className="text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
                          <button onClick={() => setEditingUnitValueId(null)} className="text-rose-600 hover:text-rose-700"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 group/val relative">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              {item.priceVariation !== undefined && item.priceVariation !== 0 && (item.priceVariation > 0 ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-rose-600" />)}
                              <span className="cursor-pointer hover:text-amber-600 transition-colors" onClick={() => { setEditingUnitValueId(item.id||null); setTempUnitValue(item.valorUnitario.toString()); }}>{fmt(item.valorUnitario)}</span>
                            </div>
                            {item.priceVariation !== undefined && item.priceVariation !== 0 && <span className={`text-[9px] font-black ${item.priceVariation>0?'text-emerald-600':'text-rose-600'}`}>{item.priceVariation>0?'+':''}{item.priceVariation.toFixed(2)}%</span>}
                          </div>
                          <button onClick={() => { setEditingUnitValueId(item.id||null); setTempUnitValue(item.valorUnitario.toString()); }} className="opacity-0 group-hover/val:opacity-100 text-slate-700 hover:text-amber-600 transition-opacity"><Edit3 size={12} /></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-black text-slate-900 font-mono">{fmt(item.saldoAtual * item.valorUnitario)}</td>
                    <td className="px-6 py-4 text-center">
                      {editingCell === item.id ? (
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number" step="any" autoFocus
                            className="w-20 bg-white border border-amber-300 rounded px-2 py-1 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                            value={editingValue}
                            onChange={e => setEditingValueWithRef(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const id = editingCellRef.current;
                                const val = Number(editingValueRef.current);
                                if (id) handleSaveConsumo(id, val);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingCellWithRef(null);
                                setEditingValueWithRef('');
                              }
                            }}
                            onBlur={() => {
                              const id = editingCellRef.current;
                              const val = Number(editingValueRef.current);
                              if (id) handleSaveConsumo(id, val);
                            }}
                          />
                          <span className="text-[8px] text-slate-400 font-black uppercase">Enter p/ salvar</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCellWithRef(item.id!);
                            // Pré-carrega o valor do mês/ano selecionado (ou mês atual se "Todo Ano")
                            const tMonth = selectedMonth === 0 ? new Date().getMonth() + 1 : selectedMonth;
                            const tYear = selectedYear;
                            const record = Array.isArray(item.consumptionRecords)
                              ? item.consumptionRecords.find(r => {
                                  const { month, year } = getRecordMonthYear(r);
                                  return month === tMonth && year === tYear;
                                })
                              : null;
                            setEditingValueWithRef(record ? record.quantity.toString() : '0');
                          }}
                          className="flex flex-col items-center group/edit relative w-full"
                        >
                          <span className={`text-xs font-black font-mono transition-colors ${monthConsumption > 0 ? 'text-amber-600' : 'text-slate-700'} group-hover/edit:text-amber-500`}>{monthConsumption}</span>
                          {monthConsumption > 0 && <span className="text-[9px] text-slate-800 font-bold">{fmt(monthConsumption * item.valorUnitario)}</span>}
                          <div className="absolute -top-1 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-amber-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">editar</div>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setSelectedMaterial(item); fetchPriceHistory(item.id!); setIsPriceHistoryModalOpen(true); }} className="p-2 bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200" title="Histórico de Preços"><History size={18} /></button>
                        <button onClick={() => { setSelectedMaterial(item); setNewPrice(item.valorUnitario.toString()); setRefMonth(selectedMonth||new Date().getMonth()+1); setRefYear(selectedYear); setIsPriceUpdateModalOpen(true); }} className="p-2 bg-slate-50 text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-200" title="Atualizar Preço"><DollarSign size={18} /></button>
                        <button onClick={() => { setSelectedMaterial(item); setConsumptionQty(''); setConsumptionDate(format(new Date(),'yyyy-MM-dd')); setEditingRecordIndex(null); setIsConsumptionModalOpen(true); }} className="p-2 bg-slate-50 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200" title="Registrar Saída"><MinusCircle size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Saída */}
      <AnimatePresence>
        {isConsumptionModalOpen && selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConsumptionModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">{editingRecordIndex !== null ? 'Editar Saída' : 'Registrar Saída'}</h3>
                  <p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p>
                </div>
                <button onClick={() => { setIsConsumptionModalOpen(false); setEditingRecordIndex(null); }} className="text-slate-700 hover:text-slate-900"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Quantidade de Saída</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                    <input type="number" step="any" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-16 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none" placeholder="Ex: 5" value={consumptionQty} onChange={e => setConsumptionQty(e.target.value)} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-800 uppercase tracking-widest">{selectedMaterial.unidadeMedida}</div>
                  </div>
                  <p className="text-[10px] text-slate-800 mt-2 font-medium italic">Saldo disponível: {selectedMaterial.saldoAtual} {selectedMaterial.unidadeMedida}{editingRecordIndex !== null && ` (Original: ${selectedMaterial.consumptionRecords[editingRecordIndex].quantity})`}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2">Data da Saída</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none font-mono" value={consumptionDate} onChange={e => setConsumptionDate(e.target.value)} />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => { setIsConsumptionModalOpen(false); setEditingRecordIndex(null); }} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleAddConsumption} disabled={!consumptionQty||!consumptionDate||Number(consumptionQty)<=0||(editingRecordIndex===null&&Number(consumptionQty)>Number(selectedMaterial.saldoAtual))} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50">
                    {editingRecordIndex !== null ? 'Salvar Alteração' : 'Confirmar Saída'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Histórico de Saídas */}
      <AnimatePresence>
        {isHistoryModalOpen && selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHistoryModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div><h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Histórico de Saídas</h3><p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p></div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-700 hover:text-slate-900"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                {selectedMaterial.consumptionRecords.length === 0 ? (
                  <div className="text-center py-12 text-slate-700 italic text-sm">Nenhum registro de saída.</div>
                ) : (
                  <div className="space-y-3">
                    {[...selectedMaterial.consumptionRecords].sort((a,b) => new Date(b.date).getTime()-new Date(a.date).getTime()).map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700"><Calendar size={16} /></div>
                          <div><p className="text-xs font-black text-slate-900">{format(parseISO(record.date),'dd/MM/yyyy')}</p><p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Data da Retirada</p></div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right"><p className="text-sm font-black text-amber-600 font-mono">{record.quantity} {selectedMaterial.unidadeMedida}</p><p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Quantidade</p></div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { const ri=selectedMaterial.consumptionRecords.indexOf(record); setEditingRecordIndex(ri); setConsumptionQty(record.quantity.toString()); setConsumptionDate(record.date); setIsHistoryModalOpen(false); setIsConsumptionModalOpen(true); }} className="p-2 text-slate-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Editar"><Edit2 size={14} /></button>
                            <button onClick={() => { const ri=selectedMaterial.consumptionRecords.indexOf(record); handleDeleteConsumption(ri); }} className="p-2 text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Excluir"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                <button onClick={() => setIsHistoryModalOpen(false)} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview Correção */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreviewModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div><h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Preview de Impacto ({correctionPercentage}%)</h3><p className="text-[10px] text-slate-800 font-bold uppercase tracking-widest">Primeiros 10 itens</p></div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-700 hover:text-slate-900"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-slate-50 border-b border-slate-200"><th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Código</th><th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest">Descrição</th><th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Atual</th><th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Novo</th><th className="px-4 py-3 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Diferença</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {materials.slice(0,10).map(m => {
                        const nv = m.valorUnitario*(1+Number(correctionPercentage)/100);
                        const diff = nv - m.valorUnitario;
                        return (<tr key={m.codigo} className="text-xs font-bold text-slate-700"><td className="px-4 py-3 font-mono text-amber-600">{m.codigo}</td><td className="px-4 py-3">{m.descricao}</td><td className="px-4 py-3 text-right font-mono">{fmt(m.valorUnitario)}</td><td className="px-4 py-3 text-right font-mono text-slate-900">{fmt(nv)}</td><td className={`px-4 py-3 text-right font-mono ${diff>=0?'text-emerald-600':'text-rose-600'}`}>{diff>0?'+':''}{fmt(diff)}</td></tr>);
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Atual</p><p className="text-lg font-black text-slate-900 font-mono">{fmt(totalValueInStock)}</p></div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Após</p><p className="text-lg font-black text-slate-900 font-mono">{fmt(totalValueInStock*(1+Number(correctionPercentage)/100))}</p></div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100"><p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Diferença</p><p className="text-lg font-black text-amber-600 font-mono">{fmt(totalValueInStock*(Number(correctionPercentage)/100))}</p></div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
                <button onClick={() => setIsPreviewModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Fechar</button>
                <button onClick={() => { setIsPreviewModalOpen(false); setIsConfirmModalOpen(true); }} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20">Aplicar Correção</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Correção */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isApplyingCorrection && setIsConfirmModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Confirmar Correção</h3>
                <p className="text-sm text-slate-600 font-bold mb-6">Correção de <span className={Number(correctionPercentage)>=0?'text-emerald-600':'text-rose-600'}>{correctionPercentage}%</span> em <span className="text-slate-900">{materials.length}</span> itens.</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-left">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Exemplo:</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1"><p className="text-[10px] font-black text-slate-400 uppercase">Atual</p><p className="text-sm font-black text-slate-700 font-mono">R$ 100,00</p></div>
                    <ArrowRight size={16} className="text-slate-300 mx-2" />
                    <div className="text-center flex-1"><p className="text-[10px] font-black text-slate-400 uppercase">Novo</p><p className="text-sm font-black text-emerald-600 font-mono">{fmt(100*(1+Number(correctionPercentage)/100))}</p></div>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-left mb-6">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                  <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Esta operação não pode ser desfeita automaticamente.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsConfirmModalOpen(false)} disabled={isApplyingCorrection} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                  <button onClick={handleApplyCorrection} disabled={isApplyingCorrection} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isApplyingCorrection ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Aplicando...</span></> : <><CheckCircle2 size={16} /><span>Confirmar</span></>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Atualizar Preço */}
        {isPriceUpdateModalOpen && selectedMaterial && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><DollarSign size={20} /></div>
                  <div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atualizar Preço</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p></div>
                </div>
                <button onClick={() => setIsPriceUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preço Atual</p><p className="text-lg font-black text-slate-900 font-mono">{fmt(selectedMaterial.valorUnitario)}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mês</label><select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50" value={refMonth} onChange={e => setRefMonth(Number(e.target.value))}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}</select></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano</label><select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50" value={refYear} onChange={e => setRefYear(Number(e.target.value))}>{[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novo Preço Unitário</label>
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span><input type="number" step="0.0001" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="0,00" value={newPrice} onChange={e => setNewPrice(e.target.value)} /></div>
                  {newPrice && !isNaN(Number(newPrice)) && (() => { const v=((Number(newPrice)/selectedMaterial.valorUnitario-1)*100); return <div className="flex items-center gap-2 mt-2"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Variação:</span><span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${v>=0?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>{v>0?'+':''}{v.toFixed(2)}%</span></div>; })()}
                </div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Justificativa (Opcional)</label><textarea className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[80px] resize-none" placeholder="Ex: Reajuste contratual, inflação do período..." value={priceJustification} onChange={e => setPriceJustification(e.target.value)} /></div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setIsPriceUpdateModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleUpdatePrice} disabled={isSavingPrice||!newPrice||isNaN(Number(newPrice))} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                    {isSavingPrice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /><span>Salvar Preço</span></>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Histórico de Preços */}
        {isPriceHistoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 text-slate-700 rounded-lg"><History size={20} /></div>
                  <div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Histórico de Preços</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedMaterial?.codigo} - {selectedMaterial?.descricao}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => selectedMaterial && exportPriceHistoryToExcel(selectedMaterial, priceHistory)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100"><Download size={14} />Exportar Excel</button>
                  <button onClick={() => setIsPriceHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Evolução de Preços</h4>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...priceHistory].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey={h => `${h.referenceMonth}/${h.referenceYear}`} fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} fontWeight="bold" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={val => `R$ ${val}`} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="unitPrice" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Preço Unitário" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registros Detalhados</h4>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Período</th><th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Valor Unitário</th><th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Variação</th><th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Justificativa</th><th className="px-4 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Atualizado em</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {isLoadingHistory ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 italic">Carregando...</td></tr>
                        : priceHistory.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 italic">Nenhum histórico.</td></tr>
                        : priceHistory.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-[10px] font-black text-slate-800">{h.referenceMonth}/{h.referenceYear}</td>
                            <td className="px-4 py-3 text-right text-[10px] font-black text-slate-800 font-mono">{fmt(h.unitPrice)}</td>
                            <td className={`px-4 py-3 text-right text-[10px] font-black font-mono ${!h.variationPercent||h.variationPercent===0?'text-slate-400':h.variationPercent>0?'text-rose-600':'text-emerald-600'}`}>{h.variationPercent?(h.variationPercent>0?'+':'')+h.variationPercent.toFixed(2)+'%':'-'}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-600 max-w-[200px] truncate" title={h.justification??undefined}>{h.justification||'-'}</td>
                            <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{format(parseISO(h.createdAt),'dd/MM/yyyy HH:mm')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button onClick={() => setIsPriceHistoryModalOpen(false)} className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
