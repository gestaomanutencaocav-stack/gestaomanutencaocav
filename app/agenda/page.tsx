'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchGoogleEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agenda/events');
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleEvents();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        fetchGoogleEvents();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (error) {
      console.error(error);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  return (
    <DashboardLayout title="Agenda de Manutenção">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight uppercase">Agenda</h1>
            <p className="text-slate-500 font-medium mt-1">Cronograma de manutenções preventivas e corretivas</p>
          </div>
          <div className="flex gap-2">
            {!isAuthenticated ? (
              <button 
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm"
              >
                <ExternalLink size={16} className="text-amber-600" />
                <span>Conectar Google Agenda</span>
              </button>
            ) : (
              <button 
                onClick={fetchGoogleEvents}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm"
              >
                <RefreshCw size={16} className={`text-amber-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Sincronizado</span>
              </button>
            )}
            <button className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20">
              <Plus size={18} />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-[10px] font-black text-amber-600 hover:bg-amber-50 rounded-lg transition-colors uppercase tracking-widest"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);
                
                return (
                  <div 
                    key={i} 
                    className={`min-h-[100px] p-2 border-r border-b border-slate-100 last:border-r-0 ${
                      !isCurrentMonth ? 'bg-slate-50 opacity-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-black font-mono ${
                        isToday ? 'bg-amber-500 text-white size-5 flex items-center justify-center rounded shadow-lg shadow-amber-500/20' : 
                        isCurrentMonth ? 'text-slate-600' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    {/* Placeholder for local events */}
                    {isToday && (
                      <div className="mt-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-tighter rounded border border-amber-100 truncate">
                        Manutenção AC
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events List / Google Integration */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                <CalendarIcon className="text-amber-600" size={18} />
                Próximos Eventos
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono italic">Carregando eventos...</div>
                ) : !isAuthenticated ? (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-slate-500 text-xs font-medium">Conecte sua conta Google para sincronizar sua agenda.</p>
                    <button 
                      onClick={handleConnectGoogle}
                      className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest"
                    >
                      Conectar agora
                    </button>
                  </div>
                ) : googleEvents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono italic">Nenhum evento encontrado.</div>
                ) : (
                  googleEvents.map((event: any) => (
                    <div key={event.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-500/30 transition-all group">
                      <h4 className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-600 transition-colors tracking-tight">
                        {event.summary}
                      </h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">
                          <Clock size={12} className="text-slate-400" />
                          <span>
                            {event.start.dateTime ? format(new Date(event.start.dateTime), "dd 'de' MMM, HH:mm", { locale: ptBR }) : format(new Date(event.start.date), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            <MapPin size={12} className="text-slate-400" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20">
              <h3 className="font-black text-xs uppercase tracking-widest mb-2">Dica Técnica</h3>
              <p className="text-xs font-bold leading-relaxed opacity-90">
                Sincronize sua agenda para receber notificações de manutenções preventivas diretamente no seu terminal móvel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
