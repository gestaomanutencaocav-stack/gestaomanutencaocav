'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Calendar, 
  Package, 
  BarChart3, 
  Building2,
  ChevronRight,
  X,
  Box,
  FileSpreadsheet,
  ClipboardCheck,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

const navItems = [
  { name: 'Painel', icon: LayoutDashboard, href: '/' },
  { name: 'Solicitações', icon: ClipboardList, href: '/solicitacoes' },
  { name: 'Rotinas de Inspeções', icon: ClipboardCheck, href: '/inspecoes' },
  { name: 'Agenda', icon: Calendar, href: '/agenda' },
  { name: 'Materiais em Estoque', icon: Box, href: '/materiais' },
  { name: 'Materiais Finalísticos', icon: FileSpreadsheet, href: '/materiais-finalisticos' },
  { name: 'Gestão Contratual', icon: FileText, href: '/gestao-contratual' },
  { name: 'Relatórios', icon: BarChart3, href: '/relatorios' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<{ role: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const sidebarContent = (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 rounded-lg p-2 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-slate-900 text-base font-black tracking-tight leading-none">Manutenção CAV</h1>
            <p className="text-slate-700 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão Eficiente e Integrada</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-900">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-amber-600' : 'text-slate-500 group-hover:text-slate-700'} />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <div className="relative size-9 rounded-full overflow-hidden bg-slate-200 border border-slate-200">
            <Image 
              src="https://picsum.photos/seed/user/200/200"
              alt="User Profile"
              fill
              className="object-cover transition-all duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-slate-900 uppercase tracking-tight">
              {user?.role === 'gestao' ? 'Gestor Predial' : user?.role === 'encarregado' ? 'Encarregado de Manutenção' : 'Carregando...'}
            </p>
            <p className="text-[10px] text-slate-700 font-mono truncate">{user?.role || '...'}</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-64 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
