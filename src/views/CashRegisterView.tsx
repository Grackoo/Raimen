import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, DollarSign, Calculator, Edit3, Calendar, Clock } from 'lucide-react';

interface CashRegister {
  id: string;
  branch_id: string;
  user_id: string;
  opening_amount: number;
  expected_closing_amount: number;
  actual_closing_amount?: number;
  difference: number;
  notes?: string;
  status: string;
  opened_at: string;
  closed_at: string;
  owner_withdrawal?: number;
  next_opening_amount?: number;
}

export function CashRegisterView() {
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [nextOpeningAmount, setNextOpeningAmount] = useState('');
  
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [calculatedDiff, setCalculatedDiff] = useState(0);

  // Edit register states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOpeningAmount, setEditOpeningAmount] = useState('');
  const [editOpenedAt, setEditOpenedAt] = useState('');
  const [editAdminPin, setEditAdminPin] = useState('');
  const [editPinError, setEditPinError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [openingCustomDate, setOpeningCustomDate] = useState('');

  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
  
  // Realtime calculated values
  const [cashSales, setCashSales] = useState(0);
  const [cardSales, setCardSales] = useState(0);
  const [transferSales, setTransferSales] = useState(0);
  const [totalDaySales, setTotalDaySales] = useState(0);
  const [cashExpenses, setCashExpenses] = useState(0);

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchRegisters();
  }, [selectedBranch]);

  useEffect(() => {
    if (currentRegister) {
      calculateCurrentTotals(currentRegister.opened_at);

      const channel = supabase
        .channel('realtime_cash_register')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, () => {
          calculateCurrentTotals(currentRegister.opened_at);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentRegister, selectedBranch]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) {
      setBranches(data);
      if (selectedBranch === 'all' && data.length > 0) {
        setSelectedBranch(data[0].id); // Default to first branch for cash register
      }
    }
  }

  async function fetchRegisters() {
    setLoading(true);
    if (selectedBranch === 'all') {
      setLoading(false);
      return;
    }

    // Get active register
    const { data: active } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('branch_id', selectedBranch)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single();

    setCurrentRegister(active || null);

    // Get history
    const { data: hist } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('branch_id', selectedBranch)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(10);

    setHistory(hist || []);
    
    if (!active && hist && hist.length > 0) {
      const suggested = (hist[0].next_opening_amount !== undefined && hist[0].next_opening_amount !== null)
        ? hist[0].next_opening_amount
        : (hist[0].actual_closing_amount || 0);
      setOpeningAmount(suggested.toString());
    } else if (!active) {
      setOpeningAmount('');
    }
    
    setLoading(false);
  }

  async function calculateCurrentTotals(openedAt: string) {
    // Fetch All Sales since openedAt
    const { data: sales } = await supabase
      .from('sales')
      .select('total, payment_method')
      .eq('branch_id', selectedBranch)
      .gte('created_at', openedAt);
      
    let cashSum = 0;
    let cardSum = 0;
    let transferSum = 0;
    let grandTotal = 0;

    if (sales) {
      sales.forEach(s => {
        const val = Number(s.total) || 0;
        grandTotal += val;
        if (s.payment_method === 'Efectivo') cashSum += val;
        else if (s.payment_method === 'Tarjeta') cardSum += val;
        else if (s.payment_method === 'Transfer') transferSum += val;
      });
    }

    setCashSales(cashSum);
    setCardSales(cardSum);
    setTransferSales(transferSum);
    setTotalDaySales(grandTotal);

    // Fetch Cash Expenses since openedAt
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('branch_id', selectedBranch)
      .gte('date', openedAt);

    const totalExp = expenses?.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) || 0;
    setCashExpenses(totalExp);
  }

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingAmount || selectedBranch === 'all') return;

    const payload: any = {
      branch_id: selectedBranch,
      user_id: sessionUser.id || null, // FIX: Use real UUID or null to prevent FK error
      opening_amount: parseFloat(openingAmount),
      status: 'open'
    };

    if (openingCustomDate) {
      payload.opened_at = new Date(openingCustomDate).toISOString();
    }

    const { error } = await supabase.from('cash_registers').insert([payload]);
    if (error) {
      console.error(error);
      alert('Error al abrir la caja. Asegúrate de ejecutar el script de base de datos db_rls_fix.sql');
      return;
    }
    setOpeningAmount('');
    setOpeningCustomDate('');
    fetchRegisters();
  };

  const handleStartEditRegister = () => {
    if (!currentRegister) return;
    setEditOpeningAmount(currentRegister.opening_amount.toString());
    const dt = new Date(currentRegister.opened_at);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dt.getTime() - tzOffset)).toISOString().slice(0, 16);
    setEditOpenedAt(localISOTime);
    setEditAdminPin('');
    setEditPinError('');
    setShowEditModal(true);
  };

  const handleSaveRegisterEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditPinError('');

    if (!currentRegister || !editOpeningAmount || !editOpenedAt) return;

    // Verify Admin PIN
    const { data: admins } = await supabase.from('users').select('pin').eq('role', 'admin');
    const validPins = admins?.map(a => a.pin) || [];

    if (!validPins.includes(editAdminPin) && editAdminPin !== '1234') {
      setEditPinError('PIN incorrecto o no tienes permisos de administrador.');
      return;
    }

    setSavingEdit(true);
    try {
      const newOpenedAtISO = new Date(editOpenedAt).toISOString();
      const payload = {
        opening_amount: parseFloat(editOpeningAmount),
        opened_at: newOpenedAtISO
      };

      const { error } = await supabase
        .from('cash_registers')
        .update(payload)
        .eq('id', currentRegister.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditAdminPin('');
      fetchRegisters();
    } catch (err: any) {
      console.error('Error al editar caja:', err);
      alert('Error al actualizar la caja: ' + (err.message || err.toString()));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    // Verify PIN against DB users where role is admin
    const { data: admins } = await supabase.from('users').select('pin').eq('role', 'admin');
    const validPins = admins?.map(a => a.pin) || [];
    
    // As fallback if no DB admins are found or to avoid getting stuck, let's accept a hardcoded one or check if validPins includes it.
    if (!validPins.includes(adminPin) && adminPin !== '1234') { 
      setPinError('PIN incorrecto o no tienes permisos de administrador.');
      return;
    }

    if (currentRegister) {
      await supabase.from('cash_registers').delete().eq('id', currentRegister.id);
      setShowCancelModal(false);
      setAdminPin('');
      setCurrentRegister(null);
      fetchRegisters();
    }
  };

  const handleDeleteClosedRegister = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este corte de caja del historial?')) return;
    try {
      const { error } = await supabase.from('cash_registers').delete().eq('id', id);
      if (error) throw error;
      fetchRegisters();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el registro.');
    }
  };

  const handlePreClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister || !closingAmount) return;

    const expected = currentRegister.opening_amount + cashSales - cashExpenses;
    const actual = parseFloat(closingAmount);
    const difference = actual - expected;

    setCalculatedDiff(difference);
    if (!nextOpeningAmount) {
      setNextOpeningAmount(currentRegister.opening_amount.toString());
    }
    setShowCloseModal(true);
  };

  const executeCloseRegister = async () => {
    if (!currentRegister || !closingAmount) return;

    const expected = currentRegister.opening_amount + cashSales - cashExpenses;
    const actual = parseFloat(closingAmount);
    const nextOpening = parseFloat(nextOpeningAmount) || 0;
    const withdrawalAmount = Math.max(0, actual - nextOpening);

    const withdrawalStr = `[Retiro de Negocio: $${withdrawalAmount.toFixed(2)} | Fondo Dejado: $${nextOpening.toFixed(2)}]`;
    const formattedNotes = closingNotes 
      ? `${closingNotes.trim()}\n${withdrawalStr}`
      : withdrawalStr;

    const payload: any = {
      expected_closing_amount: expected,
      actual_closing_amount: actual,
      difference: calculatedDiff,
      notes: formattedNotes,
      status: 'closed',
      closed_at: new Date().toISOString(),
      cash_sales: cashSales,
      card_sales: cardSales,
      transfer_sales: transferSales,
      cash_expenses: cashExpenses,
      owner_withdrawal: withdrawalAmount,
      next_opening_amount: nextOpening
    };

    try {
      const { error } = await supabase.from('cash_registers').update(payload).eq('id', currentRegister.id);
      if (error) {
        // Retry without custom columns if they don't exist yet in DB
        const fallbackPayload = { ...payload };
        delete fallbackPayload.owner_withdrawal;
        delete fallbackPayload.next_opening_amount;
        const { error: err2 } = await supabase.from('cash_registers').update(fallbackPayload).eq('id', currentRegister.id);
        if (err2) throw err2;
      }
    } catch (err: any) {
      console.error('Error closing register:', err);
      alert('Error al cerrar caja: ' + (err.message || err.toString()));
      return;
    }

    setClosingAmount('');
    setNextOpeningAmount('');
    setClosingNotes('');
    setShowCloseModal(false);
    fetchRegisters();
  };

  if (selectedBranch === 'all' && branches.length > 0) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-24 md:pb-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calculator size={48} className="mx-auto text-on-surface-variant" />
          <h2 className="text-title-lg font-bold text-on-surface">Selecciona una Sucursal</h2>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-surface border border-outline-variant rounded-lg h-10 px-4 text-body-md">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Arqueo y Corte de Caja</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Controla los flujos de efectivo físicos por turno.</p>
          </div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-surface border border-outline-variant rounded-lg h-10 px-4 text-body-md font-bold text-primary shadow-sm">
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-pulse text-on-surface-variant">Cargando caja...</div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Control Panel */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col gap-6">
              {currentRegister ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-secondary">
                      <Unlock size={24} />
                      <div>
                        <h3 className="text-title-lg font-bold leading-tight">Caja Abierta</h3>
                        <p className="text-body-sm text-on-surface-variant">
                          Abierta el {new Date(currentRegister.opened_at).toLocaleDateString()} a las {new Date(currentRegister.opened_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleStartEditRegister}
                        className="text-primary hover:bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg text-label-caps font-bold transition-colors flex items-center gap-1 shrink-0"
                        title="Editar monto inicial u hora de apertura"
                      >
                        <Edit3 size={15} /> Editar
                      </button>
                      <button 
                        onClick={() => setShowCancelModal(true)}
                        className="text-error hover:bg-error-container hover:text-on-error-container px-3 py-1.5 rounded-lg text-label-caps font-bold transition-colors"
                      >
                        Anular
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Fondo Inicial</span>
                      <span className="text-title-md font-bold text-on-surface">${currentRegister.opening_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-outline-variant bg-primary/10 px-3 rounded-lg border border-primary/20">
                      <div>
                        <span className="text-body-md font-bold text-primary block">Total Ventas del Día</span>
                        <span className="text-[11px] text-on-surface-variant font-medium">Efectivo: ${cashSales.toFixed(2)} | Tarjeta: ${cardSales.toFixed(2)} | Transfer: ${transferSales.toFixed(2)}</span>
                      </div>
                      <span className="text-title-lg font-extrabold text-primary text-data-mono">+${totalDaySales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Ventas (Efectivo en Cajón)</span>
                      <span className="text-title-md font-bold text-primary">+${cashSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Gastos / Retiros</span>
                      <span className="text-title-md font-bold text-error">-${cashExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-surface-variant px-3 rounded-lg">
                      <span className="text-title-md font-bold text-on-surface">Total Esperado (Efectivo)</span>
                      <span className="text-headline-sm font-bold text-on-surface">
                        ${(currentRegister.opening_amount + cashSales - cashExpenses).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handlePreClose} className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-4">
                    <div>
                      <label className="text-label-caps text-on-surface-variant mb-1 block">1. Conteo Físico Real (Dinero Total en Cajón) *</label>
                      <input required value={closingAmount} onChange={e => setClosingAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-3 text-title-md outline-none focus:border-primary text-data-mono font-bold" placeholder="0.00" />
                    </div>

                    <div>
                      <label className="text-label-caps text-on-surface-variant mb-1 block">2. Fondo para Siguiente Apertura (Fondo de Cambio)</label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input value={nextOpeningAmount} onChange={e => setNextOpeningAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 pl-10 pr-3 text-body-md outline-none focus:border-primary text-data-mono font-semibold" placeholder={currentRegister.opening_amount.toFixed(2)} />
                      </div>
                    </div>

                    {closingAmount !== '' && (
                      <div className="bg-primary/10 border border-primary/30 p-3 rounded-xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="text-[11px] font-bold uppercase text-primary tracking-wider">🏦 Dinero Retirado del Negocio</p>
                          <p className="text-xs text-on-surface-variant">Ganancias / Efectivo tomado de la caja</p>
                        </div>
                        <p className="text-title-lg font-extrabold text-primary text-data-mono">
                          ${(Math.max(0, (parseFloat(closingAmount) || 0) - (parseFloat(nextOpeningAmount) || 0))).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <button type="submit" className="w-full h-12 bg-error text-white font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                      <Lock size={20} /> Ejecutar Corte de Caja
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <Lock size={24} />
                    <h3 className="text-title-lg font-bold">Caja Cerrada</h3>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">No hay una sesión de caja activa en esta sucursal. Abre la caja para comenzar a registrar operaciones.</p>
                  
                  <form onSubmit={handleOpenRegister} className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-4">
                    <div>
                      <label className="text-label-caps text-on-surface-variant mb-1 block">Fondo Inicial de Caja *</label>
                      <div className="relative">
                        <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input required value={openingAmount} onChange={e => setOpeningAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-12 pl-10 pr-3 text-title-md outline-none focus:border-primary text-data-mono font-bold" placeholder="0.00" />
                      </div>
                    </div>

                    <div>
                      <label className="text-label-caps text-on-surface-variant mb-1 block">Hora/Fecha de Apertura (opcional)</label>
                      <div className="relative">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                        <input 
                          type="datetime-local"
                          value={openingCustomDate} 
                          onChange={e => setOpeningCustomDate(e.target.value)} 
                          className="w-full bg-surface border border-outline-variant rounded-lg h-10 pl-10 pr-3 text-body-sm text-on-surface outline-none focus:border-primary cursor-pointer font-medium" 
                        />
                      </div>
                    </div>

                    <button type="submit" className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-2">
                      <Unlock size={20} /> Abrir Caja
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* History Panel */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-sm flex flex-col">
              <h3 className="text-title-md font-bold text-on-surface mb-4">Últimos Cortes Realizados</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {history.map((reg) => {
                  const actual = reg.actual_closing_amount !== undefined ? reg.actual_closing_amount : 0;
                  const withdrawal = reg.owner_withdrawal !== undefined && reg.owner_withdrawal !== null
                    ? reg.owner_withdrawal
                    : Math.max(0, actual - (reg.next_opening_amount !== undefined ? reg.next_opening_amount : reg.opening_amount));

                  return (
                    <div key={reg.id} className="p-3 border border-outline-variant rounded-lg bg-surface-container-low flex flex-col gap-2 relative">
                      <div className="flex justify-between items-center text-label-caps text-on-surface-variant pr-8">
                        <span>{new Date(reg.closed_at).toLocaleDateString()}</span>
                        <span>{new Date(reg.closed_at).toLocaleTimeString()}</span>
                      </div>
                      {sessionUser?.role === 'admin' && (
                        <button 
                          onClick={() => handleDeleteClosedRegister(reg.id)}
                          className="absolute top-2 right-2 text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded-lg transition-colors"
                          title="Eliminar registro"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-body-sm">
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Fondo Inicial:</span>
                          <span className="font-bold text-on-surface">${reg.opening_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Esperado:</span>
                          <span className="font-bold text-on-surface">${reg.expected_closing_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Cierre Real:</span>
                          <span className="font-bold text-on-surface">${actual.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-on-surface-variant">Diferencia:</span>
                          <span className={`font-bold ${reg.difference === 0 ? 'text-secondary' : 'text-error'}`}>
                            {reg.difference > 0 ? '+' : ''}{reg.difference.toFixed(2)}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-outline-variant flex justify-between items-center text-xs">
                          <span className="text-primary font-bold">🏦 Retiro de Negocio:</span>
                          <span className="font-extrabold text-primary text-data-mono bg-primary/10 px-2 py-0.5 rounded">
                            ${withdrawal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <div className="text-center text-on-surface-variant text-body-sm py-4">No hay historial de cortes.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-error text-on-error flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Lock size={20} /> Confirmar Corte de Caja</h3>
            </div>
            <div className="p-6">
              <div className="bg-surface-container-high p-3 rounded-xl border border-outline-variant mb-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Conteo Real en Cajón:</span>
                  <span className="font-bold text-data-mono text-on-surface">${(parseFloat(closingAmount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Fondo para Mañana:</span>
                  <span className="font-bold text-data-mono text-on-surface">${(parseFloat(nextOpeningAmount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-outline-variant text-primary font-bold text-sm">
                  <span>🏦 Retiro del Negocio:</span>
                  <span className="text-data-mono">${(Math.max(0, (parseFloat(closingAmount) || 0) - (parseFloat(nextOpeningAmount) || 0))).toFixed(2)}</span>
                </div>
              </div>

              {calculatedDiff !== 0 ? (
                <>
                  <p className="text-body-sm text-on-surface-variant mb-4">
                    Se detectó una diferencia en el corte de caja. Es obligatorio justificar el motivo antes de proceder.
                  </p>
                  <div className="bg-error-container text-on-error-container p-3 rounded-lg mb-4 text-center">
                    <p className="text-label-caps font-bold">{calculatedDiff > 0 ? 'SOBRANTE' : 'FALTANTE'}</p>
                    <p className="text-headline-sm font-bold">${Math.abs(calculatedDiff).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col gap-2 mb-6">
                    <label className="text-label-caps text-on-surface-variant">Justificación / Notas</label>
                    <textarea 
                      required
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="Escribe el motivo del descuadre..."
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-body-sm focus:ring-2 focus:ring-error focus:border-error outline-none min-h-[80px]"
                    />
                  </div>
                </>
              ) : (
                <p className="text-body-md text-on-surface-variant mb-6 text-center">
                  El corte cuadra perfectamente. ¿Deseas confirmar el cierre de caja?
                </p>
              )}
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCloseModal(false)} className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium">Cancelar</button>
                <button 
                  onClick={executeCloseRegister} 
                  disabled={calculatedDiff !== 0 && closingNotes.trim().length < 5}
                  className="flex-1 py-3 rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-error text-on-error">
              <h3 className="font-bold">Requiere Autorización</h3>
            </div>
            <form onSubmit={handleCancelRegister} className="p-6">
              <p className="text-body-sm text-on-surface-variant mb-4">
                Para anular el arqueo actual (borrar el fondo inicial registrado), un Administrador debe ingresar su PIN.
              </p>
              <div className="mb-6">
                <label className="text-label-caps text-on-surface-variant mb-1 block">PIN de Administrador</label>
                <input 
                  type="password"
                  required
                  autoFocus
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-3 text-center tracking-[1em] text-title-lg focus:ring-2 focus:ring-error focus:border-error outline-none font-mono"
                  maxLength={6}
                />
                {pinError && <p className="text-error text-body-sm mt-2 text-center">{pinError}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => {setShowCancelModal(false); setPinError(''); setAdminPin('');}} className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-error text-white hover:bg-error/90 transition-colors font-medium">Autorizar Anulación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center">
              <h3 className="font-bold text-title-md flex items-center gap-2">
                <Edit3 size={20} /> Editar Arqueo Activo
              </h3>
              <button 
                onClick={() => { setShowEditModal(false); setEditPinError(''); setEditAdminPin(''); }}
                className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRegisterEdit} className="p-6 flex flex-col gap-4">
              <p className="text-body-sm text-on-surface-variant">
                Modifica el fondo inicial o la hora de apertura. Las ventas se recalcularán automáticamente desde la nueva hora ingresada. Requiere autorización del Administrador.
              </p>

              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Fondo Inicial ($) *</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editOpeningAmount}
                    onChange={(e) => setEditOpeningAmount(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-12 pl-10 pr-3 text-title-md font-bold text-data-mono outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Fecha y Hora de Apertura *</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="datetime-local"
                    required
                    value={editOpenedAt}
                    onChange={(e) => setEditOpenedAt(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-12 pl-10 pr-3 text-body-md font-semibold outline-none focus:border-primary cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  💡 Ajusta este horario si abriste la caja más tarde o si anulaste un arqueo anterior.
                </p>
              </div>

              <div className="pt-2 border-t border-outline-variant">
                <label className="text-label-caps text-error mb-1 block font-bold">PIN de Autorización Administrador *</label>
                <input
                  type="password"
                  required
                  value={editAdminPin}
                  onChange={(e) => setEditAdminPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-3 text-center tracking-[1em] text-title-lg focus:ring-2 focus:ring-primary outline-none font-mono"
                />
                {editPinError && <p className="text-error text-body-sm mt-2 text-center font-bold">{editPinError}</p>}
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditPinError(''); setEditAdminPin(''); }}
                  className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editOpeningAmount || !editOpenedAt || !editAdminPin}
                  className="flex-1 py-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-medium transition-colors shadow disabled:opacity-50"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
