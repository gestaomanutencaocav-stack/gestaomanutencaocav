'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Briefcase,
  Users,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { format, differenceInDays, isAfter, isBefore, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ContractInfo {
  id: string;
  contract_number: string;
  company_name: string;
  cnpj: string;
  start_date: string;
  end_date: string;
  renewals_count: number;
  contracting_party: string;
  status: 'Ativo' | 'Encerrado' | 'Suspenso';
  gestor_contrato?: string;
  gestor_substituto?: string;
  fiscal_tecnico?: string;
  fiscal_tecnico_sub?: string;
  fiscal_administrativo?: string;
  fiscal_admin_sub?: string;
  portaria_designacao?: string;
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
  contract_id?: string;
}

interface Repactuacao {
  id: string;
  contract_id?: string;
  process_number: string;
  year: number;
  periodo_data_base: string;
  valor_repactuacao: number;
  termo_apostila: string;
  triggering_factor: string;
  status: 'Em Análise' | 'Aprovado' | 'Negado' | 'Aguardando Documentação' | 'Concluído';
}

interface ContractRenewal {
  id: string;
  contract_id: string;
  numero_processo: string;
  ano: string;
  termo_aditivo: string;
  status: 'Em Andamento' | 'Concluída' | 'Cancelada' | 'Pendente';
  descricao: string;
}

export default function GestaoContratualPage() {
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [contracts, setContracts] = useState<ContractInfo[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('todos');
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [repactuacoes, setRepactuacoes] = useState<Repactuacao[]>([]);
  const [contractRenewals, setContractRenewals] = useState<ContractRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [isRepactuacaoModalOpen, setIsRepactuacaoModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);

  const [financialFilter, setFinancialFilter] = useState({ year: '', month: '' });
  const [repactuacaoFilter, setRepactuacaoFilter] = useState({ year: '', status: '' });
  const [renewalFilter, setRenewalFilter] = useState({ year: '', status: '' });

  const [contractForm, setContractForm] = useState<Partial<ContractInfo>>({
    contract_number: '',
    company_name: '',
    cnpj: '',
    start_date: '',
    end_date: '',
    renewals_count: 0,
    contracting_party: '',
    status: 'Ativo',
    gestor_contrato: '',
    gestor_substituto: '',
    fiscal_tecnico: '',
    fiscal_tecnico_sub: '',
    fiscal_administrativo: '',
    fiscal_admin_sub: '',
    portaria_designacao: ''
  });

  const [newContractForm, setNewContractForm] = useState({
    contract_number: '',
    company_name: '',
    cnpj: '',
    start_date: '',
    end_date: '',
    renewals_count: 0,
    contracting_party: '',
    status: 'Ativo' as 'Ativo' | 'Encerrado' | 'Suspenso',
    gestor_contrato: '',
    gestor_substituto: '',
    fiscal_tecnico: '',
    fiscal_tecnico_sub: '',
    fiscal_administrativo: '',
    fiscal_admin_sub: '',
    portaria_designacao: ''
  });

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
    periodo_data_base: '',
    valor_repactuacao: 0,
    termo_apostila: '',
    status: 'Em Análise',
    triggering_factor: ''
  });

  const [renewalForm, setRenewalForm] = useState<Partial<ContractRenewal>>({
    numero_processo: '',
    ano: new Date().getFullYear().toString(),
    termo_aditivo: '',
    status: 'Em Andamento',
    descricao: ''
  });

  const sortByInvoice = (records: FinancialRecord[]) => {
    return [...records].sort((a, b) => {
      const invoiceA = String(a.invoice_number || '').trim();
      const invoiceB = String(b.invoice_number || '').trim();
      const numA = Number(invoiceA.replace(/\D/g, ''));
      const numB = Number(invoiceB.replace(/\D/g, ''));
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return invoiceA.localeCompare(invoiceB, 'pt-BR');
    });
  };

  const fetchFinancialRecords = useCallback(async () => {
    setLoading(true);
    try {
      const contractsRes = await supabase
        .from('contract_info')
        .select('*')
        .order('start_date', { ascending: false });

      if (contractsRes.data) {
        setContracts(contractsRes.data);
        const active = contractsRes.data.find(c => c.status === 'Ativo') || contractsRes.data[0];
        if (active) {
          setSelectedContractId(active.id);
          setContract(active);
          setContractForm({
            id: active.id,
            contract_number: active.contract_number ?? '',
            company_name: active.company_name ?? '',
            cnpj: active.cnpj ?? '',
            start_date: active.start_date ?? '',
            end_date: active.end_date ?? '',
            renewals_count: active.renewals_count ?? 0,
            contracting_party: active.contracting_party ?? '',
            status: active.status ?? 'Ativo',
            gestor_contrato: active.gestor_contrato ?? '',
            gestor_substituto: active.gestor_substituto ?? '',
            fiscal_tecnico: active.fiscal_tecnico ?? '',
            fiscal_tecnico_sub: active.fiscal_tecnico_sub ?? '',
            fiscal_administrativo: active.fiscal_administrativo ?? '',
            fiscal_admin_sub: active.fiscal_admin_sub ?? '',
            portaria_designacao: active.portaria_designacao ?? ''
          });
        }
      }

      const { data: financialData } = await supabase.from('financial_records').select('*').order('invoice_number', { ascending: true });
      const { data: repactuacoesData } = await supabase.from('repactuacoes').select('*').order('created_at', { ascending: false });
      const { data: renewalsData } = await supabase.from('contract_renewals').select('*').order('created_at', { ascending: false });
      
      if (financialData) setFinancialRecords(sortByInvoice(financialData));
      if (repactuacoesData) setRepactuacoes(repactuacoesData);
      if (renewalsData) setContractRenewals(renewalsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialRecords();
  }, [fetchFinancialRecords]);

  useEffect(() => {
    if (selectedContractId !== 'todos') {
      const c = contracts.find(item => item.id === selectedContractId);
      if (c) {
        setContract(c);
        setContractForm(c);
      }
    } else {
      setContract(null);
    }
  }, [selectedContractId, contracts]);

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
        throw new Error(errorData.error || 'Failed to save contract info');
      }
      const savedData = await response.json();
      setContract(savedData);
      setIsEditingContract(false);
      setNotification({ type: 'success', message: 'Dados do contrato salvos com sucesso!' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'Erro ao salvar. Tente novamente.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFinancialRecord = async () => {
    try {
      const payload = {
        ...financialForm,
        contract_id: selectedContractId !== 'todos' ? selectedContractId : (contracts.find(c => c.status === 'Ativo')?.id || contracts[0]?.id),
        payment_value: Number(financialForm.payment_value) || 0,
        materials_value: Number(financialForm.materials_value) || 0,
        materials_citl_value: Number(financialForm.materials_citl_value) || 0,
        discounts: Number(financialForm.discounts) || 0,
        total_invoice: (Number(financialForm.payment_value) || 0) + (Number(financialForm.materials_citl_value) || 0),
        total_after_discounts: (Number(financialForm.payment_value) || 0) + (Number(financialForm.materials_citl_value) || 0) - (Number(financialForm.discounts) || 0),
      };

      const { data, error } = await supabase
        .from('financial_records')
        .insert([payload])
        .select();
      if (error) throw error;
      setFinancialRecords(sortByInvoice([data[0], ...financialRecords]));
      setIsFinancialModalOpen(false);
      setFinancialForm({
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
    updatedRecord.total_invoice = (Number(updatedRecord.payment_value) || 0) + 
                                 (Number(updatedRecord.materials_value) || 0) + 
                                 (Number(updatedRecord.materials_citl_value) || 0);
    updatedRecord.total_after_discounts = updatedRecord.total_invoice - (Number(updatedRecord.discounts) || 0);
    try {
      const { error } = await supabase.from('financial_records').update(updatedRecord).eq('id', id);
      if (error) throw error;
      setFinancialRecords(sortByInvoice(financialRecords.map(r => r.id === id ? updatedRecord : r)));
    } catch (error) {
      console.error('Error updating financial record:', error);
    }
  };

  const handleAddRenewal = async () => {
    try {
      const payload = {
        ...renewalForm,
        contract_id: selectedContractId !== 'todos' ? selectedContractId : (contracts.find(c => c.status === 'Ativo')?.id || contracts[0]?.id)
      };
      
      const { data, error } = await supabase.from('contract_renewals').insert([payload]).select();
      if (error) throw error;
      setContractRenewals([data[0], ...contractRenewals]);
      setIsRenewalModalOpen(false);
      setRenewalForm({
        numero_processo: '',
        ano: new Date().getFullYear().toString(),
        termo_aditivo: '',
        status: 'Em Andamento',
        descricao: ''
      });
    } catch (error) {
      console.error('Error adding renewal:', error);
    }
  };

  const handleDeleteRenewal = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta renovação?')) return;
    try {
      const { error } = await supabase.from('contract_renewals').delete().eq('id', id);
      if (error) throw error;
      setContractRenewals(contractRenewals.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting renewal:', error);
    }
  };

  const handleAddRepactuacao = async () => {
    try {
      const payload = {
        ...repactuacaoForm,
        contract_id: selectedContractId !== 'todos' ? selectedContractId : (contracts.find(c => c.status === 'Ativo')?.id || contracts[0]?.id)
      };
      
      const { data, error } = await supabase.from('repactuacoes').insert([payload]).select();
      if (error) throw error;
      setRepactuacoes([data[0], ...repactuacoes]);
      setIsRepactuacaoModalOpen(false);
      setRepactuacaoForm({
        year: new Date().getFullYear(),
        periodo_data_base: '',
        valor_repactuacao: 0,
        termo_apostila: '',
        status: 'Em Análise',
        triggering_factor: ''
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

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Falha ao ler arquivo');
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' }) as any[][];
        if (!rawData || rawData.length < 2) {
          alert('Planilha vazia ou sem dados.');
          setIsImporting(false);
          return;
        }
        const headers = rawData[0].map((h: any) => String(h || '').trim());
        const jsonData = rawData.slice(1)
          .filter(row => row.some(cell => cell !== ''))
          .map(row => {
            const obj: any = {};
            headers.forEach((header, idx) => { obj[header] = row[idx] ?? ''; });
            return obj;
          });
        if (jsonData.length === 0) {
          alert('Nenhum dado encontrado na planilha.');
          setIsImporting(false);
          return;
        }
        setImportPreviewData(jsonData);
        setIsImportPreviewOpen(true);
      } catch (error: any) {
        alert(`Erro ao processar arquivo: ${error.message}`);
      } finally {
        setIsImporting(false);
        if (importFileRef.current) importFileRef.current.value = '';
      }
    };
    reader.onerror = () => { alert('Erro ao ler o arquivo.'); setIsImporting(false); };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveNewContract = async () => {
    if (!newContractForm.contract_number || !newContractForm.company_name) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('contract_info')
        .insert([newContractForm])
        .select()
        .single();
      if (error) throw error;
      setContracts(prev => [data, ...prev]);
      setSelectedContractId(data.id);
      setIsNewContractModalOpen(false);
      setNewContractForm({
  contract_number: '',
  company_name: '',
  cnpj: '',
  start_date: '',
  end_date: '',
  renewals_count: 0,
  contracting_party: '',
  status: 'Ativo',
  gestor_contrato: '',
  gestor_substituto: '',
  fiscal_tecnico: '',
  fiscal_tecnico_sub: '',
  fiscal_administrativo: '',
  fiscal_admin_sub: '',
  portaria_designacao: ''
});
      setNotification({ type: 'success', message: 'Novo contrato criado com sucesso!' });
      setTimeout(() => setNotification(null), 5000);
    } catch (e) {
      console.error('Erro ao salvar contrato:', e);
      setNotification({ type: 'error', message: 'Erro ao salvar contrato.' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmImport = async () => {
    try {
      const parseValue = (val: any): number => {
        if (!val && val !== 0) return 0;
        const str = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };
      const getField = (row: any, keys: string[]): any => {
        for (const key of keys) {
          const found = Object.keys(row).find(k => k.trim().toUpperCase() === key.toUpperCase());
          if (found !== undefined && row[found] !== undefined) return row[found];
        }
        return '';
      };
      const recordsToInsert = importPreviewData.map(row => {
        const payment = parseValue(getField(row, ['VALOR PAGAMENTO FATO GERADOR', 'Valor Pagamento Fato Gerador', 'payment_value']));
        const materials = parseValue(getField(row, ['VALOR MATERIAIS REQUISITADOS', 'Valor Materiais Requisitados', 'materials_value']));
        const citl = parseValue(getField(row, ['VALOR MATERIAIS REQUISITADOS + CITL', 'Valor Materiais Requisitados + CITL', 'materials_citl_value']));
        const discounts = parseValue(getField(row, ['DESCONTOS', 'Descontos', 'discounts']));
        const totalFromSheet = parseValue(getField(row, ['TOTAL DA FATURA', 'Total da Fatura', 'total_invoice']));
        const total = totalFromSheet > 0 ? totalFromSheet : payment + materials + citl;
        const totalAfterFromSheet = parseValue(getField(row, ['TOTAL DA FATURA APÓS DESCONTOS', 'TOTAL DA FATURA APOS DESCONTOS', 'Total da Fatura após descontos', 'total_after_discounts']));
        const totalAfter = totalAfterFromSheet > 0 ? totalAfterFromSheet : total - discounts;
        return {
          contract_id: selectedContractId !== 'todos' ? selectedContractId : (contracts.find(c => c.status === 'Ativo')?.id || contracts[0]?.id),
          year: Number(getField(row, ['ANO', 'Ano', 'year']) || new Date().getFullYear()),
          month: Number(getField(row, ['MÊS', 'MES', 'Mês', 'month']) || new Date().getMonth() + 1),
          invoice_number: String(getField(row, ['NÚMERO DA FATURA', 'Número da Fatura', 'invoice_number'])).trim(),
          process_number: String(getField(row, ['NÚMERO DO PROCESSO', 'Número do Processo', 'process_number'])).trim(),
          payment_value: payment,
          materials_value: materials,
          materials_citl_value: citl,
          total_invoice: total,
          discounts: discounts,
          total_after_discounts: totalAfter,
          fiscal_note_number: String(getField(row, ['NÚMERO DA NOTA FISCAL', 'Número da Nota Fiscal', 'fiscal_note_number'])).trim(),
        };
      });
      const { error } = await supabase.from('financial_records').insert(recordsToInsert);
      if (error) throw error;
      alert(`${recordsToInsert.length} registros importados com sucesso!`);
      setIsImportPreviewOpen(false);
      fetchFinancialRecords();
    } catch (error: any) {
      alert(`Erro ao importar dados: ${error.message}`);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const contractWS = XLSX.utils.json_to_sheet([contract || {}]);
    XLSX.utils.book_append_sheet(wb, contractWS, "Dados do Contrato");
    const financialDataExport = filteredFinancial.map(r => ({
      'Ano': r.year, 'Mês': r.month, 'Nº Fatura': r.invoice_number,
      'Nº Processo': r.process_number || '-', 'Valor Pagamento': r.payment_value,
      'Valor Materiais': r.materials_value, 'Valor Mat + CITL': r.materials_citl_value,
      'Total Bruto': r.total_invoice, 'Descontos': r.discounts,
      'Total Líquido': r.total_after_discounts, 'NF': r.fiscal_note_number
    }));
    const financialWS = XLSX.utils.json_to_sheet(financialDataExport);
    XLSX.utils.book_append_sheet(wb, financialWS, "Execução Financeira");
    const summaryData = Array.from(new Set(filteredFinancial.map(r => r.year))).map(year => {
      const yearRecords = filteredFinancial.filter(r => r.year === year);
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
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(18);
      pdf.setTextColor(153, 27, 27);
      pdf.text('CAV/UFPE', pdfWidth / 2, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Relatório de Execução Financeira Contratual', pdfWidth / 2, 22, { align: 'center' });
      pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pdfWidth / 2, 27, { align: 'center' });
      pdf.addImage(imgData, 'PNG', 0, 35, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Contratual_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const getVigenciaStatus = () => {
    if (!contract) return { color: 'bg-slate-200', text: 'N/A', days: 0 };
    const today = new Date();
    const endDate = parseISO(contract.end_date);
    const daysRemaining = differenceInDays(endDate, today);
    const sixMonthsFromNow = addMonths(today, 6);
    if (isBefore(endDate, today)) return { color: 'bg-rose-500', text: 'Vencido', days: daysRemaining };
    else if (isBefore(endDate, sixMonthsFromNow)) return { color: 'bg-amber-500', text: 'Vencimento Próximo', days: daysRemaining };
    else return { color: 'bg-emerald-500', text: 'Em Vigência', days: daysRemaining };
  };

  const filteredFinancial = financialRecords.filter(r => {
    const yearMatch = !financialFilter.year || r.year === Number(financialFilter.year);
    const monthMatch = !financialFilter.month || r.month === Number(financialFilter.month);
    const contractMatch = selectedContractId === 'todos' || r.contract_id === selectedContractId;
    return yearMatch && monthMatch && contractMatch;
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
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-700" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Filtrar Contrato</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Contrato</label>
            <select
              value={selectedContractId}
              onChange={e => setSelectedContractId(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 min-w-[200px]"
            >
              <option value="todos">Todos os Contratos</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.contract_number} — {c.company_name} ({c.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedContractId === 'todos' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.map(c => (
              <div 
                key={c.id} 
                className={`bg-white p-6 rounded-2xl border shadow-sm cursor-pointer hover:border-amber-400 transition-all ${c.status === 'Ativo' ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'}`}
                onClick={() => setSelectedContractId(c.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                      <Briefcase size={16} />
                    </div>
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{c.contract_number}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${c.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'Encerrado' ? 'bg-slate-200 text-slate-600' : 'bg-rose-100 text-rose-600'}`}>
                    {c.status}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 line-clamp-2 min-h-[40px]">{c.company_name}</h3>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    <span>{c.start_date ? format(parseISO(c.start_date), 'dd/MM/yy') : '-'} → {c.end_date ? format(parseISO(c.end_date), 'dd/MM/yy') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <Building2 size={12} />
                    <span className="truncate">{c.contracting_party}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
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
              <button
                onClick={() => {
                  setNewContractForm({
                    contract_number: '',
                    company_name: '',
                    cnpj: '',
                    start_date: '',
                    end_date: '',
                    renewals_count: 0,
                    contracting_party: '',
                    status: 'Ativo'
                  });
                  setIsNewContractModalOpen(true);
                }}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20"
              >
                <Plus size={16} />
                Novo Contrato
              </button>
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
                onClick={() => { if (isEditingContract) { handleSaveContract(); } else { setIsEditingContract(true); } }}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
                  isEditingContract 
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-slate-200/20'
                } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                ) : (
                  <>{isEditingContract ? <Save size={14} /> : <Edit2 size={14} />}{isEditingContract ? 'Salvar' : 'Editar'}</>
                )}
              </button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Contrato nº</label>
                {isEditingContract ? (
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.contract_number ?? ''} onChange={e => setContractForm({...contractForm, contract_number: e.target.value})} />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.contract_number}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Empresa Contratada</label>
                {isEditingContract ? (
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.company_name ?? ''} onChange={e => setContractForm({...contractForm, company_name: e.target.value})} />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.company_name}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">CNPJ</label>
                {isEditingContract ? (
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.cnpj ?? ''} onChange={e => setContractForm({...contractForm, cnpj: e.target.value})} />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.cnpj}</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Início da Vigência</label>
                {isEditingContract ? (
                  <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.start_date ?? ''} onChange={e => setContractForm({...contractForm, start_date: e.target.value})} />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.start_date ? format(parseISO(contract.start_date), 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Final da Vigência</label>
                {isEditingContract ? (
                  <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.end_date ?? ''} onChange={e => setContractForm({...contractForm, end_date: e.target.value})} />
                ) : (
                  <p className="text-sm font-black text-slate-900">{contract?.end_date ? format(parseISO(contract.end_date), 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Renovações Contratuais</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    <RefreshCw size={10} />
                    {contractRenewals.filter(r => r.contract_id === (selectedContractId !== 'todos' ? selectedContractId : contract?.id) && r.status === 'Concluída').length} Realizadas
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    <RefreshCw size={10} />
                    {Math.max(0, (contract?.renewals_count || 0) - contractRenewals.filter(r => r.contract_id === (selectedContractId !== 'todos' ? selectedContractId : contract?.id) && r.status === 'Concluída').length)} Restantes
                  </div>
                  {isEditingContract && (
                    <div className="ml-2">
                      <input type="number" className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.renewals_count ?? 0} onChange={e => setContractForm({...contractForm, renewals_count: Number(e.target.value)})} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-1 block">Contratante</label>
                {isEditingContract ? (
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.contracting_party ?? ''} onChange={e => setContractForm({...contractForm, contracting_party: e.target.value})} />
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

          <div className="px-8 pb-8">
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Users className="text-amber-500" size={20} />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Equipe de Gestão e Fiscalização</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gestor do Contrato</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.gestor_contrato ?? ''} onChange={e => setContractForm({...contractForm, gestor_contrato: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.gestor_contrato || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gestor Substituto</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.gestor_substituto ?? ''} onChange={e => setContractForm({...contractForm, gestor_substituto: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.gestor_substituto || '-'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Técnico</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.fiscal_tecnico ?? ''} onChange={e => setContractForm({...contractForm, fiscal_tecnico: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.fiscal_tecnico || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Técnico Substituto</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.fiscal_tecnico_sub ?? ''} onChange={e => setContractForm({...contractForm, fiscal_tecnico_sub: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.fiscal_tecnico_sub || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Administrativo</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.fiscal_administrativo ?? ''} onChange={e => setContractForm({...contractForm, fiscal_administrativo: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.fiscal_administrativo || '-'}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fiscal Administrativo Substituto</label>
                      {isEditingContract ? (
                        <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.fiscal_admin_sub ?? ''} onChange={e => setContractForm({...contractForm, fiscal_admin_sub: e.target.value})} />
                      ) : (
                        <p className="text-xs font-black text-slate-900">{contract?.fiscal_admin_sub || '-'}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Portaria de Designação</label>
                    {isEditingContract ? (
                      <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={contractForm.portaria_designacao ?? ''} onChange={e => setContractForm({...contractForm, portaria_designacao: e.target.value})} />
                    ) : (
                      <p className="text-xs font-black text-slate-900">{contract?.portaria_designacao || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
              <button onClick={() => setIsFinancialModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                <Plus size={16} />Adicionar Registro
              </button>
              <button onClick={() => importFileRef.current?.click()} disabled={isImporting} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50">
                {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
                {isImporting ? 'Importando...' : 'Importar Planilha'}
              </button>
              <input type="file" ref={importFileRef} onChange={handleImportExcel} className="hidden" accept=".xlsx,.xls,.csv" />
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                <Download size={16} />Excel
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                <Download size={16} />PDF
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-900" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Filtros:</span>
            </div>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={financialFilter.year} onChange={e => setFinancialFilter({...financialFilter, year: e.target.value})}>
              <option value="">Todos os Anos</option>
              {Array.from(new Set(financialRecords.map(r => r.year))).sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={financialFilter.month} onChange={e => setFinancialFilter({...financialFilter, month: e.target.value})}>
              <option value="">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{format(new Date(2022, m - 1), 'MMMM', { locale: ptBR })}</option>
              ))}
            </select>
            {(financialFilter.year || financialFilter.month) && (
              <button onClick={() => setFinancialFilter({ year: '', month: '' })} className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline">
                Limpar Filtros
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest">Ano/Mês</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-800 uppercase tracking-widest cursor-pointer select-none">
                    <div className="flex items-center gap-1">Fatura<ChevronUp size={12} className="text-amber-500" /></div>
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
                    <td className="px-4 py-4"><input className="w-20 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.invoice_number ?? ''} onChange={e => handleUpdateFinancialRecord(record.id, 'invoice_number', e.target.value)} /></td>
                    <td className="px-4 py-4"><input className="w-32 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.process_number ?? ''} onChange={e => handleUpdateFinancialRecord(record.id, 'process_number', e.target.value)} /></td>
                    <td className="px-4 py-4"><input type="number" className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.payment_value ?? 0} onChange={e => handleUpdateFinancialRecord(record.id, 'payment_value', Number(e.target.value))} /></td>
                    <td className="px-4 py-4"><input type="number" className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.materials_value ?? 0} onChange={e => handleUpdateFinancialRecord(record.id, 'materials_value', Number(e.target.value))} /></td>
                    <td className="px-4 py-4"><input type="number" className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.materials_citl_value ?? 0} onChange={e => handleUpdateFinancialRecord(record.id, 'materials_citl_value', Number(e.target.value))} /></td>
                    <td className="px-4 py-4"><span className="text-xs font-black text-slate-900">{record.total_invoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                    <td className="px-4 py-4"><input type="number" className="w-24 bg-transparent border-none focus:ring-0 text-xs font-bold text-rose-600 p-0" value={record.discounts ?? 0} onChange={e => handleUpdateFinancialRecord(record.id, 'discounts', Number(e.target.value))} /></td>
                    <td className="px-4 py-4"><span className="text-xs font-black text-emerald-600">{record.total_after_discounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
                    <td className="px-4 py-4"><input className="w-20 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-900 p-0" value={record.fiscal_note_number ?? ''} onChange={e => handleUpdateFinancialRecord(record.id, 'fiscal_note_number', e.target.value)} /></td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => handleDeleteFinancialRecord(record.id)} className="p-2 text-slate-800 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest">Totais Gerais</td>
                  <td className="px-4 py-4 text-xs font-black">{financialTotals.payment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-4 text-xs font-black">{financialTotals.materials.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-4 text-xs font-black">{financialTotals.citl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-4 text-xs font-black">{financialTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-4 text-xs font-black text-rose-400">{financialTotals.discounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-4 text-xs font-black text-emerald-400">{financialTotals.afterDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            {filteredFinancial.length === 0 && (
              <div className="py-12 text-center text-slate-700 italic text-xs">Nenhum registro financeiro encontrado.</div>
            )}
          </div>
        </section>
        </>
        )}

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="text-amber-500" size={24} />Repactuações
              </h2>
              <p className="text-xs text-slate-900 font-bold uppercase tracking-widest">Acompanhamento de Processos e Reajustes</p>
            </div>
            <button onClick={() => setIsRepactuacaoModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
              <Plus size={16} />Nova Repactuação
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-900" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Filtros:</span>
            </div>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoFilter.year} onChange={e => setRepactuacaoFilter({...repactuacaoFilter, year: e.target.value})}>
              <option value="">Todos os Anos</option>
              {Array.from(new Set(repactuacoes.map(r => r.year))).sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoFilter.status} onChange={e => setRepactuacaoFilter({...repactuacaoFilter, status: e.target.value as any})}>
              <option value="">Todos os Status</option>
              {Object.keys(statusColors).map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Processo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Período / Data Base</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Termo de Apostila</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fato Gerador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRepactuacoes.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4"><span className="text-xs font-black text-slate-900">{rep.process_number}</span></td>
                    <td className="px-6 py-4"><span className="text-xs font-black text-slate-900">{rep.year}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{rep.periodo_data_base || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-emerald-600">
                          {rep.valor_repactuacao?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest truncate max-w-[100px]">{rep.termo_apostila || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><p className="text-xs font-medium text-slate-700 max-w-xs truncate">{rep.triggering_factor}</p></td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${statusColors[rep.status]}`}>{rep.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteRepactuacao(rep.id)} className="p-2 text-slate-800 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRepactuacoes.length === 0 && (
              <div className="py-12 text-center text-slate-700 italic text-xs">Nenhuma repactuação encontrada.</div>
            )}
          </div>
        </section>

        {/* Renovações Contratuais Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="text-amber-500" size={24} />Renovações Contratuais
              </h2>
              <p className="text-xs text-slate-900 font-bold uppercase tracking-widest">Acompanhamento de Termos Aditivos</p>
            </div>
            <button onClick={() => setIsRenewalModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
              <Plus size={16} />Nova Renovação
            </button>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-900" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Filtros:</span>
            </div>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={renewalFilter.year} onChange={e => setRenewalFilter({...renewalFilter, year: e.target.value})}>
              <option value="">Todos os Anos</option>
              {Array.from(new Set(contractRenewals.map(r => r.ano))).sort().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={renewalFilter.status} onChange={e => setRenewalFilter({...renewalFilter, status: e.target.value as any})}>
              <option value="">Todos os Status</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Pendente">Pendente</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Processo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ano</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Termo Aditivo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractRenewals
                  .filter(r => (selectedContractId === 'todos' || r.contract_id === selectedContractId))
                  .filter(r => !renewalFilter.year || r.ano === renewalFilter.year)
                  .filter(r => !renewalFilter.status || r.status === renewalFilter.status)
                  .map((ren) => (
                  <tr key={ren.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4"><span className="text-xs font-black text-slate-900">{ren.numero_processo}</span></td>
                    <td className="px-6 py-4"><span className="text-xs font-black text-slate-900">{ren.ano}</span></td>
                    <td className="px-6 py-4"><span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{ren.termo_aditivo || '-'}</span></td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        ren.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' :
                        ren.status === 'Em Andamento' ? 'bg-amber-100 text-amber-700' :
                        ren.status === 'Cancelada' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{ren.status}</span>
                    </td>
                    <td className="px-6 py-4"><p className="text-xs font-medium text-slate-700 max-w-xs truncate">{ren.descricao}</p></td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeleteRenewal(ren.id)} className="p-2 text-slate-800 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contractRenewals.filter(r => (selectedContractId === 'todos' || r.contract_id === selectedContractId)).length === 0 && (
              <div className="py-12 text-center text-slate-700 italic text-xs">Nenhuma renovação encontrada.</div>
            )}
          </div>
        </section>
      </div>

      {/* Financial Modal */}
      <AnimatePresence>
        {isFinancialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFinancialModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-emerald-700">Novo Registro Financeiro</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lançamento de Fatura</p>
                </div>
                <button onClick={() => setIsFinancialModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano</label>
                  <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50" value={financialForm.year ?? new Date().getFullYear()} onChange={e => setFinancialForm({...financialForm, year: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Mês</label>
                  <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50" value={financialForm.month ?? new Date().getMonth() + 1} onChange={e => setFinancialForm({...financialForm, month: Number(e.target.value)})}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>{format(new Date(2022, m - 1), 'MMMM', { locale: ptBR })}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Nº Fatura</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50" value={financialForm.invoice_number ?? ''} onChange={e => setFinancialForm({...financialForm, invoice_number: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Número do Processo</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Ex: 23076.012345/2026-01" value={financialForm.process_number ?? ''} onChange={e => setFinancialForm({...financialForm, process_number: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Nº Nota Fiscal</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/50" value={financialForm.fiscal_note_number ?? ''} onChange={e => setFinancialForm({...financialForm, fiscal_note_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Valor Fato Gerador
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="0,00"
                      value={financialForm.payment_value === 0 ? '' : financialForm.payment_value}
                      onChange={e => setFinancialForm({ ...financialForm, payment_value: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Valor Materiais
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="0,00"
                      value={financialForm.materials_value === 0 ? '' : financialForm.materials_value}
                      onChange={e => setFinancialForm({ ...financialForm, materials_value: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Valor Mat+CITL
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="0,00"
                      value={financialForm.materials_citl_value === 0 ? '' : financialForm.materials_citl_value}
                      onChange={e => setFinancialForm({ ...financialForm, materials_citl_value: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Descontos
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="0,00"
                      value={financialForm.discounts === 0 ? '' : financialForm.discounts}
                      onChange={e => setFinancialForm({ ...financialForm, discounts: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Preview do Total */}
                <div className="col-span-2">
                  {(financialForm.payment_value || financialForm.materials_citl_value || financialForm.discounts) && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Preview do Total</p>
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Total Fatura (FG + Mat+CITL):</span>
                        <span className="font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format((Number(financialForm.payment_value) || 0) + (Number(financialForm.materials_citl_value) || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>(-) Descontos:</span>
                        <span className="font-mono text-rose-600">
                          -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(Number(financialForm.discounts) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900 border-t border-amber-200 pt-2">
                        <span>Total Líquido:</span>
                        <span className="font-mono text-amber-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(
                              (Number(financialForm.payment_value) || 0) +
                              (Number(financialForm.materials_citl_value) || 0) -
                              (Number(financialForm.discounts) || 0)
                            )}
                        </span>
                      </div>
                    </div>
                  )}
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

      {/* New Contract Modal */}
      <AnimatePresence>
        {isNewContractModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewContractModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="bg-amber-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-black text-amber-700 uppercase tracking-widest">Novo Contrato</h3>
                <button onClick={() => setIsNewContractModalOpen(false)} className="text-slate-500 hover:text-slate-900"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Número do Contrato</label>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="Ex: 001/2026"
                      value={newContractForm.contract_number}
                      onChange={e => setNewContractForm({...newContractForm, contract_number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      value={newContractForm.status}
                      onChange={e => setNewContractForm({...newContractForm, status: e.target.value as any})}>
                      <option value="Ativo">Ativo</option>
                      <option value="Encerrado">Encerrado</option>
                      <option value="Suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa Contratada</label>
                  <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Nome da empresa"
                    value={newContractForm.company_name}
                    onChange={e => setNewContractForm({...newContractForm, company_name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CNPJ</label>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="00.000.000/0000-00"
                      value={newContractForm.cnpj}
                      onChange={e => setNewContractForm({...newContractForm, cnpj: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contratante</label>
                    <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      placeholder="Ex: UFPE/CAV"
                      value={newContractForm.contracting_party}
                      onChange={e => setNewContractForm({...newContractForm, contracting_party: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Início</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      value={newContractForm.start_date}
                      onChange={e => setNewContractForm({...newContractForm, start_date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Fim</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      value={newContractForm.end_date}
                      onChange={e => setNewContractForm({...newContractForm, end_date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nº Renovações</label>
                    <input type="number" min="0" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50"
                      value={newContractForm.renewals_count}
                      onChange={e => setNewContractForm({...newContractForm, renewals_count: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex gap-3">
                <button onClick={() => setIsNewContractModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={handleSaveNewContract}
                  disabled={!newContractForm.contract_number || !newContractForm.company_name || isSaving}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar Contrato'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Repactuacao Modal */}
      <AnimatePresence>
        {isRepactuacaoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRepactuacaoModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-amber-700">Nova Repactuação</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Abertura de Processo</p>
                </div>
                <button onClick={() => setIsRepactuacaoModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Nº Processo</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoForm.process_number ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, process_number: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano</label>
                    <input type="number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoForm.year ?? new Date().getFullYear()} onChange={e => setRepactuacaoForm({...repactuacaoForm, year: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Período / Data Base</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Ex: 2024/2025" value={repactuacaoForm.periodo_data_base ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, periodo_data_base: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Valor da Repactuação</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                      <input type="number" className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoForm.valor_repactuacao ?? 0} onChange={e => setRepactuacaoForm({...repactuacaoForm, valor_repactuacao: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Termo de Apostila</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Ex: Apostila nº 01/2026" value={repactuacaoForm.termo_apostila ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, termo_apostila: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Status</label>
                  <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={repactuacaoForm.status ?? 'Em Análise'} onChange={e => setRepactuacaoForm({...repactuacaoForm, status: e.target.value as any})}>
                    {Object.keys(statusColors).map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Fato Gerador</label>
                  <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 min-h-[100px]" value={repactuacaoForm.triggering_factor ?? ''} onChange={e => setRepactuacaoForm({...repactuacaoForm, triggering_factor: e.target.value})} />
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

      {/* Renewal Modal */}
      <AnimatePresence>
        {isRenewalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRenewalModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase text-amber-700">Nova Renovação</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Termo Aditivo</p>
                </div>
                <button onClick={() => setIsRenewalModalOpen(false)} className="text-slate-700 hover:text-slate-900 transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Nº Processo</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={renewalForm.numero_processo ?? ''} onChange={e => setRenewalForm({...renewalForm, numero_processo: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Ano</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={renewalForm.ano ?? ''} onChange={e => setRenewalForm({...renewalForm, ano: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Termo Aditivo</label>
                  <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Ex: Termo Aditivo nº 01/2026" value={renewalForm.termo_aditivo ?? ''} onChange={e => setRenewalForm({...renewalForm, termo_aditivo: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Status</label>
                  <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50" value={renewalForm.status ?? 'Em Andamento'} onChange={e => setRenewalForm({...renewalForm, status: e.target.value as any})}>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluída">Concluída</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Descrição / Justificativa</label>
                  <textarea rows={3} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" value={renewalForm.descricao ?? ''} onChange={e => setRenewalForm({...renewalForm, descricao: e.target.value})} />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={() => setIsRenewalModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleAddRenewal} className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">Salvar Renovação</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {isImportPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsImportPreviewOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h3 className="text-lg font-black tracking-tight uppercase">Preview de Importação</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confirme os dados antes de salvar</p>
                </div>
                <button onClick={() => setIsImportPreviewOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
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
                        const str = String(val).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
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
                          <td className="px-3 py-3 text-xs font-bold">{(row['Ano'] || row['year'] || new Date().getFullYear())}/{(row['Mês'] || row['month'] || new Date().getMonth() + 1)}</td>
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
