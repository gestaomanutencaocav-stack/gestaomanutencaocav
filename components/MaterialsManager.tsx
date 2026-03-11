'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Search, 
  TrendingDown, 
  Box,
  DollarSign,
  Package,
  MinusCircle,
  Calendar,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';

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
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [consumptionQty, setConsumptionQty] = useState('');
  const [consumptionDate, setConsumptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [fetchMaterials]);

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
          let found = keys.find(k => possibleKeys.some(pk => k.toLowerCase() === pk.toLowerCase()));
          if (found) return found;
          return keys.find(k => possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase())));
        };

        const mappedData: any[] = jsonData.map((item) => {
          const codigoKey = findKey(item, ['código', 'codigo', 'cod', 'id']);
          const descricaoKey = findKey(item, ['descrição', 'descricao', 'material', 'item', 'nome']);
          const unidadeKey = findKey(item, ['unidade', 'u.m', 'um', 'medida']);
          const quantidadeKey = findKey(item, ['quantidade', 'qtd', 'quant']);
          const valorUnitarioKey = findKey(item, ['valor unitário', 'valor unitario', 'vlr unit', 'preço', 'preco']);
          const saldoInicialKey = findKey(item, ['saldo inicial', 'inicial']);
          const saldoAtualKey = findKey(item, ['saldo atual', 'atual', 'saldo']);

          const qty = Number(item[quantidadeKey || ''] || 0);
          const unitVal = Number(item[valorUnitarioKey || ''] || 0);
          const sInicial = Number(item[saldoInicialKey || ''] || 0);
          const sAtual = Number(item[saldoAtualKey || ''] || item[quantidadeKey || ''] || 0);

          return {
            codigo: String(item[codigoKey || ''] || 'N/A'),
            descricao: String(item[descricaoKey || ''] || 'Sem descrição'),
            unidadeMedida: String(item[unidadeKey || ''] || 'UN'),
            quantidadeGeral: qty,
            valorUnitario: unitVal,
            valorTotal: qty * unitVal,
            saldoInicial: sInicial || sAtual,
            saldoAtual: sAtual,
            type: type,
            consumptionRecords: []
          };
        });

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

    const newRecords = [
      ...(selectedMaterial.consumptionRecords || []),
      { date: consumptionDate, quantity: qty }
    ];

    try {
      const res = await fetch(`/api/materials/${selectedMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saldoAtual: selectedMaterial.saldoAtual - qty,
          consumptionRecords: newRecords
        }),
      });

      if (res.ok) {
        fetchMaterials();
        setIsConsumptionModalOpen(false);
        setSelectedMaterial(null);
        setConsumptionQty('');
      }
    } catch (error) {
      console.error('Error updating consumption:', error);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const monthStats = useMemo(() => {
    let totalConsumedValue = 0;
    let totalConsumedQty = 0;

    materials.forEach(m => {
      const monthConsumption = m.consumptionRecords.filter(record => {
        const date = parseISO(record.date);
        return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
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
          <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight uppercase">{title}</h1>
          <p className="text-slate-500 font-medium mt-1">{description}</p>
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
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm disabled:opacity-50"
          >
            <Upload size={18} className={`${isUploading ? 'animate-bounce' : 'text-amber-600'}`} />
            <span>{isUploading ? 'Processando...' : 'Importar Planilha'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Package size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Estoque Atual (Itens)</p>
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">{totalItemsInStock}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <DollarSign size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Valor em Estoque</p>
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
              <p className="text-white/80 text-[10px] font-black uppercase tracking-widest">Consumo no Mês Selecionado</p>
            </div>
            <p className="text-2xl font-black font-mono">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthStats.totalConsumedValue)}
            </p>
            <p className="text-[10px] font-bold mt-1 opacity-80 uppercase tracking-widest">
              {monthStats.totalConsumedQty} unidades retiradas
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Filtro de Período</p>
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-amber-500/50"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-amber-500/50"
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">U.M.</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Inicial</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Saldo Atual</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">V. Unitário</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">V. Total (Saldo)</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Consumo no Mês</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-mono italic">
                    Carregando dados...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-mono italic">
                    {materials.length === 0 ? 'Faça upload de uma planilha para visualizar os dados.' : 'Nenhum item encontrado para a busca.'}
                  </td>
                </tr>
              ) : filteredMaterials.map((item) => {
                const monthConsumption = item.consumptionRecords.filter(record => {
                  const date = parseISO(record.date);
                  return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
                }).reduce((acc, curr) => acc + curr.quantity, 0);

                return (
                  <tr key={item.codigo} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-amber-600 font-mono">{item.codigo}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.descricao}</td>
                    <td className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.unidadeMedida}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-400 font-mono">{item.saldoInicial}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                        item.saldoAtual < item.saldoInicial * 0.2 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        {item.saldoAtual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-slate-600 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-black text-slate-900 font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.saldoAtual * item.valorUnitario)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-xs font-black font-mono ${monthConsumption > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {monthConsumption}
                        </span>
                        {monthConsumption > 0 && (
                          <span className="text-[9px] text-slate-400 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthConsumption * item.valorUnitario)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedMaterial(item);
                          setIsConsumptionModalOpen(true);
                        }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-slate-200 hover:border-amber-200"
                        title="Registrar Saída"
                      >
                        <MinusCircle size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Registrar Saída</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedMaterial.codigo} - {selectedMaterial.descricao}</p>
                </div>
                <button onClick={() => setIsConsumptionModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantidade de Saída</label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-16 py-3 text-sm focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all"
                      placeholder="Ex: 5"
                      value={consumptionQty}
                      onChange={(e) => setConsumptionQty(e.target.value)}
                      max={selectedMaterial.saldoAtual}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {selectedMaterial.unidadeMedida}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Saldo disponível: {selectedMaterial.saldoAtual} {selectedMaterial.unidadeMedida}</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data da Saída</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
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
                    onClick={() => setIsConsumptionModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleAddConsumption}
                    disabled={!consumptionQty || Number(consumptionQty) <= 0 || Number(consumptionQty) > selectedMaterial.saldoAtual}
                    className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Saída
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
