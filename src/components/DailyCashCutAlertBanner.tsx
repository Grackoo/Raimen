import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailyCashCutAlertBannerProps {
  onGoToCashRegister: () => void;
}

export function DailyCashCutAlertBanner({ onGoToCashRegister }: DailyCashCutAlertBannerProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkCashCutNeeded = async () => {
    const now = new Date();
    const currentHour = now.getHours();

    // Only alert if time is >= 19 (7:00 PM)
    if (currentHour < 19) {
      setShowAlert(false);
      return;
    }

    try {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      
      // Check if a closed cash register exists for today
      const { data: closedRegisters } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'closed')
        .gte('closed_at', todayStart)
        .limit(1);

      if (closedRegisters && closedRegisters.length > 0) {
        // Today's cash cut is already completed
        setShowAlert(false);
      } else {
        // No closed cut for today and it's 7:00 PM or later
        setShowAlert(true);
      }
    } catch (err) {
      console.error('Error checking cash cut alert:', err);
    }
  };

  useEffect(() => {
    checkCashCutNeeded();
    const interval = setInterval(checkCashCutNeeded, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  if (!showAlert || dismissed) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-3 border-b border-amber-600 shadow-md flex flex-wrap items-center justify-between gap-3 animate-pulse z-40 shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-600/30 rounded-full shrink-0">
          <AlertTriangle size={20} className="text-slate-950" />
        </div>
        <div>
          <p className="font-extrabold text-sm md:text-base leading-tight flex items-center gap-1.5">
            <Clock size={16} /> ⚠️ ALERTA DE CORTE DE CAJA (Pasadas las 7:00 PM)
          </p>
          <p className="text-xs md:text-sm font-semibold opacity-90">
            Aún no se ha realizado el corte de caja del día. Recuerda al cajero efectuar el corte antes de cerrar la jornada.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={onGoToCashRegister}
          className="bg-slate-950 text-white font-bold px-4 py-1.5 rounded-lg text-xs md:text-sm hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow"
        >
          Ir a Corte de Caja <ArrowRight size={14} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 hover:bg-amber-600/20 rounded-full transition-colors text-slate-950"
          title="Descartar por ahora"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
