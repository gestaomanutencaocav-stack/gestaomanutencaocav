'use client';

import React from 'react';
import { Search, Bell, Settings, LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 bg-white/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-amber-600 lg:hidden transition-colors"
        >
          <Menu size={20} />
        </button>
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={18} />
          </span>
          <input 
            className="bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-amber-500/50 text-slate-900 outline-none transition-all placeholder:text-slate-400" 
            placeholder="Busca rápida..." 
            type="text"
          />
        </div>
        <button className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-amber-600 relative transition-colors border border-slate-200">
          <Bell size={20} />
          <span className="absolute top-2 right-2 size-2 bg-amber-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:text-amber-600 transition-colors border border-slate-200">
          <Settings size={20} />
        </button>
        <button 
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
