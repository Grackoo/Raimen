import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Receipt, TrendingUp, TrendingDown, Box, Info, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductModal } from '../components/ProductModal';

export function DashboardView() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month'); // today, week, month, quarter, semester, year
  
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    ventasTotales: 0,
    gastosTotales: 0,
    utilidad: 0,
    stockActivo: 0,
    numVentas: 0
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    calculateDashboard();
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

  async function calculateDashboard() {
    setLoading(true);
    const startDate = getStartDate();

    // 1. Fetch Sales
    let salesQuery = supabase.from('sales').select('id, total').gte('created_at', startDate);
    if (selectedBranch !== 'all') {
      salesQuery = salesQuery.eq('branch_id', selectedBranch);
    }
    const { data: sales } = await salesQuery;
    const saleIds = sales?.map(s => s.id) || [];
    const ventasTotales = sales?.reduce((acc, s) => acc + s.total, 0) || 0;
    const numVentas = sales?.length || 0;

    // 2. Fetch Expenses
    let expensesQuery = supabase.from('expenses').select('amount').gte('date', startDate);
    if (selectedBranch !== 'all') {
      expensesQuery = expensesQuery.eq('branch_id', selectedBranch);
    }
    const { data: expenses } = await expensesQuery;
    const gastosTotales = expenses?.reduce((acc, e) => acc + e.amount, 0) || 0;

    // 3. Fetch COGS (Cost of Goods Sold)
    let cogs = 0;
    if (saleIds.length > 0) {
      // Supabase in() has a limit, but for small sets it's fine. 
      // A better approach for huge datasets is doing it in an SQL function.
      const { data: items } = await supabase
        .from('sale_items')
        .select(`quantity, products(cost)`)
        .in('sale_id', saleIds);
        
      items?.forEach(item => {
        const cost = (item.products as any)?.cost || 0;
        cogs += cost * item.quantity;
      });
    }

    // 4. Fetch Stock Activo
    let stockQuery = supabase.from('products').select('stock').eq('active', true);
    if (selectedBranch !== 'all') {
      // If products belong to branches, we would filter here.
      // Assuming global products for now.
    }
    const { data: products } = await stockQuery;
    const stockActivo = products?.reduce((acc, p) => acc + p.stock, 0) || 0;

    const utilidad = ventasTotales - cogs - gastosTotales;

    setKpis({ ventasTotales, gastosTotales, utilidad, stockActivo, numVentas });
    setLoading(false);
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Panel de Control (Dashboard)</h2>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-on-surface-variant font-bold">SUCURSAL:</span>
                <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-surface-container-low border border-outline-variant rounded-md text-body-sm px-2 py-1 outline-none">
                  <option value="all">Todas</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-on-surface-variant font-bold">PERIODO:</span>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-surface-container-low border border-outline-variant rounded-md text-body-sm px-2 py-1 outline-none">
                  <option value="today">Hoy</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Este Mes</option>
                  <option value="quarter">Este Trimestre</option>
                  <option value="semester">Este Semestre</option>
                  <option value="year">Este Año</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-pulse text-on-surface-variant">Calculando finanzas...</div></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <p className="text-label-caps text-on-surface-variant">Ingresos Brutos</p>
                <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                  <DollarSign size={18} className="text-on-secondary-container" />
                </div>
              </div>
              <div>
                <h3 className="text-display-lg text-on-surface mb-1 text-data-mono">${kpis.ventasTotales.toFixed(2)}</h3>
                <div className="text-body-sm text-on-surface-variant">{kpis.numVentas} tickets emitidos</div>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <p className="text-label-caps text-on-surface-variant">Gastos Operativos</p>
                <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
                  <TrendingDown size={18} className="text-on-error-container" />
                </div>
              </div>
              <div>
                <h3 className="text-display-lg text-error mb-1 text-data-mono">-${kpis.gastosTotales.toFixed(2)}</h3>
                <div className="text-body-sm text-on-surface-variant">Salidas de efectivo</div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10"></div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-label-caps text-on-surface-variant">Utilidad Neta</p>
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                  <TrendingUp size={18} className="text-on-primary-container" />
                </div>
              </div>
              <div>
                <h3 className={`text-display-lg mb-1 text-data-mono ${kpis.utilidad >= 0 ? 'text-primary' : 'text-error'}`}>
                  ${kpis.utilidad.toFixed(2)}
                </h3>
                <div className="text-body-sm text-on-surface-variant">Ventas - Costos - Gastos</div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <p className="text-label-caps text-on-surface-variant">Stock Activo (Unidades)</p>
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <Box size={18} className="text-on-surface" />
                </div>
              </div>
              <div>
                <h3 className="text-display-lg text-on-surface mb-1 text-data-mono font-bold">{kpis.stockActivo}</h3>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Info size={16} />
                  <span className="text-body-sm">Unidades valorizadas</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
