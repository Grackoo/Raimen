import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, DollarSign, Calculator } from 'lucide-react';

interface CashRegister {
  id: string;
  branch_id: string;
  user_id: string;
  opening_amount: number;
  expected_closing_amount: number;
  difference: number;
  notes?: string;
  status: string;
  opened_at: string;
  closed_at: string;
}

export function CashRegisterView() {
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingNotes, setClosingNotes] = useState('');
  const [calculatedDiff, setCalculatedDiff] = useState(0);
  
  // Realtime calculated values
  const [cashSales, setCashSales] = useState(0);
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
    }
  }, [currentRegister]);

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
    setLoading(false);
  }

  async function calculateCurrentTotals(openedAt: string) {
    // Fetch Cash Sales since openedAt
    const { data: sales } = await supabase
      .from('sales')
      .select('total')
      .eq('branch_id', selectedBranch)
      .eq('payment_method', 'Efectivo')
      .gte('created_at', openedAt);
      
    const totalSales = sales?.reduce((acc, s) => acc + s.total, 0) || 0;
    setCashSales(totalSales);

    // Fetch Cash Expenses since openedAt
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('branch_id', selectedBranch)
      .gte('date', openedAt);

    const totalExp = expenses?.reduce((acc, e) => acc + e.amount, 0) || 0;
    setCashExpenses(totalExp);
  }

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingAmount || selectedBranch === 'all') return;

    const payload = {
      branch_id: selectedBranch,
      user_id: 'default-user',
      opening_amount: parseFloat(openingAmount),
      status: 'open'
    };

    await supabase.from('cash_registers').insert([payload]);
    setOpeningAmount('');
    fetchRegisters();
  };

  const handlePreClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRegister || !closingAmount) return;

    const expected = currentRegister.opening_amount + cashSales - cashExpenses;
    const actual = parseFloat(closingAmount);
    const difference = actual - expected;

    setCalculatedDiff(difference);
    setShowCloseModal(true);
  };

  const executeCloseRegister = async () => {
    if (!currentRegister || !closingAmount) return;

    const expected = currentRegister.opening_amount + cashSales - cashExpenses;
    const actual = parseFloat(closingAmount);

    const payload = {
      expected_closing_amount: expected,
      actual_closing_amount: actual,
      difference: calculatedDiff,
      notes: closingNotes,
      status: 'closed',
      closed_at: new Date().toISOString()
    };

    await supabase.from('cash_registers').update(payload).eq('id', currentRegister.id);
    setClosingAmount('');
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
                  <div className="flex items-center gap-3 text-secondary">
                    <Unlock size={24} />
                    <h3 className="text-title-lg font-bold">Caja Abierta</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Fondo Inicial</span>
                      <span className="text-title-md font-bold text-on-surface">${currentRegister.opening_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Ventas (Efectivo)</span>
                      <span className="text-title-md font-bold text-primary">+${cashSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant">
                      <span className="text-body-md text-on-surface-variant">Gastos / Retiros</span>
                      <span className="text-title-md font-bold text-error">-${cashExpenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-surface-variant px-3 rounded-lg">
                      <span className="text-title-md font-bold text-on-surface">Total Esperado</span>
                      <span className="text-headline-sm font-bold text-on-surface">
                        ${(currentRegister.opening_amount + cashSales - cashExpenses).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handlePreClose} className="mt-4 pt-4 border-t border-outline-variant flex flex-col gap-4">
                    <div>
                      <label className="text-label-caps text-on-surface-variant mb-1 block">Conteo Físico Real (Dinero en Cajón) *</label>
                      <input required value={closingAmount} onChange={e => setClosingAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-3 text-title-md outline-none focus:border-primary text-data-mono font-bold" placeholder="0.00" />
                    </div>
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
                {history.map((reg) => (
                  <div key={reg.id} className="p-3 border border-outline-variant rounded-lg bg-surface-container-low flex flex-col gap-2">
                    <div className="flex justify-between items-center text-label-caps text-on-surface-variant">
                      <span>{new Date(reg.closed_at).toLocaleDateString()}</span>
                      <span>{new Date(reg.closed_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-body-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Fondo:</span>
                        <span className="font-bold text-on-surface">${reg.opening_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Esperado:</span>
                        <span className="font-bold text-on-surface">${reg.expected_closing_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Real:</span>
                        <span className="font-bold text-primary">${reg.actual_closing_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Diferencia:</span>
                        <span className={`font-bold ${reg.difference === 0 ? 'text-secondary' : 'text-error'}`}>
                          {reg.difference > 0 ? '+' : ''}{reg.difference.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
    </main>
  );
}
