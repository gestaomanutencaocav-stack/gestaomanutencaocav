'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Lock, Eye, EyeOff, LogIn, 
  Shield, Building2, AlertCircle 
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
    <div className="min-h-screen flex flex-col md:flex-row h-screen overflow-hidden bg-white">
      {/* COLUNA ESQUERDA - Painel Institucional */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden md:flex md:w-[45%] lg:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1C0A0A 0%, #2D0D0D 40%, #1A0505 100%)'
        }}
      >
        {/* Textura Geométrica */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(139,0,0,0.08) 0px, rgba(139,0,0,0.08) 1px, transparent 1px, transparent 10px)'
          }}
        />

        {/* Fundo sem imagem externa */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-slate-900/20" />
        </div>

        {/* Conteúdo Central */}
        <div className="relative z-10 text-center max-w-lg">
          <div className="mb-8">
            <Image
              src="/Logomarca_CAV_padrão.png"
              alt="Logo CAV"
              width={288}
              height={100}
              className="w-72 mx-auto filter brightness-0 invert"
              priority
            />
          </div>

          <h2 className="text-white font-black text-2xl tracking-widest uppercase">
            CENTRO ACADÊMICO DA VITÓRIA
          </h2>
          <p className="text-red-300 text-sm tracking-widest uppercase mt-1">
            Universidade Federal de Pernambuco
          </p>

          <div className="w-16 h-0.5 bg-red-700 mx-auto my-6" />

          <div className="space-y-1">
            <p className="text-white/70 text-sm uppercase tracking-widest">
              Sistema Integrado de
            </p>
            <h1 className="text-white font-black text-xl uppercase tracking-widest">
              Gestão de Manutenção Predial
            </h1>
          </div>

          {/* Badges Institucionais */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest border border-white/5">
              <Shield size={12} className="text-red-500" />
              <span>Sistema Seguro</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest border border-white/5">
              <Building2 size={12} className="text-red-500" />
              <span>Uso Institucional</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest border border-white/5">
              <Lock size={12} className="text-red-500" />
              <span>Acesso Restrito</span>
            </div>
          </div>
        </div>

        {/* Slogan Rodapé */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-red-400/60 text-xs tracking-[0.5em] uppercase font-black italic">
            VIRTUS IMPAVIDA
          </p>
        </div>
      </motion.div>

      {/* COLUNA DIREITA - Painel de Login */}
      <motion.div 
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex-1 md:w-[55%] lg:w-[45%] flex flex-col items-center justify-center relative bg-white md:bg-white"
      >
        {/* Mobile Background Gradient Overlay */}
        <div className="md:hidden absolute inset-0 z-0" style={{ background: 'linear-gradient(145deg, #1C0A0A 0%, #2D0D0D 40%, #1A0505 100%)' }} />

        <div className="relative z-10 w-full max-w-md px-8 md:px-12 py-16">
          {/* Mobile Logo */}
          <div className="md:hidden flex justify-center mb-8">
            <Image
              src="/Logomarca_CAV_padrão.png"
              alt="Logo CAV"
              width={160}
              height={60}
              className="w-40 filter brightness-0 invert"
            />
          </div>

          <div className="bg-white rounded-3xl md:rounded-none shadow-2xl md:shadow-none p-8 md:p-0 relative overflow-hidden md:overflow-visible mx-4 md:mx-0">
            {/* Barra Accent Lateral (Desktop) */}
            <div className="hidden md:block absolute -left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-red-900 to-red-700 rounded-l" />

            {/* Desktop Logo */}
            <div className="hidden md:block mb-8">
              <Image
                src="/Logomarca_CAV_padrão.png"
                alt="Logo CAV"
                width={160}
                height={60}
                className="w-40 mx-auto"
              />
            </div>

            <div className="mb-8">
              <h3 className="text-slate-900 text-3xl font-black tracking-tight">
                Acesso ao Sistema
              </h3>
              <p className="text-slate-500 text-sm font-medium mt-2">
                Informe suas credenciais para continuar
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm font-medium"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-slate-700 font-black text-[10px] uppercase tracking-widest mb-2">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition-all focus:border-red-800 focus:ring-2 focus:ring-red-800/20"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-slate-700 font-black text-[10px] uppercase tracking-widest mb-2">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition-all focus:border-red-800 focus:ring-2 focus:ring-red-800/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                type="submit"
                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 shadow-lg shadow-red-900/30 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <LogIn size={18} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="border-t border-slate-100 mt-8 pt-6 text-center">
              <p className="text-slate-400 text-[10px] font-medium">
                © 2025 CAV/UFPE — Todos os direitos reservados
              </p>
              <p className="text-slate-300 text-[9px] mt-1">
                Desenvolvido pela Coordenação de Infraestrutura
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}