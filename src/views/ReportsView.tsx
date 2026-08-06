import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month');

  // Estado de Resultados Data
  const [income, setIncome] = useState(0);
  const [cogs, setCogs] = useState(0);
  const [expenses, setExpenses] = useState(0);

  // Balance General Data
  const [cash, setCash] = useState(0); // From cash registers
  const [inventoryValue, setInventoryValue] = useState(0);
  const [accountsPayable, setAccountsPayable] = useState(0);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [selectedBranch, dateFilter]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  }

  function getStartDate() {
    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'today') startDate.setHours(0,0,0,0);
    else if (dateFilter === 'week') startDate.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (dateFilter === 'semester') startDate.setMonth(now.getMonth() - 6);
    else if (dateFilter === 'year') startDate.setFullYear(now.getFullYear() - 1);
    return startDate.toISOString();
  }

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();

      // 1. Ingresos por Ventas
      let salesQ = supabase.from('sales').select('id, total').gte('created_at', startDate);
      if (selectedBranch !== 'all') salesQ = salesQ.eq('branch_id', selectedBranch);
      const { data: salesData } = await salesQ;
      const totalSales = salesData?.reduce((acc, s) => acc + s.total, 0) || 0;
      setIncome(totalSales);

      // 2. Costo de Ventas (COGS)
      const saleIds = salesData?.map(s => s.id) || [];
      let totalCogs = 0;
      if (saleIds.length > 0) {
        const { data: saleItems } = await supabase.from('sale_items').select('quantity, products(cost)').in('sale_id', saleIds);
        saleItems?.forEach(item => {
          totalCogs += ((item.products as any)?.cost || 0) * item.quantity;
        });
      }
      setCogs(totalCogs);

      // 3. Gastos Operativos
      let expQ = supabase.from('expenses').select('amount').gte('date', startDate);
      if (selectedBranch !== 'all') expQ = expQ.eq('branch_id', selectedBranch);
      const { data: expData } = await expQ;
      const totalExp = expData?.reduce((acc, e) => acc + e.amount, 0) || 0;
      setExpenses(totalExp);

      // 4. Efectivo en Caja (Último corte de caja de la sucursal seleccionada)
      let cashQ = supabase.from('cash_registers').select('actual_closing_amount').eq('status', 'closed').order('closed_at', { ascending: false }).limit(1);
      if (selectedBranch !== 'all') cashQ = cashQ.eq('branch_id', selectedBranch);
      const { data: cashData } = await cashQ;
      setCash(cashData?.[0]?.actual_closing_amount || 0);

      // 5. Valor del Inventario
      let invQ = supabase.from('products').select('stock, cost').eq('active', true);
      const { data: invData } = await invQ;
      const totalInvValue = invData?.reduce((acc, p) => acc + (p.stock * p.cost), 0) || 0;
      setInventoryValue(totalInvValue);

      // 6. Cuentas por Pagar (Solo pendientes/parciales)
      let apQ = supabase.from('accounts_payable').select('amount, paid_amount').neq('status', 'paid');
      if (selectedBranch !== 'all') apQ = apQ.eq('branch_id', selectedBranch);
      const { data: apData } = await apQ;
      const totalAp = apData?.reduce((acc, ap) => acc + (ap.amount - ap.paid_amount), 0) || 0;
      setAccountsPayable(totalAp);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grossProfit = income - cogs;
  const netProfit = grossProfit - expenses;
  const totalAssets = cash + inventoryValue; // Simplified
  const totalLiabilities = accountsPayable; // Simplified
  const equity = totalAssets - totalLiabilities; 

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-secondary/5 to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-white/40 p-6 rounded-2xl backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-primary" size={32} />
              <h2 className="text-display-lg font-black text-on-surface tracking-tight leading-none">Reportes Financieros</h2>
            </div>
            <p className="text-body-md text-on-surface-variant">Determinación de utilidad y estados financieros formales.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex-1 min-w-[200px]">
              <label className="text-label-caps text-on-surface-variant mb-1 block">Periodo</label>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-lg h-12 px-4 text-title-md font-bold text-on-surface shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="today">Día Actual</option>
                <option value="week">Última Semana</option>
                <option value="month">Mensual (30 días)</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-label-caps text-on-surface-variant mb-1 block">Sucursal</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-lg h-12 px-4 text-title-md font-bold text-primary shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="all">Consolidado (Todas)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button className="h-12 px-6 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 self-end xl:self-auto mt-2 xl:mt-0">
              <Download size={20} /> PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-pulse text-on-surface-variant font-bold flex items-center gap-3"><TrendingUp className="animate-bounce"/> Recopilando datos financieros...</div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Estado de Resultados */}
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center">
                <div>
                  <h3 className="text-title-lg font-bold text-on-surface">Estado de Resultados</h3>
                  <p className="text-body-sm text-on-surface-variant">Periodo seleccionado</p>
                </div>
                <div className="px-3 py-1 bg-surface-container-high rounded-md text-label-caps font-bold text-on-surface-variant">
                  ER
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 text-body-md">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface">Ingresos por Ventas</span>
                    <span className="font-bold text-data-mono">${income.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-error border-b border-outline-variant/20 pb-4">
                    <span>[-] Costo de Ventas (COGS)</span>
                    <span className="font-bold text-data-mono">-${cogs.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-on-surface">(=) Utilidad Bruta</span>
                    <span className="font-bold text-data-mono text-title-md">${grossProfit.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-error border-b border-outline-variant/20 pb-4 pt-2">
                    <span>[-] Gastos de Operación</span>
                    <span className="font-bold text-data-mono">-${expenses.toFixed(2)}</span>
                  </div>

                  <div className={`flex justify-between items-center p-4 rounded-xl mt-4 ${netProfit >= 0 ? 'bg-secondary/10 border border-secondary/20 text-secondary' : 'bg-error/10 border border-error/20 text-error'}`}>
                    <span className="font-black text-title-md">(=) Utilidad Neta del Ejercicio</span>
                    <span className="font-black text-display-lg text-data-mono">${netProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estado de Situación Financiera */}
            <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-outline-variant/20 bg-surface-container-lowest flex justify-between items-center">
                <div>
                  <h3 className="text-title-lg font-bold text-on-surface">Estado de Situación Financiera</h3>
                  <p className="text-body-sm text-on-surface-variant">Balance General</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-md text-label-caps font-bold">
                  <CheckCircle size={14} /> Cuadrado
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col gap-6 text-body-md overflow-y-auto custom-scrollbar">
                
                {/* Activos */}
                <div>
                  <h4 className="text-label-caps text-on-surface-variant mb-3 border-b border-outline-variant/20 pb-1">ACTIVO CIRCULANTE</h4>
                  <div className="space-y-3 pl-2 border-l-2 border-outline-variant/20">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">Efectivo Equivalente (Cajas)</span>
                      <span className="font-bold text-data-mono">${cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">Inventarios (Valuación a Costo)</span>
                      <span className="font-bold text-data-mono">${inventoryValue.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 font-bold text-primary text-title-md pt-2 border-t border-outline-variant/20">
                    <span>Total Activo</span>
                    <span className="text-data-mono">${totalAssets.toFixed(2)}</span>
                  </div>
                </div>

                {/* Pasivos */}
                <div>
                  <h4 className="text-label-caps text-on-surface-variant mb-3 border-b border-outline-variant/20 pb-1">PASIVO</h4>
                  <div className="space-y-3 pl-2 border-l-2 border-outline-variant/20">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">Cuentas por Pagar (Proveedores)</span>
                      <span className="font-bold text-data-mono text-error">${accountsPayable.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 font-bold text-error text-title-md pt-2 border-t border-outline-variant/20">
                    <span>Total Pasivo</span>
                    <span className="text-data-mono">${totalLiabilities.toFixed(2)}</span>
                  </div>
                </div>

                {/* Capital */}
                <div>
                  <h4 className="text-label-caps text-on-surface-variant mb-3 border-b border-outline-variant/20 pb-1">PATRIMONIO / CAPITAL</h4>
                  <div className="space-y-3 pl-2 border-l-2 border-outline-variant/20">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface">Capital Contable</span>
                      <span className="font-bold text-data-mono">${equity.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
