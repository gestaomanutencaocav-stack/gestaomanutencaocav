'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  FileText, 
  Calendar, 
  Building2, 
  DollarSign, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  TrendingUp, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, isAfter, isBefore, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Types ---

interface ContractInfo {
  id: string;
  contract_number: string;
  company_name: string;
  cnpj: string;
  start_date: string;
  end_date: string;
  renewals_count: number;
  contracting_party: string;
}

interface FinancialRecord {
  id: string;
  year: number;
  month: number;
  invoice_number: string;
  process_number?: string;
  payment_value: number;
  materials_value: number;
  materials_citl_value: number;
  total_invoice: number;
  discounts: number;
  total_after_discounts: number;
  fiscal_note_number: string;
}

interface Repactuacao {
  id: string;
  process_number: string;
  year: number;
  date: string;
  triggering_factor: string;
  status: 'Em Análise' | 'Aprovado' | 'Negado' | 'Aguardando Documentação' | 'Concluído';
}

// --- Page Component ---

export default function GestaoContratualPage() {
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [repactuacoes, setRepactuacoes] = useState<Repactuacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const importFileRef = useRef<HTMLInputElement>(null);
  const [contractForm, setContractForm] = useState<Partial<ContractInfo>>({
    contract_number: '31/2021',
    company_name: 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA',
    cnpj: '11.533.627/0001-24',
    start_date: '2021-11-04',
    end_date: '2026-11-04',
    renewals_count: 5,
    contracting_party: 'Centro Acadêmico da Vitória - CAV/UFPE'
  });
  
  // Modals
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isRepactuacaoModalOpen, setIsRepactuacaoModalOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);

  // Filters
  const [financialFilter, setFinancialFilter] = useState({ year: '', month: '' });
  const [repactuacaoFilter, setRepactuacaoFilter] = useState({ year: '', status: '' });

  // Form States
  const [financialForm, setFinancialForm] = useState<Partial<FinancialRecord>>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    invoice_number: '',
    process_number: '',
    fiscal_note_number: '',
    payment_value: 0,
    materials_value: 0,
    materials_citl_value: 0,
    discounts: 0
  });
  const [repactuacaoForm, setRepactuacaoForm] = useState<Partial<Repactuacao>>({
    process_number: '',
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    status: 'Em Análise',
    triggering_factor: ''
  });

  useEffect(() => {
    fetchFinancialRecords();
  }, []);

  const sortByInvoice = (records: FinancialRecord[]) => {
    return [...records].sort((a, b) => {
      const invoiceA = String(a.invoice_number || '').trim();
      const invoiceB = String(b.invoice_number || '').trim();
      
      // Tenta ordenar numericamente primeiro
      const numA = Number(invoiceA.replace(/\D/g, ''));
      const numB = Number(invoiceB.replace(/\D/g, ''));
      
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      
      // Fallback para ordenação alfabética
      return invoiceA.localeCompare(invoiceB, 'pt-BR');
    });
  };

  const fetchFinancialRecords = async () => {
    setLoading(true);
    try {
      // Fetch Contract Info from API
      const contractRes = await fetch('/api/contract-info');
      if (contractRes.ok) {
        const data = await contractRes.json();
        setContract(data);
        setContractForm({
          id: data.id,
          contract_number: data.contract_number ?? '31/2021',
          company_name: data.company_name ?? 'EMPRESA CLÓVIS DE BARROS LIMA CONSTRUÇÕES E INCORPORAÇÕES LTDA',
          cnpj: data.cnpj ?? '11.533.627/0001-24',
          start_date: data.start_date ?? '2021-11-04',
          end_date: data.end_date ?? '2026-11-04',
          renewals_count: data.renewals_count ?? 5,
          contracting_party: data.contracting_party ?? 'Centro Acadêmico da Vitória - CAV/UFPE'
        });
      }

      // Fetch Financial Records and Repactuacoes from Supabase
      const { data: financialData } = await supabase.from('financial_records').select('*').order('invoice_number', { ascending: true });
      const { data: repactuacoesData } = await supabase.from('repactuacoes').select('*').order('date', { ascending: false });

      if (financialData) setFinancialRecords(sortByInvoice(financialData));
      if (repactuacoesData) setRepactuacoes(repactuacoesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Contract Actions ---

  const handleSaveContract = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/contract-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro detalhado:', errorData);
        throw new Error(errorData.error || 'Failed to save contract info');
      }

      const savedData = await response.json();
      setContract(savedData);
      setIsEditingContract(false);
      
      setNotification({ type: 'success', message: 'Dados do contrato salvos com sucesso!' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      console.error('Error saving contract:', error);
      setNotification({ type: 'error', message: error.message || 'Erro ao salvar. Tente novamente.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Financial Actions ---

  const handleAddFinancialRecord = async () => {
    try {
      const total_invoice = (Number(financialForm.payment_value) || 0) + 
                          (Number(financialForm.materials_value) || 0) + 
                          (Number(financialForm.materials_citl_value) || 0);
      const total_after_discounts = total_invoice - (Number(financialForm.discounts) || 0);

      const { data, error } = await supabase
        .from('financial_records')
        .insert([{
          ...financialForm,
          total_invoice,
          total_after_discounts
        }])
        .select();

      if (error) throw error;
      setFinancialRecords(sortByInvoice([data[0], ...financialRecords]));
      setIsFinancialModalOpen(false);
      setFinancialForm({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        payment_value: 0,
        materials_value: 0,
        materials_citl_value: 0,
        discounts: 0
      });
    } catch (error) {
      console.error('Error adding financial record:', error);
    }
  };

  const handleDeleteFinancialRecord = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      const { error } = await supabase.from('financial_records').delete().eq('id', id);
      if (error) throw error;
      setFinancialRecords(financialRecords.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting financial record:', error);
    }
  };

  const handleUpdateFinancialRecord = async (id: string, field: keyof FinancialRecord, value: any) => {
    const record = financialRecords.find(r => r.id === id);
    if (!record) return;

    const updatedRecord = { ...record, [field]: value };
    
    // Recalculate totals
    updatedRecord.total_invoice = (Number(updatedRecord.payment_value) || 0) + 
                                 (Number(updatedRecord.materials_value) || 0) + 
                                 (Number(updatedRecord.materials_citl_value) || 0);
    updatedRecord.total_after_discounts = updatedRecord.total_invoice - (Number(updatedRecord.discounts) || 0);

    try {
      const { error } = await supabase
        .from('financial_records')
        .update(updatedRecord)
        .eq('id', id);

      if (error) throw error;
      setFinancialRecords(sortByInvoice(financialRecords.map(r => r.id === id ? updatedRecord : r)));
    } catch (error) {
      console.error('Error updating financial record:', error);
    }
  };

  // --- Repactuacao Actions ---

  const handleAddRepactuacao = async () => {
    try {
      const { data, error } = await supabase
        .from('repactuacoes')
        .insert([repactuacaoForm])
        .select();

      if (error) throw error;
      setRepactuacoes([data[0], ...repactuacoes]);
      setIsRepactuacaoModalOpen(false);
      setRepactuacaoForm({
        year: new Date().getFullYear(),
        date: new Date().toISOString().split('T')[0],
        status: 'Em Análise'
      });
    } catch (error) {
      console.error('Error adding repactuacao:', error);
    }
  };

  const handleDeleteRepactuacao = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta repactuação?')) return;
    try {
      const { error } = await supabase.from('repactuacoes').delete().eq('id', id);
      if (error) throw error;
      setRepactuacoes(repactuacoes.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting repactuacao:', error);
    }
  };

  // --- Import/Export ---

  const handleImportSpreadsheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Falha ao ler o arquivo');

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
        console.log('Dados brutos da planilha:', JSON.stringify(jsonData[0], null, 2));

        if (!jsonData || jsonData.length === 0) {
          alert('A planilha parece estar vazia.');
          setIsImporting(false);
          return;
        }

        setImportPreviewData(jsonData);
        setIsImportPreviewOpen(true);
      } catch (error: any) {
        console.error('Erro na importação:', error);
        alert(`Erro ao processar arquivo: ${error.message}`);
      } finally {
        setIsImporting(false);
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };

    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setIsImporting(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    try {
      const parseValue = (val: any): number => {
        if (!val && val !== 0) return 0;
        const str = String(val)
          .replace(/R\$\s?/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      const getField = (row: any, keys: string[]): any => {
        for (const key of keys) {
          const found = Object.keys(row).find(
            k => k.trim().toUpperCase() === key.toUpperCase()
          );
          if (found !== undefined && row[found] !== undefined) {
            return row[found];
          }
        }
        return '';
      };

      const recordsToInsert = importPreviewData.map(row => {
        const payment = parseValue(getField(row, [
          'VALOR PAGAMENTO FATO GERADOR',
          'Valor Pagamento Fato Gerador',
          'payment_value'
        ]));

        const materials = parseValue(getField(row, [
          'VALOR MATERIAIS REQUISITADOS',
          'Valor Materiais Requisitados',
          'materials_value'
        ]));

        const citl = parseValue(getField(row, [
          'VALOR MATERIAIS REQUISITADOS + CITL',
          'Valor Materiais Requisitados + CITL',
          'materials_citl_value'
        ]));

        const discounts = parseValue(getField(row, [
          'DESCONTOS',
          'Descontos',
          'discounts'
        ]));

        const totalFromSheet = parseValue(getField(row, [
          'TOTAL DA FATURA',
          'Total da Fatura',
          'total_invoice'
        ]));
        const total = totalFromSheet > 0
          ? totalFromSheet
          : payment + materials + citl;

        const totalAfterFromSheet = parseValue(getField(row, [
          'TOTAL DA FATURA APÓS DESCONTOS',
          'TOTAL DA FATURA APOS DESCONTOS',
          'Total da Fatura após descontos',
          'total_after_discounts'
        ]));
        const totalAfter = totalAfterFromSheet > 0
          ? totalAfterFromSheet
          : total - discounts;

        return {
          year: Number(getField(row, ['ANO', 'Ano', 'year']) || 
            new Date().getFullYear()),
          month: Number(getField(row, ['MÊS', 'MES', 'Mês', 'month']) || 
            new Date().getMonth() + 1),
          invoice_number: String(getField(row, [
            'NÚMERO DA FATURA',
            'Número da Fatura',
            'invoice_number'
          ])).trim(),
          process_number: String(getField(row, [
            'NÚMERO DO PROCESSO',
            'Número do Processo',
            'process_number'
          ])).trim(),
          payment_value: payment,
          materials_value: materials,
          materials_citl_value: citl,
          total_invoice: total,
          discounts: discounts,
          total_after_discounts: totalAfter,
          fiscal_note_number: String(getField(row, [
            'NÚMERO DA NOTA FISCAL',
            'Número da Nota Fiscal',
            'fiscal_note_number'
          ])).trim(),
        };
      });

      const { error } = await supabase
        .from('financial_records')
        .insert(recordsToInsert);

      if (error) throw error;

      alert(`${recordsToInsert.length} registros importados com sucesso!`);
      setIsImportPreviewOpen(false);
      fetchFinancialRecords();
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      alert(`Erro ao importar dados: ${error.message}`);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Contract Info
    const contractWS = XLSX.utils.json_to_sheet([contract || {}]);
    XLSX.utils.book_append_sheet(wb, contractWS, "Dados do Contrato");
    
    // Sheet 2: Financial Records
    const financialDataExport = financialRecords.map(r => ({
      'Ano': r.year,
      'Mês': r.month,
      'Nº Fatura': r.invoice_number,
      'Nº Processo': r.process_number || '-',
      'Valor Pagamento': r.payment_value,
      'Valor Materiais': r.materials_value,
      'Valor Mat + CITL': r.materials_citl_value,
      'Total Bruto': r.total_invoice,
      'Descontos': r.discounts,
      'Total Líquido': r.total_after_discounts,
      'NF': r.fiscal_note_number
    }));
    const financialWS = XLSX.utils.json_to_sheet(financialDataExport);
    XLSX.utils.book_append_sheet(wb, financialWS, "Execução Financeira");
    
    // Sheet 3: Summary by Year
    const summaryData = Array.from(new Set(financialRecords.map(r => r.year))).map(year => {
      const yearRecords = financialRecords.filter(r => r.year === year);
      return {
        Ano: year,
        'Total Faturas': yearRecords.reduce((acc, r) => acc + r.total_invoice, 0),
        'Total Materiais': yearRecords.reduce((acc, r) => acc + r.materials_value, 0),
        'Total Descontos': yearRecords.reduce((acc, r) => acc + r.discounts, 0),
        'Total Executado': yearRecords.reduce((acc, r) => acc + r.total_after_discounts, 0)
      };
    });
    const summaryWS = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, "Resumo por Ano");

    XLSX.writeFile(wb, `Gestao_Contratual_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_Contratual_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // --- Helpers ---

  const getVigenciaStatus = () => {
    if (!contract) return { color: 'bg-slate-200', text: 'N/A', days: 0 };
    const today = new Date();
    const endDate = parseISO(contract.end_date);
    const daysRemaining = differenceInDays(endDate, today);
    const sixMonthsFromNow = addMonths(today, 6);

    if (isBefore(endDate, today)) {
      return { color: 'bg-rose-500', text: 'Vencido', days: daysRemaining };
    } else if (isBefore(endDate, sixMonthsFromNow)) {
      return { color: 'bg-amber-500', text: 'Vencimento Próximo', days: daysRemaining };
    } else {
      return { color: 'bg-emerald-500', text: 'Em Vigência', days: daysRemaining };
    }
  };

  const filteredFinancial = financialRecords.filter(r => {
    return (!financialFilter.year || r.year === Number(financialFilter.year)) &&
           (!financialFilter.month || r.month === Number(financialFilter.month));
  });

  const filteredRepactuacoes = repactuacoes.filter(r => {
    return (!repactuacaoFilter.year || r.year === Number(repactuacaoFilter.year)) &&
           (!repactuacaoFilter.status || r.status === repactuacaoFilter.status);
  });

  const financialTotals = useMemo(() => {
    return filteredFinancial.reduce((acc, r) => ({
      payment: acc.payment + r.payment_value,
      materials: acc.materials + r.materials_value,
      citl: acc.citl + r.materials_citl_value,
      total: acc.total + r.total_invoice,
      discounts: acc.discounts + r.discounts,
      afterDiscounts: acc.afterDiscounts + r.total_after_discounts
    }), { payment: 0, materials: 0, citl: 0, total: 0, discounts: 0, afterDiscounts: 0 });
  }, [filteredFinancial]);

  const statusColors = {
    'Em Análise': 'bg-amber-100 text-amber-700',
    'Aprovado': 'bg-emerald-100 text-emerald-700',
    'Negado': 'bg-rose-100 text-rose-700',
    'Aguardando Documentação': 'bg-orange-100 text-orange-700',
    'Concluído': 'bg-blue-100 text-blue-700'
  };

  if (loading) {
    return (
      <DashboardLayout title="Gestão Contratual">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  const vigencia = getVigenciaStatus();

  return (
    <DashboardLayout title="Gestão Contratual">
      <div className="space-y-8" id="pdf-content">
        
        {/* --- Contract Info Card --- */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg text-white">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dados do Contrato</h2>
                <p className="text-[10px] text-slate-900 font-bold uppercase tracking-widest">Informações Principais e Vigência</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {notification && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${
                      notification.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                    }`}
                  >
                    {notification.message}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${vigencia.color} text-white text-[10px] font-black uppercase tracking-widest`}>
                <Clock size={12} />
                {vigencia.text}
              </div>
              <div className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                {vigencia.days} Dias Restantes
              </div>
              <button 
                onClick={() => {
                  if (isEditingContract) {
                    handleSaveContract();
                  } else {
                    setIsEditingContract(true);
                  }
                }}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                  isEditingContract 
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-slate-200/20'
                } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    {isEditingContract ? <Save size={14} /> : <Edit2 size={14} />}
                    {isEditingContract ? 'Salvar' : 'Editar'}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Contrato nº</label>
                {isEditingContract ? (
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.contract_number ?? ''}
                    onChange={e => setContractForm({...contractForm, contract_number: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.contract_number}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Empresa Contratada</label>
                {isEditingContract ? (
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.company_name ?? ''}
                    onChange={e => setContractForm({...contractForm, company_name: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.company_name}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">CNPJ</label>
                {isEditingContract ? (
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.cnpj ?? ''}
                    onChange={e => setContractForm({...contractForm, cnpj: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.cnpj}</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Início da Vigência</label>
                {isEditingContract ? (
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.start_date ?? ''}
                    onChange={e => setContractForm({...contractForm, start_date: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Final da Vigência</label>
                {isEditingContract ? (
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.end_date ?? ''}
                    onChange={e => setContractForm({...contractForm, end_date: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Renovações Contratuais</label>
                <div className="flex items-center gap-3">
                  {isEditingContract ? (
                    <input 
                      type="number"
                      className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                      value={contractForm.renewals_count ?? 0}
                      onChange={e => setContractForm({...contractForm, renewals_count: Number(e.target.value)})}
                    />
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">{contract?.renewals_count}</span>
                  )}
                  <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Restantes</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Contratante</label>
                {isEditingContract ? (
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900"
                    value={contractForm.contracting_party ?? ''}
                    onChange={e => setContractForm({...contractForm, contracting_party: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.contracting_party}</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="text-amber-500" size={16} />
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Resumo Executivo</p>
                </div>
                <p className="text-[10px] text-slate-900 font-medium leading-relaxed">
                  Contrato de prestação de serviços de manutenção predial preventiva e corretiva, com fornecimento de materiais e mão de obra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Financial Execution Section --- */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="text-emerald-500" size={24} />
                Execução Financeira
              </h2>
              <p className="text-xs text-slate-900 font-bold uppercase tracking-widest">Acompanhamento de Faturas e Pagamentos</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setIsFinancialModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus size={16} />
                Adicionar Registro
              </button>
              
              <button 
                onClick={() => importFileRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {isImporting ? 'Importando...' : 'Importar Planilha'}
              </button>
              
              <input
                type="file"
                ref={importFileRef}
                onChange={handleImportSpreadsheet}
                className="hidden"
                accept=".xlsx,.xls,.csv"
              />

              <button 
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                <Download size={16} />
                PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-900" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Filtros:</span>
            </div>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={financialFilter.year}
              onChange={e => setFinancialFilter({...financialFilter, year: e.target.value})}
            >
              <option value="">Todos os Anos</option>
              {Array.from(new Set(financialRecords.map(r => r.year))).sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={financialFilter.month}
              onChange={e => setFinancialFilter({...financialFilter, month: e.target.value})}
            >
              <option value="">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{format(new Date(2022, m - 1), 'MMMM', { locale: ptBR })}</option>
              ))}
            </select>
            {(financialFilter.year || financialFilter.month) && (
              <button 
                onClick={() => setFinancialFilter({ year: '', month: '' })}
                className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Ano/Mês</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Fatura
                      <ChevronUp size={12} className="text-amber-500" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-700 uppercase tracking-widest text-left whitespace-nowrap">Nº Processo</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Fato Gerador</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Materiais</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Mat + CITL</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Bruto</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Descontos</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Total Líquido</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">NF</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFinancial.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{record.year}</span>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                          {format(new Date(2022, record.month - 1), 'MMM', { locale: ptBR })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        className="w-20 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.invoice_number ?? ''}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'invoice_number', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        className="w-32 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.process_number ?? ''}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'process_number', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        type="number"
                        className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.payment_value ?? 0}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'payment_value', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        type="number"
                        className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.materials_value ?? 0}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'materials_value', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        type="number"
                        className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.materials_citl_value ?? 0}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'materials_citl_value', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-black text-slate-900">
                        {record.total_invoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        type="number"
                        className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-rose-600 p-0"
                        value={record.discounts ?? 0}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'discounts', Number(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-black text-emerald-600">
                        {record.total_after_discounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <input 
                        className="w-20 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0"
                        value={record.fiscal_note_number ?? ''}
                        onChange={e => handleUpdateFinancialRecord(record.id, 'fiscal_note_number', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteFinancialRecord(record.id)}
                        className="p-2 text-slate-800 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Totais Gerais</td>
                  <td className="px-4 py-4 text-xs font-black">
                    {financialTotals.payment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-4 text-xs font-black">
                    {financialTotals.materials.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-4 text-xs font-black">
                    {financialTotals.citl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-4 text-xs font-black">
                    {financialTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-4 text-xs font-black text-rose-400">
                    {financialTotals.discounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-4 text-xs font-black text-emerald-400">
                    {financialTotals.afterDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            {filteredFinancial.length === 0 && (
              <div className="py-12 text-center text-slate-700 italic text-xs">
                Nenhum registro financeiro encontrado.
              </div>
            )}
          </div>
        </section>

        {/* --- Repactuacoes Section --- */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="text-amber-500" size={24} />
                Repactuações
              </h2>
              <p className="text-xs text-slate-900 font-bold uppercase tracking-widest">Acompanhamento de Processos e Reajustes</p>
            </div>
            <button 
              onClick={() => setIsRepactuacaoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus size={16} />
              Nova Repactuação
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-900" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Filtros:</span>
            </div>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={repactuacaoFilter.year}
              onChange={e => setRepactuacaoFilter({...repactuacaoFilter, year: e.target.value})}
            >
              <option value="">Todos os Anos</option>
              {Array.from(new Set(repactuacoes.map(r => r.year))).sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select 
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
              value={repactuacaoFilter.status}
              onChange={e => setRepactuacaoFilter({...repactuacaoFilter, status: e.target.value as any})}
            >
              <option value="">Todos os Status</option>
              {Object.keys(statusColors).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Processo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano/Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fato Gerador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRepactuacoes.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-900">{rep.process_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{rep.year}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {format(parseISO(rep.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-slate-700 max-w-md">{rep.triggering_factor}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[rep.status]}`}>
                        {rep.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteRepactuacao(rep.id)}
                        className="p-2 text-slate-800 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRepactuacoes.length === 0 && (
              <div className="py-12 text-center text-slate-700 italic text-xs">
                Nenhuma repactuação encontrada.
              </div>
            )}
          </div>
        </section>

      </div>

      {/* --- Modals --- */}

      {/* Financial Modal */}
      <AnimatePresence>
        {isFinancialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFinancialModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-emerald-700">Novo Registro Financeiro</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lançamento de Fatura</p>
                </div>
                <button onClick={() => setIsFinancialModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Ano</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.year ?? new Date().getFullYear()} onChange={e => setFinancialForm({...financialForm, year: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Mês</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.month ?? new Date().getMonth() + 1} onChange={e => setFinancialForm({...financialForm, month: Number(e.target.value)})}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{format(new Date(2022, m - 1), 'MMMM', { locale: ptBR })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nº Fatura</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.invoice_number ?? ''} onChange={e => setFinancialForm({...financialForm, invoice_number: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Número do Processo</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Ex: 23076.012345/2026-01" value={financialForm.process_number ?? ''} onChange={e => setFinancialForm({...financialForm, process_number: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nº Nota Fiscal</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.fiscal_note_number ?? ''} onChange={e => setFinancialForm({...financialForm, fiscal_note_number: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Valor Fato Gerador (R$)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.payment_value ?? 0} onChange={e => setFinancialForm({...financialForm, payment_value: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Valor Materiais (R$)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.materials_value ?? 0} onChange={e => setFinancialForm({...financialForm, materials_value: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Valor Mat + CITL (R$)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.materials_citl_value ?? 0} onChange={e => setFinancialForm({...financialForm, materials_citl_value: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Descontos (R$)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={financialForm.discounts ?? 0} onChange={e => setFinancialForm({...financialForm, discounts: Number(e.target.value)})} />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={() => setIsFinancialModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleAddFinancialRecord} className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Salvar Registro</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Repactuacao Modal */}
      <AnimatePresence>
        {isRepactuacaoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsRepactuacaoModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-amber-700">Nova Repactuação</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Abertura de Processo</p>
                </div>
                <button onClick={() => setIsRepactuacaoModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Nº Processo</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={repactuacaoForm.process_number ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, process_number: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Ano</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={repactuacaoForm.year ?? new Date().getFullYear()} onChange={e => setRepactuacaoForm({...repactuacaoForm, year: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Data</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={repactuacaoForm.date ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, date: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Status</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" value={repactuacaoForm.status ?? 'Em Análise'} onChange={e => setRepactuacaoForm({...repactuacaoForm, status: e.target.value as any})}>
                    {Object.keys(statusColors).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Fato Gerador</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[100px]" value={repactuacaoForm.triggering_factor ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, triggering_factor: e.target.value})} />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={() => setIsRepactuacaoModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleAddRepactuacao} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">Salvar Repactuação</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {isImportPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsImportPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase">Preview de Importação</h3>
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Confirme os dados antes de salvar</p>
                </div>
                <button onClick={() => setIsImportPreviewOpen(false)} className="text-slate-700 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ano/Mês</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Fatura</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Processo</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Fato Gerador</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Materiais</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Mat + CITL</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Bruto</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Descontos</th>
                      <th className="px-3 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewData.map((row, idx) => {
                      const parseValue = (val: any): number => {
                        if (!val && val !== 0) return 0;
                        const str = String(val)
                          .replace(/R\$\s?/g, '')
                          .replace(/\./g, '')
                          .replace(',', '.')
                          .trim();
                        const num = parseFloat(str);
                        return isNaN(num) ? 0 : num;
                      };

                      const payment = parseValue(row['Valor Pagamento Fato Gerador'] || row['Fato Gerador'] || row['payment_value']);
                      const materials = parseValue(row['Valor Materiais Requisitados'] || row['Materiais'] || row['materials_value']);
                      const citl = parseValue(row['Valor Materiais Requisitados + CITL'] || row['Mat + CITL'] || row['materials_citl_value']);
                      const discounts = parseValue(row['Descontos'] || row['Desconto'] || row['discounts']);
                      const totalFromSheet = parseValue(row['Total da Fatura'] || row['Total Bruto'] || row['total_invoice']);
                      const total = totalFromSheet > 0 ? totalFromSheet : payment + materials + citl;
                      const totalAfterFromSheet = parseValue(row['Total da Fatura após descontos'] || row['Total Líquido'] || row['Total Apos Descontos'] || row['total_after_discounts']);
                      const totalAfter = totalAfterFromSheet > 0 ? totalAfterFromSheet : total - discounts;

                      return (
                        <tr key={idx}>
                          <td className="px-3 py-3 text-xs font-bold">
                            {(row['Ano'] || row['year'] || new Date().getFullYear())}/
                            {(row['Mês'] || row['month'] || new Date().getMonth() + 1)}
                          </td>
                          <td className="px-3 py-3 text-xs">{String(row['Número da Fatura'] || row['Fatura'] || row['invoice_number'] || '').trim()}</td>
                          <td className="px-3 py-3 text-xs">{String(row['Número do Processo'] || row['Processo'] || row['process_number'] || '').trim()}</td>
                          <td className="px-3 py-3 text-xs">{payment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-3 py-3 text-xs">{materials.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-3 py-3 text-xs">{citl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-3 py-3 text-xs">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-3 py-3 text-xs text-rose-500">{discounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="px-3 py-3 text-xs font-bold text-emerald-600">{totalAfter.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={() => setIsImportPreviewOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={confirmImport} className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">Confirmar Importação ({importPreviewData.length} registros)</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
