'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Lock, Eye, EyeOff, LogIn, 
  AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        const data = await res.json();
        setError(data.error || 'Falha no login');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-8 md:p-10 border border-slate-50"
      >
        <div className="text-center mb-8">
          <Image
            src="https://qziaddfqzdmgvylfqbun.supabase.co/storage/v1/object/public/public-assets/Logomarca_CAV_padrao.png"
            alt="Logo CAV"
            width={180}
            height={70}
            className="mx-auto mb-6"
            priority
          />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed px-4">
            Sistema Integrado de Gestão de Manutenção Predial
          </p>
        </div>

        <div className="h-px bg-slate-100 w-full mb-8" />

        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Acesso ao Sistema
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Informe suas credenciais para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm font-medium"
            >
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="block text-slate-700 font-black text-[10px] uppercase tracking-widest ml-1">
              Usuário
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-800 transition-colors">
                <User size={18} />
              </div>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário ou e-mail"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 pl-11 text-sm text-slate-900 outline-none transition-all focus:border-red-800 focus:ring-4 focus:ring-red-800/5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-700 font-black text-[10px] uppercase tracking-widest ml-1">
              Senha
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-800 transition-colors">
                <Lock size={18} />
              </div>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition-all focus:border-red-800 focus:ring-4 focus:ring-red-800/5"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
            type="submit"
            className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] text-white bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 shadow-lg shadow-red-900/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>ENTRAR</span>
                <LogIn size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            Sistema desenvolvido por Jonathan Carvalho, Administrador, Diretoria do CAV/UFPE
          </p>
        </div>
      </motion.div>
    </div>
  );
}
