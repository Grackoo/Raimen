import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailyCashCutAlertBannerProps {
  onGoToCashRegister: () => void;
}

interface AlertInfo {
  show: boolean;
  type: 'previous_day' | 'evening';
  title: string;
  message: string;
}

export function DailyCashCutAlertBanner({ onGoToCashRegister }: DailyCashCutAlertBannerProps) {
  const [alertInfo, setAlertInfo] = useState<AlertInfo>({
    show: false,
    type: 'evening',
    title: '',
    message: ''
  });

  const checkCashCutNeeded = async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Beginning of today in local time
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      // 1. Check for ANY register with status = 'open'
      const { data: openRegisters, error: openErr } = await supabase
        .from('cash_registers')
        .select('id, opened_at, status, branch_id, opening_amount')
        .eq('status', 'open')
        .order('opened_at', { ascending: false });

      if (openErr) {
        console.error('Error checking open registers:', openErr);
        return;
      }

      // Check if any open register exists
      if (openRegisters && openRegisters.length > 0) {
        // Find if there's any register opened BEFORE today (previous day/shift)
        const unclosedFromPast = openRegisters.find(reg => new Date(reg.opened_at) < startOfToday);

        if (unclosedFromPast) {
          const openedDate = new Date(unclosedFromPast.opened_at);
          const dateStr = openedDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
          const timeStr = openedDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
          
          setAlertInfo({
            show: true,
            type: 'previous_day',
            title: '⚠️ CORTE DE CAJA PENDIENTE (Día Anterior)',
            message: `Tienes una caja que quedó abierta desde el ${dateStr} a las ${timeStr} sin corte de caja realizado. Debe efectuarse el corte para cerrar ese turno.`
          });
          return;
        }

        // The open register was opened today. Alert only if past 7:00 PM (19:00)
        if (currentHour >= 19) {
          setAlertInfo({
            show: true,
            type: 'evening',
            title: '⚠️ ALERTA DE CORTE DE CAJA (Pasadas las 7:00 PM)',
            message: 'La jornada ha concluido o pasaron las 7:00 PM y la caja del día continúa abierta. Recuerda realizar el corte de caja antes de finalizar el turno.'
          });
          return;
        }

        // If opened today and it's before 7:00 PM, no alert
        setAlertInfo(prev => ({ ...prev, show: false }));
        return;
      }

      // 2. If NO registers are open:
      // Check if a cut was already made today
      const { data: closedToday, error: closedErr } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'closed')
        .gte('closed_at', startOfToday.toISOString())
        .limit(1);

      if (closedErr) {
        console.error('Error checking closed registers:', closedErr);
        return;
      }

      if (closedToday && closedToday.length > 0) {
        // Cash cut already done for today and no open registers
        setAlertInfo(prev => ({ ...prev, show: false }));
        return;
      }

      // 3. No registers open and no closed registers today.
      // If it's past 7:00 PM, check if any sales occurred today
      if (currentHour >= 19) {
        const { data: salesToday } = await supabase
          .from('sales')
          .select('id')
          .gte('created_at', startOfToday.toISOString())
          .limit(1);

        if (salesToday && salesToday.length > 0) {
          setAlertInfo({
            show: true,
            type: 'evening',
            title: '⚠️ ALERTA DE CORTE DE CAJA (Pasadas las 7:00 PM)',
            message: 'Se registraron ventas en la jornada de hoy y aún no se ha efectuado el corte de caja del día.'
          });
          return;
        }
      }

      // Otherwise no alert
      setAlertInfo(prev => ({ ...prev, show: false }));
    } catch (err) {
      console.error('Error in checkCashCutNeeded:', err);
    }
  };

  useEffect(() => {
    checkCashCutNeeded();

    // Check periodically every 30 seconds
    const interval = setInterval(checkCashCutNeeded, 30000);

    // Subscribe to realtime changes on cash_registers so the alert disappears the moment the cut is performed
    const channel = supabase
      .channel('realtime_cash_cut_banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_registers' }, () => {
        checkCashCutNeeded();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!alertInfo.show) return null;

  const isPreviousDay = alertInfo.type === 'previous_day';

  return (
    <div className={`${
      isPreviousDay ? 'bg-red-600 text-white border-red-700' : 'bg-amber-500 text-slate-950 border-amber-600'
    } px-4 py-3 border-b shadow-md flex flex-wrap items-center justify-between gap-3 animate-pulse z-40 shrink-0 transition-colors`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 ${isPreviousDay ? 'bg-red-700/60 text-white' : 'bg-amber-600/30 text-slate-950'} rounded-full shrink-0`}>
          {isPreviousDay ? <ShieldAlert size={22} /> : <AlertTriangle size={20} />}
        </div>
        <div>
          <p className="font-extrabold text-sm md:text-base leading-tight flex items-center gap-1.5">
            <Clock size={16} /> {alertInfo.title}
          </p>
          <p className="text-xs md:text-sm font-semibold opacity-95 mt-0.5">
            {alertInfo.message}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={onGoToCashRegister}
          className={`${
            isPreviousDay ? 'bg-white text-red-700 hover:bg-red-50' : 'bg-slate-950 text-white hover:bg-slate-800'
          } font-extrabold px-4 py-2 rounded-lg text-xs md:text-sm transition-all flex items-center gap-1.5 shadow-md`}
        >
          Ir a Corte de Caja <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
