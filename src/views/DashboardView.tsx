import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, Box, Info, ShoppingBag, Receipt, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductModal } from '../components/ProductModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

export function DashboardView({ onViewChange }: DashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month');
  
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    ventasTotales: 0,
    gastosTotales: 0,
    utilidad: 0,
    stockActivo: 0,
    numVentas: 0
  });
  
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    calculateDashboard();
  }, [selectedBranch, dateFilter, customStartDate, customEndDate]);

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
    else if (dateFilter === 'custom') return new Date(customStartDate + 'T00:00:00');
    return startDate;
  }

  function getEndDate() {
    if (dateFilter === 'custom') return new Date(customEndDate + 'T23:59:59.999');
    return new Date();
  }

  async function calculateDashboard() {
    setLoading(true);
    const startObj = getStartDate();
    const endObj = getEndDate();
    const startDate = startObj.toISOString();
    const endDate = endObj.toISOString();

    let salesQuery = supabase.from('sales').select('id, total, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (selectedBranch !== 'all') salesQuery = salesQuery.eq('branch_id', selectedBranch);
    const { data: sales } = await salesQuery;

    let expensesQuery = supabase.from('expenses').select('amount, date')
      .gte('date', startDate)
      .lte('date', endDate);
    if (selectedBranch !== 'all') expensesQuery = expensesQuery.eq('branch_id', selectedBranch);
    const { data: expenses } = await expensesQuery;

    const saleIds = sales?.map(s => s.id) || [];
    const ventasTotales = sales?.reduce((acc, s) => acc + s.total, 0) || 0;
    const numVentas = sales?.length || 0;
    const gastosTotales = expenses?.reduce((acc, e) => acc + e.amount, 0) || 0;

    let cogs = 0;
    if (saleIds.length > 0) {
      const { data: items } = await supabase.from('sale_items').select(`quantity, products(cost)`).in('sale_id', saleIds);
      items?.forEach(item => {
        const cost = (item.products as any)?.cost || 0;
        cogs += cost * item.quantity;
      });
    }

    let stockQuery = supabase.from('products').select('id, name, sku, stock').eq('active', true);
    if (selectedBranch !== 'all') stockQuery = stockQuery.eq('branch_id', selectedBranch);
    const { data: products } = await stockQuery;
    const stockActivo = products?.reduce((acc, p) => acc + p.stock, 0) || 0;
    
    // Low stock products (Alerts)
    const lowStock = products?.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock).slice(0, 5) || [];
    setLowStockProducts(lowStock);

    const utilidad = ventasTotales - cogs - gastosTotales;
    setKpis({ ventasTotales, gastosTotales, utilidad, stockActivo, numVentas });

    // Generate Chart Data
    const days = dateFilter === 'today' ? 1 : dateFilter === 'week' ? 7 : dateFilter === 'month' ? 30 : 90; 
    // Simplify chart to just group by Day or Month depending on filter. For now, daily if <= 30, monthly if > 30.
    
    const dataMap: Record<string, { name: string, Ventas: number, Gastos: number }> = {};
    
    sales?.forEach(s => {
      const d = new Date(s.created_at);
      const key = days <= 30 ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getMonth()+1}/${d.getFullYear()}`;
      if (!dataMap[key]) dataMap[key] = { name: key, Ventas: 0, Gastos: 0 };
      dataMap[key].Ventas += s.total;
    });

    expenses?.forEach(e => {
      const d = new Date(e.date);
      const key = days <= 30 ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getMonth()+1}/${d.getFullYear()}`;
      if (!dataMap[key]) dataMap[key] = { name: key, Ventas: 0, Gastos: 0 };
      dataMap[key].Gastos += e.amount;
    });

    const finalChart = Object.values(dataMap);
    // Sort logic depends on key format, simplifying for demo:
    setChartData(finalChart);
    
    setLoading(false);
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6 relative">
      {/* Premium background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white/40 p-6 rounded-2xl backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <h2 className="text-display-lg text-on-surface font-black tracking-tight">Dashboard de Operaciones</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Métricas y KPIs en tiempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Sucursal</span>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-white border border-outline-variant/30 rounded-lg h-10 px-3 text-title-md font-bold text-primary shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="all">Todas las Sucursales</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Periodo</span>
              <div className="flex items-center gap-2">
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white border border-outline-variant/30 rounded-lg h-10 px-3 text-title-md font-bold text-on-surface shadow-sm outline-none focus:border-primary transition-colors cursor-pointer w-40">
                  <option value="today">Hoy</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Este Mes</option>
                  <option value="quarter">Este Trimestre</option>
                  <option value="semester">Este Semestre</option>
                  <option value="year">Este Año</option>
                  <option value="custom">Personalizado</option>
                </select>
                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="h-10 px-3 bg-white border border-outline-variant/30 rounded-lg text-body-sm outline-none focus:border-primary shadow-sm"
                    />
                    <span className="text-on-surface-variant">a</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="h-10 px-3 bg-white border border-outline-variant/30 rounded-lg text-body-sm outline-none focus:border-primary shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-pulse text-on-surface-variant font-bold flex items-center gap-3"><TrendingUp className="animate-bounce"/> Calculando métricas...</div></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Ingresos Brutos', value: `$${kpis.ventasTotales.toFixed(2)}`, sub: `${kpis.numVentas} tickets emitidos`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Utilidad Neta', value: `$${kpis.utilidad.toFixed(2)}`, sub: 'Ventas - Costos - Gastos', icon: TrendingUp, color: kpis.utilidad >= 0 ? 'text-secondary' : 'text-error', bg: kpis.utilidad >= 0 ? 'bg-secondary/10' : 'bg-error/10' },
                { label: 'Gastos Operativos', value: `-$${kpis.gastosTotales.toFixed(2)}`, sub: 'Salidas de efectivo', icon: TrendingDown, color: 'text-error', bg: 'bg-error/10' },
                { label: 'Stock Activo', value: kpis.stockActivo.toString(), sub: 'Unidades valorizadas', icon: Box, color: 'text-tertiary', bg: 'bg-tertiary/10' },
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                  <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-label-caps text-on-surface-variant z-10">{card.label}</p>
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center z-10`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                  <div className="z-10">
                    <h3 className={`text-display-lg mb-1 text-data-mono font-black ${card.color}`}>
                      {card.value}
                    </h3>
                    <div className="text-body-sm text-on-surface-variant font-medium">{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-title-lg font-bold text-on-surface">Rendimiento Histórico Financiero</h3>
                    <p className="text-body-sm text-on-surface-variant">Comparativa de ingresos vs gastos en el periodo actual.</p>
                  </div>
                </div>
                <div className="w-full h-[320px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                        />
                        <Area type="monotone" dataKey="Ventas" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                        <Area type="monotone" dataKey="Gastos" stroke="#ba1a1a" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-body-md bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
                      No hay datos suficientes para graficar.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-tertiary" size={24} />
                    <h3 className="text-title-lg font-bold text-on-surface">Alertas de Inventario</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl border border-tertiary/20 bg-tertiary/5 flex justify-between items-center hover:bg-tertiary/10 transition-colors">
                        <div>
                          <h4 className="font-bold text-on-surface text-body-md">{item.name}</h4>
                          <p className="text-label-caps text-on-surface-variant">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-label-caps font-bold ${item.stock === 0 ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
                            Stock: {item.stock}
                          </span>
                          <p className="text-label-caps text-on-surface-variant mt-1">Sugerido min: 5</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant text-center p-4">
                      <Box className="opacity-20 mb-2" size={32} />
                      <p className="text-body-sm font-semibold">¡Todo en orden!</p>
                      <p className="text-label-caps mt-1">No hay productos con stock bajo (≤ 5).</p>
                    </div>
                  )}
                </div>
                <button onClick={() => onViewChange && onViewChange('inventory')} className="mt-4 w-full h-10 bg-surface-container-high rounded-lg text-title-md font-bold text-on-surface hover:bg-surface-container-highest transition-colors">
                  Ir al Inventario
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
