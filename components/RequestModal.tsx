'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestModal({ isOpen, onClose, onSuccess }: RequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    unit: '',
    responsibleServer: '',
    type: 'Geral',
    professional: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/solicitacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avatar: formData.professional ? 'https://picsum.photos/seed/tech/100/100' : null,
        }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
        setFormData({ description: '', unit: '', responsibleServer: '', type: 'Geral', professional: '' });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Nova Solicitação</h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Problema</label>
                <textarea
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none min-h-[120px] font-medium placeholder:text-slate-300"
                  placeholder="Descreva o que precisa ser feito..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unidade Demandante</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium placeholder:text-slate-300"
                    placeholder="Ex: Bloco A"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option className="bg-white">Geral</option>
                    <option className="bg-white">Hidráulico</option>
                    <option className="bg-white">Elétrico</option>
                    <option className="bg-white">Climatização</option>
                    <option className="bg-white">Civil</option>
                    <option className="bg-white">Marcenaria</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Servidor Responsável</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium placeholder:text-slate-300"
                  placeholder="Nome do servidor que solicita"
                  value={formData.responsibleServer}
                  onChange={(e) => setFormData({ ...formData, responsibleServer: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Profissional (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:ring-1 focus:ring-amber-500/50 outline-none font-medium placeholder:text-slate-300"
                  placeholder="Nome do técnico"
                  value={formData.professional}
                  onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Criar Solicitação'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
