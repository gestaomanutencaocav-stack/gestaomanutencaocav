'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/solicitacoes');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  const calendarInterval = view === 'month' 
    ? { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) }
    : { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };

  const calendarDays = eachDayOfInterval(calendarInterval);

  const getEventsForDay = (day: Date) => {
    return requests.filter(req => {
      if (!req.createdAt) return false;
      return isSameDay(new Date(req.createdAt), day);
    });
  };

  const upcomingEvents = requests
    .filter(req => req.createdAt && new Date(req.createdAt) >= new Date())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5);

  return (
    <DashboardLayout title="Agenda de Manutenção">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="text-slate-900 text-3xl font-black leading-tight tracking-tight uppercase">Agenda</h1>
            <p className="text-slate-500 font-medium mt-1">Cronograma de manutenções preventivas e corretivas</p>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                view === 'month' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Mês
            </button>
            <button 
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                view === 'week' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {view === 'month' 
                  ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                  : `Semana de ${format(calendarInterval.start, 'dd/MM')} a ${format(calendarInterval.end, 'dd/MM')}`
                }
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentDate(view === 'month' ? subMonths(currentDate, 1) : new Date(currentDate.setDate(currentDate.getDate() - 7)))}
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
                  onClick={() => setCurrentDate(view === 'month' ? addMonths(currentDate, 1) : new Date(currentDate.setDate(currentDate.getDate() + 7)))}
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
                const dayEvents = getEventsForDay(day);
                
                return (
                  <div 
                    key={i} 
                    className={`min-h-[120px] p-2 border-r border-b border-slate-100 last:border-r-0 ${
                      view === 'month' && !isCurrentMonth ? 'bg-slate-50 opacity-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-black font-mono ${
                        isToday ? 'bg-amber-500 text-white size-5 flex items-center justify-center rounded shadow-lg shadow-amber-500/20' : 
                        (view === 'month' && isCurrentMonth) || view === 'week' ? 'text-slate-600' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event) => (
                        <Link 
                          key={event.id}
                          href={`/solicitacoes/${event.id}`}
                          className={`block px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded border truncate transition-all hover:scale-[1.02] ${
                            event.status === 'Autorizado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            event.status === 'Em Andamento' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}
                        >
                          {event.description}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                <CalendarIcon className="text-amber-600" size={18} />
                Próximas Manutenções
              </h3>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono italic">Carregando...</div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest font-mono italic">Nenhuma manutenção programada.</div>
                ) : (
                  upcomingEvents.map((event: any) => (
                    <Link 
                      href={`/solicitacoes/${event.id}`}
                      key={event.id} 
                      className="block p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors tracking-tight truncate flex-1">
                          {event.description}
                        </h4>
                        <span className="text-[8px] font-black text-amber-600 font-mono ml-2">{event.id}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">
                          <Clock size={12} className="text-slate-400" />
                          <span>
                            {event.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          <MapPin size={12} className="text-slate-400" />
                          <span className="truncate">{event.unit}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="bg-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20">
              <h3 className="font-black text-xs uppercase tracking-widest mb-2">Programação Local</h3>
              <p className="text-xs font-bold leading-relaxed opacity-90">
                A agenda agora está integrada diretamente com as solicitações de manutenção do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
